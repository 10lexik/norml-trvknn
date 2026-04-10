import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clientPromise, DEFAULTS, getData } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = (req.query.lang as string) || (req.body.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  // --- RÉCUPÉRATION DU SECRET ---
  const cleaner = (s: string) =>
    (s || '')
      .trim()
      .normalize('NFC')
      .replace(/^["']|["']$/g, '')
  const adminSecret = cleaner(process.env.ADMIN_SECRET as string)
  const received = cleaner(req.headers[DEFAULTS.HEADERS.ADMIN] as string)

  // --- VÉRIFICATION ---
  if (!received || !adminSecret || received !== adminSecret) {
    console.error(
      `[AUTH_ERROR] Attendu: ${adminSecret ? 'Défini' : 'UNDEFINED'}, Reçu: ${received ? 'Défini' : 'VIDE'}`
    )
    return res.status(403).json({
      error: T.forbidden,
      debug: {
        envLoaded: !!adminSecret,
        headerPresent: !!received,
        sentLen: received.length,
        expectedLen: adminSecret.length
      }
    })
  }

  try {
    const client = await clientPromise
    if (!client) {
      // En mode local (sans DB), on permet quand même la lecture des fichiers pour l'admin
      if (req.method === DEFAULTS.METHODS.GET) {
        const localData = await getData(lang)
        return res.status(200).json(localData || {})
      }
      return res.status(503).json({ error: T.db_client_missing })
    }
    const collection = client.db(DEFAULTS.DB.NAME).collection(DEFAULTS.DB.TRIVIA)
    const doc = await collection.findOne({})

    if (req.method === DEFAULTS.METHODS.GET) {
      return res.status(200).json(doc ? (doc as any)[lang] : {})
    }

    if (req.method === DEFAULTS.METHODS.POST) {
      const { content } = req.body
      if (!content) return res.status(400).json({ error: T.content_missing })
      await collection.updateOne({}, { $set: { [lang]: content } }, { upsert: true })
      return res.status(200).json({ success: true, message: `${T.save_success}${T.sep}${lang}` })
    }
  } catch (e: any) {
    console.error(`[ADMIN_MANAGE_ERROR]`, e.message)
    res.status(500).json({ error: `Erreur serveur : ${e.message || T.server_error}` })
  }
}
