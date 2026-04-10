import type { VercelRequest, VercelResponse } from '@vercel/node'
import { atlasClientPromise, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

// Regex stricte : 2 à 15 caractères, alphanumérique + accents, espaces, tirets
const NAME_REGEX = /^[a-zA-Z0-9\u00C0-\u00FF _-]{2,15}$/
// Regex email simple
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = (req.query.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  if (req.method !== DEFAULTS.METHODS.POST)
    return res.status(405).json({ error: T.method_not_allowed })

  try {
    const {
      name,
      email,
      consent,
      score,
      memberId,
      socials,
      difficulty = DEFAULTS.LEVEL,
      time
    } = req.body

    if (!name || score === undefined || !email) {
      return res.status(400).json({ error: T.params_missing })
    }

    // 1. Validation et Nettoyage technique
    const safeScore = parseInt(score, DEFAULTS.RADIX)
    if (
      isNaN(safeScore) ||
      safeScore < DEFAULTS.SCORE_RANGE.MIN ||
      safeScore > DEFAULTS.SCORE_RANGE.MAX
    ) {
      return res.status(400).json({ error: T.invalid_score })
    }

    const safeName = String(name).trim().substring(0, DEFAULTS.NAME_MAX)

    // VALIDATION REGEX DU NOM
    if (!NAME_REGEX.test(safeName)) {
      return res.status(400).json({ error: T.invalid_name })
    }

    const safeEmail = String(email).trim()
    if (!EMAIL_REGEX.test(safeEmail)) {
      return res.status(400).json({ error: "L'email est invalide." })
    }

    const providedId = memberId ? String(memberId).trim().substring(0, DEFAULTS.NAME_MAX) : ''

    const safeSocials: Record<string, string> = {}
    if (socials && typeof socials === 'object') {
      for (const key of DEFAULTS.SOCIALS) {
        if (socials[key] && typeof socials[key] === 'string') {
          const url = socials[key].trim().substring(0, DEFAULTS.SOCIAL_MAX).replace(/[<>]/g, '')
          if (url.length > 0) safeSocials[key] = url
        }
      }
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
    const userAgent = (req.headers['user-agent'] as string) || 'unknown'

    const client = await atlasClientPromise
    if (!client) return res.status(503).json({ error: T.db_client_missing })
    const collection = client.db(DEFAULTS.DB.NAME).collection(DEFAULTS.DB.SCORES)

    // 2. SÉCURITÉ : RATE LIMIT (par IP)
    const recentSubmissions = await collection.countDocuments({
      ip,
      updatedAt: { $gt: new Date(Date.now() - 60000) } // 1 minute
    })

    if (recentSubmissions >= 3) {
      return res.status(429).json({ error: T.rate_limit || 'Trop de tentatives.' })
    }

    // 3. SÉCURITÉ : COHÉRENCE (Anti-Bot / Anti-Triche)
    // - On rejette si le temps est trop court (< 1s par question en moyenne, ici < 15s pour le quizz complet)
    // - On rejette si le score est parfait en un temps record (< 40s pour 20 questions)
    const timeSpent = parseInt(time)
    const isBotTime = timeSpent < 15
    const isSuspiciousScore = safeScore >= DEFAULTS.SCORE_LIMIT && timeSpent < 40

    if (isBotTime || isSuspiciousScore) {
      return res.status(400).json({ error: T.invalid_coherence || 'Action suspecte.' })
    }

    // 4. VÉRIFICATION D'UNICITÉ DU PSEUDO
    const existingUser = await collection.findOne({ name: safeName })

    if (existingUser) {
      // Si le nom existe mais que le memberId ne correspond pas -> Conflit (409)
      if (existingUser.memberId !== providedId) {
        return res.status(409).json({ error: T.name_taken || 'Pseudo déjà pris' })
      }
    }

    // 3. MISE À JOUR OU CRÉATION
    await collection.updateOne(
      { name: safeName, difficulty },
      {
        $max: { score: safeScore },
        $set: {
          email: safeEmail,
          consent: Boolean(consent),
          memberId: providedId,
          socials: safeSocials,
          time,
          ip,
          userAgent,
          updatedAt: new Date(),
          // Tracking Géo (Vercel Headers)
          city: req.headers['x-vercel-ip-city'] || null,
          region: req.headers['x-vercel-ip-country-region'] || null,
          country: req.headers['x-vercel-ip-country'] || null,
          // Tracking Marketing (UTM)
          utm_source: req.body.utm_source || null,
          utm_medium: req.body.utm_medium || null,
          utm_campaign: req.body.utm_campaign || null,
          // Données client optionnelles
          referrer: req.body.referrer || null,
          screenWidth: req.body.screenWidth || null
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    // 4. RETOUR DU TOP 10 (SÉCURISÉ)
    const top10 = await collection
      .find({ difficulty })
      .sort({ score: -1, time: 1 })
      .limit(DEFAULTS.LB_LIMIT)
      .project({
        _id: 0,
        name: 1,
        score: 1,
        time: 1,
        socials: 1,
        memberId: 1
      })
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error(`[SCORE_SAVE_ERROR]`, e.message)
    const isValidationError = [T.params_missing, T.invalid_score].includes(e.message)
    res.status(isValidationError ? 400 : 500).json({
      error: `Erreur sauvegarde score : ${e.message || T.server_error}`
    })
  }
}
