import { MongoClient } from 'mongodb';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Typage du client pour le cache global
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extension de l'objet global pour le cache en dev
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await clientPromise;
    // Remplace par tes vrais noms de DB et Collection
    const db = client.db("norml_trvknn");
    const collection = db.collection("trivia");

    // On récupère le document unique
    const data = await collection.findOne({});

    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }

    // On retire l'ID mongo (_id) pour ne pas polluer le front
    const { _id, ...cleanData } = data;

    // Cache header pour la perf (optionnel)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    
    res.status(200).json(cleanData);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}