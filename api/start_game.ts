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
  // 🛡️ SÉCURITÉ : LISTES BLANCHES
  const ALLOWED_LANGS = ['fr', 'en', 'es']
  const ALLOWED_LEVELS = ['easy', 'medium', 'hard']

  // Récupération et nettoyage
  const rawLang = String(req.query.lang || 'fr')
  const rawLevel = String(req.query.level || 'medium')

  // Validation stricte : Si c'est pas dans la liste, on force la valeur par défaut
  const targetLang = ALLOWED_LANGS.includes(rawLang) ? rawLang : 'fr'
  const targetLevel = ALLOWED_LEVELS.includes(rawLevel) ? rawLevel : 'medium'

  const T = getApiText(targetLang)

  try {
    const client = await global._mongoClientPromise
    if (!client) throw new Error('Database client not initialized')

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

    // Mélange et sélection
    const safeQuestions = levelQuestions
      .map((q: any, index: number) => ({
        ...q,
        _id: `${targetLang}_${targetLevel}_${index}`
      }))
      .sort(() => 0.5 - Math.random())
      .slice(0, 20)
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
