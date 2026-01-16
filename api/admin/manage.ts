import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clientPromise, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'
import fs from 'fs'
import path from 'path'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang =
    (req.query.lang as string) || (req.body.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  // --- RÉCUPÉRATION DU SECRET (Méthode de secours incluse) ---
  let adminSecret = process.env.ADMIN_SECRET

  // Si on est en local et que ADMIN_SECRET est vide, on force la lecture du fichier
  if (!adminSecret && process.env.NODE_ENV !== 'production') {
    try {
      const envPath = path.resolve(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        const match = envContent.match(/^ADMIN_SECRET=(.*)$/m)
        if (match) adminSecret = match[1].trim()
      }
    } catch (err) {
      console.error('Erreur lecture manuelle .env.local:', err)
    }
  }

  const received = req.headers[DEFAULTS.HEADERS.ADMIN] as string

  // --- VÉRIFICATION ---
  if (!received || received !== adminSecret) {
    console.error(
      `[AUTH_ERROR] Attendu: ${adminSecret ? 'Défini' : 'UNDEFINED'}, Reçu: ${received ? 'Défini' : 'VIDE'}`
    )
    return res.status(403).json({
      error: T.forbidden,
      debug: { envLoaded: !!adminSecret, headerPresent: !!received }
    })
  }

  try {
    const client = await clientPromise
    if (!client) throw new Error(T.db_client_missing)
    const collection = client
      .db(DEFAULTS.DB.NAME)
      .collection(DEFAULTS.DB.TRIVIA)
    const doc = await collection.findOne({})

    if (req.method === DEFAULTS.METHODS.GET) {
      return res.status(200).json(doc ? (doc as any)[lang] : {})
    }

    if (req.method === DEFAULTS.METHODS.POST) {
      const { content } = req.body
      if (!content) return res.status(400).json({ error: T.content_missing })
      await collection.updateOne(
        {},
        { $set: { [lang]: content } },
        { upsert: true }
      )
      return res
        .status(200)
        .json({ success: true, message: `${T.save_success}${T.sep}${lang}` })
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || T.server_error })
  }
}
