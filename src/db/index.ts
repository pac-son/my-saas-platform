import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// 1. Force error if the URL is missing (Safety Check)
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env file');
}

// 2. Create the SQL connection
const sql = neon(process.env.DATABASE_URL);

// 3. Export the DB client to use in your API
export const db = drizzle(sql);