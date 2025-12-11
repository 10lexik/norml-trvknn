import { MongoClient, ServerApiVersion } from 'mongodb'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// On utilise un import dynamique ou require pour éviter les problèmes de config TS/JS
// Mais vu votre config "CommonJS", ceci est correct :
const uri = process.env.MONGODB_URI!
const adminSecret = process.env.ADMIN_SECRET!

// Configuration client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. SÉCURITÉ
  const authHeader = req.headers['x-admin-secret']
  if (authHeader !== adminSecret) {
    return res.status(403).json({ error: 'Forbidden: Mauvais mot de passe' })
  }

  try {
    await client.connect()
    const db = client.db('norml_trvknn')
    // ATTENTION : Sur votre capture, la collection semble être 'trivia' ou 'questions_pool' ?
    // D'après votre fichier get_content.ts, vous utilisez 'trivia'.
    // D'après fr.json, la clé est 'questions_pool'.
    // On se fie à votre get_content.ts qui fonctionne :
    const collection = db.collection('trivia')

    // 2. RECUPERATION INTELLIGENTE DU DOCUMENT
    // On cherche un document qui contient la clé 'fr'.
    // Si on ne trouve pas, on prend le premier document dispo (findOne({})).
    let globalDoc = await collection.findOne({ fr: { $exists: true } })

    if (!globalDoc) {
      // Fallback : Si la base est "sale" ou vide, on prend le premier venu
      globalDoc = await collection.findOne({})
    }

    const lang = (req.query.lang as string) || (req.body.lang as string) || 'fr'

    // --- MODE LECTURE (GET) ---
    if (req.method === 'GET') {
      // On renvoie uniquement la partie de la langue demandée (ex: doc.fr)
      const content = globalDoc ? (globalDoc as any)[lang] : {}
      return res.status(200).json(content || {})
    }

    // --- MODE ÉCRITURE (POST) ---
    if (req.method === 'POST') {
      const { content } = req.body
      if (!content) return res.status(400).json({ error: 'Contenu manquant' })

      if (globalDoc) {
        // MISE À JOUR : On cible l'ID précis pour ne pas créer de doublon
        // On utilise $set pour mettre à jour UNIQUEMENT la langue concernée (ex: "fr")
        await collection.updateOne(
          { _id: globalDoc._id },
          { $set: { [lang]: content } }
        )
      } else {
        // CRÉATION : Si la base est 100% vide
        await collection.insertOne({ [lang]: content })
      }

      return res
        .status(200)
        .json({ success: true, message: `Langue ${lang} sauvegardée` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
