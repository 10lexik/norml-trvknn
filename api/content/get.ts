import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getData, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = String(req.query.lang || DEFAULTS.LANG)
  const T = getApiText(lang)

  try {
    const content = await getData(lang)
    if (!content) return res.status(404).json({ error: T.lang_missing })

    const { questions_pool, ...uiContent } = content
    res.status(200).json(uiContent)
  } catch (e: any) {
    console.error(T.log_get, e.message)
    res.status(500).json({ error: e.message || T.server_error })
  }
}
