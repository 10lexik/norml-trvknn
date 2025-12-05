import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. On accepte uniquement les POST
  if (req.method !== 'POST') return res.status(405).end();

  const { questionId, userIndex } = req.body;

  // 2. Validation basique
  if (!questionId || userIndex === undefined) {
    return res.status(400).json({ error: 'Données manquantes : questionId ou userIndex' });
  }

  try {
    const client = await global._mongoClientPromise;
    // IMPORTANT : On reprend le nom de collection "trivia" qui fonctionne
    const collection = client.db("norml_trvknn").collection("trivia");
    const data = await collection.findOne({});

    if (!data) throw new Error("Base de données vide (Aucun document trouvé)");

    // 3. DÉCODAGE DE L'ID
    // Format attendu généré par start_game : "fr_easy_12"
    const parts = questionId.split('_');
    const index = parseInt(parts.pop()!, 10); // 12
    const level = parts.pop();                // easy
    const lang = parts.join('_');             // fr

    // 4. NAVIGATION STRICTE DANS VOTRE STRUCTURE JSON
    // Structure : data -> fr -> questions_pool -> easy -> [12]

    // Étape A : La langue
    const langData = data[lang];
    if (!langData) {
        console.error(`Langue introuvable: ${lang}`);
        throw new Error("Langue introuvable dans la BDD");
    }

    // Étape B : Le pool
    const pool = langData.questions_pool;
    if (!pool) {
        console.error(`questions_pool introuvable dans ${lang}`);
        throw new Error("Structure de données invalide");
    }

    // Étape C : Le niveau (easy, medium...)
    const levelQuestions = pool[level!];
    if (!levelQuestions) {
        console.error(`Niveau introuvable: ${level}`);
        throw new Error("Niveau introuvable");
    }

    // Étape D : La question spécifique
    const question = levelQuestions[index];
    if (!question) {
        console.error(`Question introuvable à l'index ${index}`);
        throw new Error("Question introuvable");
    }

    // 5. VÉRIFICATION
    const isCorrect = (question.correct === userIndex);

    res.status(200).json({
      correct: isCorrect,
      correctIndex: question.correct,
      explanation: question.explanation
    });

  } catch (e: any) {
    console.error("API ERROR check_answer:", e.message);
    // On renvoie 500 pour différencier d'une 404 (Route introuvable)
    res.status(500).json({ error: e.message });
  }
}