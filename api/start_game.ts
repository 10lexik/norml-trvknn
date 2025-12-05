import { MongoClient } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const uri = process.env.MONGODB_URI!
let client: MongoClient

if (!global._mongoClientPromise) {
  client = new MongoClient(uri)
  global._mongoClientPromise = client.connect()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Par défaut on prend 'fr' et 'medium'
  const { lang = 'fr', level = 'medium' } = req.query
  const targetLang = lang as string
  const targetLevel = level as string

  try {
    const client = await global._mongoClientPromise
    // On garde la collection "trivia" qui est la bonne
    const collection = client.db('norml_trvknn').collection('trivia')

    // On récupère le gros objet JSON
    const data = await collection.findOne({})

    if (!data) {
      return res.status(404).json({ error: 'Base de données vide' })
    }

    // 1. On entre dans l'objet de la langue (ex: data.fr)
    const langData = data[targetLang]
    if (!langData) {
      throw new Error(`Langue introuvable : ${targetLang}`)
    }

    // 2. On récupère le pool de questions (ex: data.fr.questions_pool)
    const questionsPool = langData.questions_pool
    if (!questionsPool) {
      throw new Error(
        `Pas de 'questions_pool' trouvé dans la langue ${targetLang}`
      )
    }

    // 3. On récupère le niveau (ex: data.fr.questions_pool.easy)
    const levelQuestions = questionsPool[targetLevel]
    if (!levelQuestions || levelQuestions.length === 0) {
      throw new Error(
        `Aucune question pour le niveau ${targetLevel} en ${targetLang}`
      )
    }

    // 4. Préparation et Mélange
    // On construit l'ID sous la forme "fr_easy_12" pour pouvoir retrouver la réponse plus tard
    const safeQuestions = levelQuestions
      .map((q: any, index: number) => ({
        ...q,
        _id: `${targetLang}_${targetLevel}_${index}`,
      }))
      .sort(() => 0.5 - Math.random())
      .slice(0, 20)
      .map(({ category, question, options, _id }: any) => ({
        _id,
        category,
        question,
        options,
      }))

    res.status(200).json(safeQuestions)
  } catch (e: any) {
    console.error('API Error start_game:', e.message)
    res.status(500).json({ error: e.message })
  }
}
