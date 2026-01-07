import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clientPromise, DEFAULTS } from '../_core/_db' // Correction de l'import
import { getApiText } from '../_core/_i18n'

const adminSecret = process.env.ADMIN_SECRET!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang =
    (req.query.lang as string) || (req.body.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  if (req.headers[DEFAULTS.HEADERS.ADMIN] !== adminSecret)
    return res.status(403).json({ error: T.forbidden })

  try {
    const client = await clientPromise // Utilisation du Singleton
    if (!client) throw new Error(T.db_client_missing)
    const collection = client
      .db(DEFAULTS.DB.NAME)
      .collection(DEFAULTS.DB.TRIVIA)
    let doc = await collection.findOne({})

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
    console.error(T.log_manage, e.message)
    res.status(500).json({ error: e.message || T.server_error })
  }
}
