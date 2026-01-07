import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getData, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let T = getApiText(DEFAULTS.LANG)
  if (req.method !== DEFAULTS.METHODS.POST)
    return res.status(405).json({ error: T.method_not_allowed })

  const { questionId, userIndex } = req.body
  if (!questionId || typeof questionId !== 'string')
    return res.status(400).json({ error: T.params_missing })

  try {
    const parts = questionId.split(DEFAULTS.ID_SEP)
    const index = parseInt(parts.pop()!, 10)
    const level = parts.pop()
    const lang = parts.join(DEFAULTS.ID_SEP)

    T = getApiText(lang)
    const langData = await getData(lang)
    if (!langData) throw new Error(T.lang_missing)

    const question = langData.questions_pool?.[level!]?.[index]
    if (!question) throw new Error(T.question_missing)

    res.status(200).json({
      correct: question.correct === userIndex,
      correctIndex: question.correct,
      explanation: question.explanation
    })
  } catch (e: any) {
    console.error(T.log_check, e.message)
    res.status(500).json({ error: e.message || T.server_error })
  }
}
