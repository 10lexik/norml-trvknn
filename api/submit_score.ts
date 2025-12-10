import { MongoClient, ServerApiVersion } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApiText } from './_i18n'

const uri = process.env.MONGODB_URI!
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (!global._mongoClientPromise && uri) {
  const client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Récupération des textes selon la langue
  const lang = (req.query.lang as string) || 'fr'
  const texts = getApiText(lang)

  if (req.method !== 'POST')
    return res.status(405).json({ error: texts.method_not_allowed })

  try {
    const {
      name,
      score,
      memberId,
      socials,
      difficulty = 'medium',
      time
    } = req.body

    // Utilisation de texts.params_missing
    if (!name || score === undefined) throw new Error(texts.params_missing)

    const client = await global._mongoClientPromise
    // Utilisation de texts.db_empty
    if (!client) throw new Error(texts.db_empty)

    const collection = client.db('norml_trvknn').collection('leaderboard')

    await collection.updateOne(
      { name: name, difficulty: difficulty },
      {
        $max: { score: parseInt(score) },
        $set: {
          memberId: memberId || '',
          socials: socials || {},
          time: time || 0,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    const top10 = await collection
      .find({ difficulty: difficulty })
      .sort({ score: -1, time: 1 })
      .limit(10)
      .project({ _id: 0, name: 1, score: 1, memberId: 1, socials: 1, time: 1 })
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error(e) // Log technique serveur (invisible pour l'utilisateur)
    // On renvoie le message d'erreur (qui vient de texts.* s'il a été throw plus haut)
    res.status(500).json({ error: e.message })
  }
}
