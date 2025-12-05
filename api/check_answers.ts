import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { questionId, userIndex } = req.body;

  if (!questionId) return res.status(400).json({ error: 'Missing questionId' });

  try {
    const client = await global._mongoClientPromise;
    const db = client.db("norml_trvknn");
    const collection = db.collection("Norml Trivia Kanna");
    const data = await collection.findOne({});

    // DÉCODAGE DE L'ID : "fr_easy_12"
    const parts = questionId.split('_');
    // Si le titre contient des underscores, on prend les derniers morceaux
    const indexStr = parts.pop();
    const level = parts.pop();
    const lang = parts.join('_'); // Le reste est la langue (au cas où "fr_FR")

    const index = parseInt(indexStr!);

    // Récupération sécurisée
    const source = data[lang];
    if (!source) throw new Error("Langue introuvable");

    const pool = source.questions_pool[level!];
    if (!pool) throw new Error("Niveau introuvable");

    const originalQuestion = pool[index];

    // Vérification
    const isCorrect = (originalQuestion.correct === userIndex);

    res.status(200).json({
      correct: isCorrect,
      correctIndex: originalQuestion.correct,
      explanation: originalQuestion.explanation
    });

  } catch (e: any) {
    console.error("Check Error:", e);
    res.status(500).json({ error: e.message });
  }
}