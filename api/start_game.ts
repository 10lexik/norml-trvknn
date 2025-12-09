import { MongoClient } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Import simple, local, typé.
import { getApiText } from './_i18n'

// ... Déclaration TypeScript pour éviter l'erreur "implicitly any" ...
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const uri = process.env.MONGODB_URI!

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri)
  global._mongoClientPromise = client.connect()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lang = 'fr', level = 'medium' } = req.query
  const targetLang = lang as string
  const targetLevel = level as string

  const T = getApiText(targetLang)

  try {
    const client = await global._mongoClientPromise

    // --- CORRECTION : SAFETY CHECK ---
    if (!client) {
      throw new Error('Database client not initialized')
    }
    // ---------------------------------

    const collection = client.db('norml_trvknn').collection('trivia')
    const data = await collection.findOne({})

    if (!data) return res.status(404).json({ error: T.db_empty })

    const langData = data[targetLang]
    if (!langData) throw new Error(`${T.lang_missing} : ${targetLang}`)

    const questionsPool = langData.questions_pool
    if (!questionsPool) throw new Error(`${T.pool_missing} ${targetLang}`)

    const levelQuestions = questionsPool[targetLevel]
    if (!levelQuestions || levelQuestions.length === 0) {
      throw new Error(`${T.level_empty} ${targetLevel}`)
    }

    const safeQuestions = levelQuestions
      .map((q: any, index: number) => ({
        ...q,
        _id: `${targetLang}_${targetLevel}_${index}`
      }))
      .sort(() => 0.5 - Math.random())
      .slice(0, 1) // ATTENTION : A MODIFIER POUR AVOIR 20 QUESTIONS !
      .map(({ category, question, options, _id }: any) => ({
        _id,
        category,
        question,
        options
      }))

    res.status(200).json(safeQuestions)
  } catch (e: any) {
    console.error('API Error start_game:', e.message)
    res.status(500).json({ error: e.message })
  }
}
