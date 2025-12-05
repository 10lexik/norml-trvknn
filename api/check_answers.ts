import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ... (Code de connexion DB identique) ...

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // On attend un POST avec { questionId: "fr_easy_12", answerIndex: 2 }
  const { questionId, answerIndex } = req.body;

  if (!questionId) return res.status(400).json({ error: 'Missing ID' });

  try {
    const client = await global._mongoClientPromise;
    const db = client.db("norml_trvknn");
    const collection = db.collection("Norml Trivia Kanna");
    const data = await collection.findOne({});

    // 1. Décoder l'ID pour retrouver la question dans le JSON
    // Format de l'ID : "lang_level_index"
    const [lang, level, indexStr] = questionId.split('_');
    const index = parseInt(indexStr);

    const question = data[lang].questions_pool[level][index];

    // 2. Vérifier la réponse
    const isCorrect = (question.correct === answerIndex);

    // 3. Renvoyer le résultat ET l'explication (maintenant on a le droit)
    res.status(200).json({
      correct: isCorrect,
      correctIndex: question.correct, // Pour afficher la bonne réponse en vert
      explanation: question.explanation
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}