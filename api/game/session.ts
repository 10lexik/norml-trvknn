import type { VercelRequest, VercelResponse } from '@vercel/node'
import { atlasClientPromise, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = (req.query.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  if (req.method !== DEFAULTS.METHODS.POST)
    return res.status(405).json({ error: T.method_not_allowed })

  try {
    const {
      sessionId,
      playerId,
      status,
      difficulty,
      lang: sessionLang,
      score,
      totalQuestions,
      timeSpentMs,
      questionDetails,
      lastQuestionIndex,
      completionRate,
      // Client device info
      deviceType,
      screenWidth,
      screenHeight,
      // Marketing
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term
    } = req.body

    // --- Validations minimales ---
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: T.params_missing || 'sessionId invalide' })
    }

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return res.status(400).json({ error: T.params_missing || 'playerId invalide' })
    }

    const validStatuses = ['started', 'completed', 'abandoned']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: T.params_missing || 'status invalide' })
    }

    if (difficulty && !DEFAULTS.ALLOWED_LEVELS.includes(difficulty)) {
      return res.status(400).json({ error: T.params_missing || 'difficulty invalide' })
    }

    // --- Sanitize questionDetails ---
    const safeDetails = Array.isArray(questionDetails)
      ? questionDetails.slice(0, 50).map((q: any) => ({
          questionId: String(q.questionId || '').substring(0, 50),
          category: String(q.category || '').substring(0, 100),
          isCorrect: Boolean(q.isCorrect),
          responseTimeMs: Math.max(0, parseInt(q.responseTimeMs) || 0),
          selectedIndex: parseInt(q.selectedIndex) || 0
        }))
      : []

    // --- Récupération headers Vercel Geo ---
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
    const userAgent = (req.headers['user-agent'] as string) || 'unknown'

    const client = await atlasClientPromise
    if (!client) return res.status(503).json({ error: T.db_client_missing })
    const collection = client
      .db(DEFAULTS.DB.NAME)
      .collection(DEFAULTS.DB.SESSIONS)

    // --- Rate limit simple (par IP, 10 sessions par minute) ---
    const recentSessions = await collection.countDocuments({
      ip,
      createdAt: { $gt: new Date(Date.now() - 60000) }
    })

    if (recentSessions >= 10) {
      return res.status(429).json({ error: T.rate_limit || 'Trop de tentatives.' })
    }

    // --- Upsert : permet de mettre à jour une session abandoned → completed ---
    await collection.updateOne(
      { sessionId },
      {
        $set: {
          // ── Identité ──
          playerId,
          
          // ── Partie ──
          status,
          difficulty: difficulty || DEFAULTS.LEVEL,
          lang: sessionLang || DEFAULTS.LANG,
          score: parseInt(score) || 0,
          totalQuestions: parseInt(totalQuestions) || 0,
          timeSpentMs: parseInt(timeSpentMs) || 0,
          lastQuestionIndex: parseInt(lastQuestionIndex) || 0,
          completionRate: parseFloat(completionRate) || 0,
          
          // ── Détails par question ──
          questionDetails: safeDetails,
          
          // ── Device ──
          deviceType: String(deviceType || 'unknown').substring(0, 10),
          screenWidth: parseInt(screenWidth) || null,
          screenHeight: parseInt(screenHeight) || null,
          userAgent,
          
          // ── Géolocalisation (Vercel Headers) ──
          ip,
          city: req.headers['x-vercel-ip-city'] || null,
          region: req.headers['x-vercel-ip-country-region'] || null,
          country: req.headers['x-vercel-ip-country'] || null,
          
          // ── Attribution Marketing ──
          referrer: String(referrer || '').substring(0, 500) || null,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,

          // ── Meta ──
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error(`[SESSION_SAVE_ERROR]`, e.message)
    res.status(500).json({
      error: `Erreur sauvegarde session : ${e.message || T.server_error}`
    })
  }
}
