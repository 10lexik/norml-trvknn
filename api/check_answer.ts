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
  // On charge les textes par défaut en FR pour les erreurs initiales
  let T = getApiText('fr')

  if (req.method !== 'POST')
    return res.status(405).json({ error: T.method_not_allowed })

  const { questionId, userIndex } = req.body

  // 🛡️ SÉCURITÉ : VALIDATION DES ENTRÉES

  // 1. Vérification que questionId est une chaine valide
  if (!questionId || typeof questionId !== 'string') {
    return res.status(400).json({ error: T.params_missing })
  }

  // 2. Vérification du format exact de l'ID (ex: "fr_easy_12")
  // Regex : 2 lettres _ mot _ chiffres
  const idRegex = /^[a-z]{2}_[a-z]+_\d+$/
  if (!idRegex.test(questionId)) {
    return res.status(400).json({ error: 'ID de question invalide' })
  }

  // 3. Vérification que userIndex est un nombre positif
  if (typeof userIndex !== 'number' || userIndex < 0 || userIndex > 10) {
    return res.status(400).json({ error: 'Index de réponse invalide' })
  }

  try {
    const parts = questionId.split('_')
    const index = parseInt(parts.pop()!, 10)
    const level = parts.pop()
    const lang = parts.join('_') // Gère les cas exotiques, même si regex bloque avant

    // On met à jour la langue des messages d'erreur si possible
    T = getApiText(lang)

    const client = await global._mongoClientPromise
    if (!client) throw new Error('Database client not initialized')

    const collection = client.db('norml_trvknn').collection('trivia')
    const data = await collection.findOne({})

    if (!data) throw new Error(T.db_empty)

    const langData = data[lang]
    if (!langData) throw new Error(T.lang_missing)

    const pool = langData.questions_pool
    if (!pool) throw new Error(T.structure_invalid)

    // Sécurité supplémentaire : vérification que le niveau existe dans la BDD
    const levelQuestions = pool[level!]
    if (!levelQuestions) throw new Error(T.level_missing)

    // Sécurité : vérification que l'index n'est pas hors limites
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
