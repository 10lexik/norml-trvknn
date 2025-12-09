import { MongoClient, ServerApiVersion } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Configuration robuste (compatible IPv4 pour le local)
const uri = process.env.MONGODB_URI!
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
}

// Cache de connexion pour la performance
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}
if (!global._mongoClientPromise && uri) {
  const client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lang = 'fr' } = req.query

  try {
    if (!uri) throw new Error('MONGODB_URI manquant')

    const client = await global._mongoClientPromise
    if (!client) throw new Error('Client DB non initialisé')

    const collection = client.db('norml_trvknn').collection('trivia')

    // 1. On récupère le document unique
    const data = await collection.findOne({})

    if (!data) {
      return res.status(404).json({ error: 'Database empty' })
    }

    // 2. On cible la langue demandée (ex: data['fr'])
    const content = data[lang as string]

    if (!content) {
      // Fallback : Si la langue n'existe pas, on renvoie une 404
      // Le front gardera ses textes par défaut
      return res.status(404).json({ error: `Langue ${lang} introuvable` })
    }

    // 3. NETTOYAGE CRITIQUE : On retire 'questions_pool'
    // On ne veut envoyer que l'UI (léger), pas les 1000 questions (lourd)
    const { questions_pool, ...uiContent } = content

    // 4. On renvoie la config UI propre
    res.status(200).json(uiContent)
  } catch (e: any) {
    console.error('API Error get_content:', e.message)
    res.status(500).json({ error: e.message })
  }
}
