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

    // --- 🛡️ SÉCURITÉ : VALIDATION DES DONNÉES (Solution A) ---

    // 1. Vérification des champs obligatoires
    if (!name || score === undefined) throw new Error(texts.params_missing)

    // 2. Validation du Score (Anti-aberration)
    // On convertit en entier et on vérifie les bornes (0 à 50 questions max)
    const safeScore = parseInt(score, 10)
    if (isNaN(safeScore) || safeScore < 0 || safeScore > 50) {
      throw new Error('Score invalide (Doit être entre 0 et 50)')
    }

    // 3. Nettoyage du Nom et de l'ID (Limite de caractères)
    // On coupe tout ce qui dépasse 20 caractères pour éviter le spam
    const safeName = String(name).trim().substring(0, 20)
    const safeMemberId = memberId
      ? String(memberId).trim().substring(0, 20)
      : ''

    // 4. Nettoyage Strict des Réseaux Sociaux
    // On reconstruit un objet propre en n'acceptant que les clés autorisées
    const allowedNetworks = ['instagram', 'x', 'facebook']
    const safeSocials: Record<string, string> = {}

    if (socials && typeof socials === 'object') {
      for (const key of allowedNetworks) {
        // Si la clé existe et que c'est bien une chaîne de caractères
        if (socials[key] && typeof socials[key] === 'string') {
          // On nettoie et on limite à 100 caractères (largement suffisant pour une URL)
          let url = socials[key].trim().substring(0, 100)

          // Petite sécurité XSS basique : on s'assure que ça ressemble à une URL ou un handle
          // (On évite les caractères trop bizarres comme < >)
          url = url.replace(/[<>]/g, '')

          if (url.length > 0) {
            safeSocials[key] = url
          }
        }
      }
    }

    // --- FIN DE LA SÉCURISATION ---

    const client = await global._mongoClientPromise
    if (!client) throw new Error(texts.db_empty)

    const collection = client.db('norml_trvknn').collection('leaderboard')

    // ÉTAPE 1 : Sauvegarde (Avec les données nettoyées "safe...")
    await collection.updateOne(
      { name: safeName, difficulty: difficulty },
      {
        $max: { score: safeScore },
        $set: {
          memberId: safeMemberId,
          socials: safeSocials, // On injecte l'objet nettoyé
          time: time || 0,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    // ÉTAPE 2 : IDENTIFICATION DES SURVIVANTS (Le Top 10)
    const survivors = await collection
      .find({ difficulty: difficulty })
      .sort({ score: -1, time: 1 })
      .limit(10)
      .project({ _id: 1 })
      .toArray()

    const survivorIds = survivors.map((doc) => doc._id)

    // ÉTAPE 3 : LA PURGE (Nettoyage BDD)
    if (survivorIds.length > 0) {
      await collection.deleteMany({
        difficulty: difficulty,
        _id: { $nin: survivorIds }
      })
    }

    // ÉTAPE 4 : Renvoi du Top 10 propre
    const top10 = await collection
      .find({ difficulty: difficulty })
      .sort({ score: -1, time: 1 })
      .limit(10)
      .project({ _id: 0, name: 1, score: 1, memberId: 1, socials: 1, time: 1 })
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error('API Error:', e.message)
    // En cas d'erreur de validation, on renvoie un message clair (ou générique en prod)
    res.status(500).json({ error: e.message || 'Erreur serveur' })
  }
}
