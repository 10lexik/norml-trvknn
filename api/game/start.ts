import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getData, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawLang = String(req.query.lang || DEFAULTS.LANG)
  const rawLevel = String(req.query.level || DEFAULTS.LEVEL)
  const targetLang = DEFAULTS.ALLOWED_LANGS.includes(rawLang)
    ? rawLang
    : DEFAULTS.LANG
  const targetLevel = DEFAULTS.ALLOWED_LEVELS.includes(rawLevel)
    ? rawLevel
    : DEFAULTS.LEVEL

  const T = getApiText(targetLang)

  try {
    const langData = await getData(targetLang)
    if (!langData) throw new Error(T.lang_missing)

    const pool = langData.questions_pool?.[targetLevel]
    if (!pool || pool.length === 0)
      throw new Error(`${T.level_empty}${targetLevel}`)

    const safeQuestions = pool
      .map((q: any, index: number) => ({
        ...q,
        _id: `${targetLang}${DEFAULTS.ID_SEP}${targetLevel}${DEFAULTS.ID_SEP}${index}`
      }))
      .sort(() => 0.5 - Math.random())
      .slice(0, DEFAULTS.SCORE_LIMIT)
      .map(({ category, question, options, _id }: any) => ({
        _id,
        category,
        question,
        options
      }))

    res.status(200).json(safeQuestions)
  } catch (e: any) {
    console.error(T.log_start, e.message)
    res.status(500).json({ error: e.message || T.server_error })
  }
}
