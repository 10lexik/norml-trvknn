import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Réutilisation de ta connexion DB (copie le bloc de connexion standard ici)
const uri = process.env.MONGODB_URI!;
let client: MongoClient;
if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
// ... (code de connexion identique à avant) ...

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Lire les paramètres (ex: ?lang=fr&level=easy)
  const { lang = 'fr', level = 'medium' } = req.query;

  try {
    const client = await global._mongoClientPromise;
    const db = client.db("norml_trvknn");
    const collection = db.collection("Norml Trivia Kanna");
    const data = await collection.findOne({});

    if (!data || !data[lang as string]) {
      return res.status(404).json({ error: 'Langue introuvable' });
    }

    // 2. Piocher les questions
    const pool = data[lang as string].questions_pool[level as string] || [];
    
    // 3. Mélanger et prendre 20 questions
    // Astuce : On ajoute un "realIndex" pour pouvoir vérifier la réponse plus tard
    const shuffled = pool
      .map((q: any, index: number) => ({ ...q, _id: `${lang}_${level}_${index}` }))
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);

    // 4. NETTOYAGE DE SÉCURITÉ (On retire la réponse !)
    const safeQuestions = shuffled.map((q: any) => ({
      _id: q._id,          // L'ID qui nous servira à vérifier
      category: q.category,
      question: q.question,
      options: q.options,  // On laisse les options
      // PAS de 'correct'
      // PAS de 'explanation'
    }));

    res.status(200).json(safeQuestions);

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}