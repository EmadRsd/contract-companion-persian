import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const rootEmail = (process.env.ROOT_EMAIL || 'admin@example.com').toLowerCase();
const rootPassword = process.env.ROOT_PASSWORD || 'changeme123';

if (!uri || !dbName) {
  console.error('Missing MONGODB_URI or MONGODB_DB in environment. Please set them in your .env file.');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);

    // Roles
    const rolesCol = db.collection('roles');
    const existingRootRole = await rolesCol.findOne({ name: 'root' });
    if (!existingRootRole) {
      await rolesCol.insertOne({ name: 'root', permissions: ['*'], createdAt: new Date() });
      console.log('Inserted role: root');
    } else {
      console.log('Role root already exists');
    }

    const existingEditor = await rolesCol.findOne({ name: 'editor' });
    if (!existingEditor) {
      await rolesCol.insertOne({ name: 'editor', permissions: ['documents:write', 'documents:read'], createdAt: new Date() });
      console.log('Inserted role: editor');
    }

    const existingViewer = await rolesCol.findOne({ name: 'viewer' });
    if (!existingViewer) {
      await rolesCol.insertOne({ name: 'viewer', permissions: ['documents:read'], createdAt: new Date() });
      console.log('Inserted role: viewer');
    }

    // Users
    const users = db.collection('users');
    const existingRootUser = await users.findOne({ email: rootEmail });
    if (!existingRootUser) {
      const passwordHash = await bcrypt.hash(rootPassword, 10);
      const res = await users.insertOne({
        email: rootEmail,
        passwordHash,
        fullName: 'Root User',
        roles: ['root'],
        createdAt: new Date(),
      });
      console.log('Inserted root user with id:', res.insertedId.toString());
    } else {
      console.log('Root user already exists:', existingRootUser._id.toString());
    }

    // Example: seed a sample document collection if desired
    const docsCol = db.collection('documents');
    const docCount = await docsCol.countDocuments();
    if (docCount === 0) {
      await docsCol.insertOne({ title: 'Welcome', content: 'This is a seeded document.', createdBy: rootEmail, createdAt: new Date() });
      console.log('Inserted sample document into documents collection');
    } else {
      console.log('Documents collection already has data, skipping sample insert');
    }

    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeder error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
