import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lang = 'fr', level = 'medium' } = req.query;

  try {
    const client = await global._mongoClientPromise;
    const db = client.db("norml_trvknn");
    const collection = db.collection("Norml Trivia Kanna");
    
    const data = await collection.findOne({});

    if (!data) {
      return res.status(404).json({ error: 'Base de données vide' });
    }

    // SÉCURITÉ : On vérifie si la langue demandée existe, sinon fallback FR
    const langKey = (lang as string);
    const source = data[langKey] || data['fr'];

    if (!source || !source.questions_pool) {
      return res.status(404).json({ error: `Pas de données pour la langue : ${langKey}` });
    }

    // SÉCURITÉ : On vérifie si le niveau existe, sinon fallback medium
    const levelKey = (level as string);
    const pool = source.questions_pool[levelKey] || source.questions_pool['medium'];

    if (!pool || !Array.isArray(pool)) {
      return res.status(404).json({ error: `Pas de questions pour le niveau : ${levelKey}` });
    }

    // Mélange et nettoyage
    const safeQuestions = pool
      .map((q: any, index: number) => ({
        ...q,
        _id: `${langKey}_${levelKey}_${index}` // ID composite pour retrouver la réponse
      }))
      .sort(() => 0.5 - Math.random())
      .slice(0, 20)
      .map((q: any) => ({
        _id: q._id,
        category: q.category,
        question: q.question,
        options: q.options
        // Pas de correct ni explanation
      }));

    res.status(200).json(safeQuestions);

  } catch (e: any) {
    console.error("API Error:", e);
    res.status(500).json({ error: e.message });
  }
}