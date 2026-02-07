import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load the .env file so Drizzle can find your DB URL
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts", 
  out: "./drizzle",             
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});