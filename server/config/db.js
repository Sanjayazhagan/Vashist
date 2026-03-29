import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add this if your deployment provider (like Render/Heroku) requires SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
