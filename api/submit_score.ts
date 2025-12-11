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

    if (!name || score === undefined) throw new Error(texts.params_missing)

    const client = await global._mongoClientPromise
    if (!client) throw new Error(texts.db_empty)

    const collection = client.db('norml_trvknn').collection('leaderboard')

    // ÉTAPE 1 : On insère ou met à jour le joueur actuel
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

    // ÉTAPE 2 : IDENTIFICATION DES SURVIVANTS (Le Top 10)
    // On cherche les 10 meilleurs pour CETTE difficulté spécifique
    const survivors = await collection
      .find({ difficulty: difficulty }) // Filtre important !
      .sort({ score: -1, time: 1 }) // Score haut d'abord, temps court ensuite
      .limit(10) // On en garde que 10
      .project({ _id: 1 }) // On ne récupère que l'ID pour aller vite
      .toArray()

    const survivorIds = survivors.map((doc) => doc._id)

    // ÉTAPE 3 : LA PURGE
    // Si on a des survivants, on supprime tous les autres de cette difficulté
    if (survivorIds.length > 0) {
      await collection.deleteMany({
        difficulty: difficulty, // On ne touche pas aux autres niveaux (easy/hard)
        _id: { $nin: survivorIds } // $nin = "Not In" (Tout ce qui n'est PAS dans la liste des survivants)
      })
    }

    // ÉTAPE 4 : On renvoie le Top 10 propre au frontend
    const top10 = await collection
      .find({ difficulty: difficulty })
      .sort({ score: -1, time: 1 })
      .limit(10)
      .project({ _id: 0, name: 1, score: 1, memberId: 1, socials: 1, time: 1 })
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
