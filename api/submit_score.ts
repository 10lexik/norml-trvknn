import { MongoClient, ServerApiVersion } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'

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
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    // On récupère "socials" (un objet) au lieu de socialLink
    const { name, score, memberId, socials, difficulty = 'medium' } = req.body

    if (!name || score === undefined) throw new Error('Données manquantes')

    const client = await global._mongoClientPromise
    if (!client) throw new Error('DB non initialisée')

    const collection = client.db('norml_trvknn').collection('leaderboard')

    await collection.updateOne(
      { name: name, difficulty: difficulty },
      {
        $max: { score: parseInt(score) },
        $set: {
          memberId: memberId || '',
          socials: socials || {}, // On sauvegarde l'objet complet { instagram: '...', x: '...' }
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    const top10 = await collection
      .find({ difficulty: difficulty })
      .sort({ score: -1 })
      .limit(10)
      .project({ _id: 0, name: 1, score: 1, memberId: 1, socials: 1 }) // On renvoie 'socials'
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error('Save error:', e)
    res.status(500).json({ error: e.message })
  }
}
