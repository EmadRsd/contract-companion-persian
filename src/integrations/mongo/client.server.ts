import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let cachedDb: any = null;

export async function connectToMongo(uri: string, dbName: string) {
  if (!client) {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true } as any);
    await client.connect();
    cachedDb = client.db(dbName);
  }
  return { client, db: cachedDb };
}

export async function getDb() {
  if (!client || !cachedDb) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    if (!uri || !dbName) throw new Error('Missing MONGODB_URI or MONGODB_DB in environment');
    const res = await connectToMongo(uri, dbName);
    return res.db;
  }
  return cachedDb;
}
