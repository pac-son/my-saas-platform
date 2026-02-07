import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema'; 

// 1. Force Neon to use the 'ws' package (Required for local Node.js)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env file');
}

// 2. Create a connection Pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 3. Export the DB client WITH the schema
// 👇 This enables db.query.wallets.findFirst()
export const db = drizzle(pool, { schema });