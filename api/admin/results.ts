import type { VercelRequest, VercelResponse } from '@vercel/node'
import { atlasClientPromise, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = (req.query.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  // --- AUTHENTICATION (Same logic as manage.ts) ---
  const cleaner = (s: string) => (s || '').trim().normalize('NFC').replace(/^["']|["']$/g, '')
  const adminSecret = cleaner(process.env.ADMIN_SECRET as string)
  const received = cleaner(req.headers[DEFAULTS.HEADERS.ADMIN] as string)

  if (!received || !adminSecret || received !== adminSecret) {
    return res.status(403).json({ error: T.forbidden })
  }

  try {
    const client = await atlasClientPromise
    if (!client) return res.status(503).json({ error: T.db_client_missing })
    
    const collection = client
      .db(DEFAULTS.DB.NAME)
      .collection(DEFAULTS.DB.SCORES)

    // Fetch ALL results, sorted by date (newest first)
    const results = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return res.status(200).json(results)
  } catch (e: any) {
    console.error(`[ADMIN_RESULTS_ERROR]`, e.message)
    res.status(500).json({ error: `Erreur serveur : ${e.message || T.server_error}` })
  }
}
