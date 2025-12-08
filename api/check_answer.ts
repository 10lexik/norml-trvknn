import { MongoClient } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApiText } from './_i18n'

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const uri = process.env.MONGODB_URI!

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri)
  global._mongoClientPromise = client.connect()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let T = getApiText('fr')

  if (req.method !== 'POST')
    return res.status(405).json({ error: T.method_not_allowed })

  const { questionId, userIndex } = req.body

  if (!questionId || userIndex === undefined) {
    return res.status(400).json({ error: T.params_missing })
  }

  try {
    const parts = questionId.split('_')
    const index = parseInt(parts.pop()!, 10)
    const level = parts.pop()
    const lang = parts.join('_')

    T = getApiText(lang)

    const client = await global._mongoClientPromise

    // --- CORRECTION : SAFETY CHECK ---
    if (!client) {
      throw new Error('Database client not initialized')
    }
    // ---------------------------------

    const collection = client.db('norml_trvknn').collection('trivia')
    const data = await collection.findOne({})

    if (!data) throw new Error(T.db_empty)

    const langData = data[lang]
    if (!langData) throw new Error(T.lang_missing)

    const pool = langData.questions_pool
    if (!pool) throw new Error(T.structure_invalid)

    const levelQuestions = pool[level!]
    if (!levelQuestions) throw new Error(T.level_missing)

    const question = levelQuestions[index]
    if (!question) throw new Error(T.question_missing)

    const isCorrect = question.correct === userIndex

    res.status(200).json({
      correct: isCorrect,
      correctIndex: question.correct,
      explanation: question.explanation
    })
  } catch (e: any) {
    console.error('API Error check_answer:', e.message)
    res.status(500).json({ error: e.message })
  }
}
