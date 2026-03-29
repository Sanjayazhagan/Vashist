import pool from "../config/db.js";
import bcrypt from "bcrypt";

const seed = async () => {
  try {
    console.log("🌱 Seeding database...");

    // 🧹 clear tables
    await pool.query(`
      TRUNCATE users, pools, poolmembers, tokens, notes, chat, qa 
      RESTART IDENTITY CASCADE
    `);

    // 🔐 hash passwords
    const password1 = await bcrypt.hash("password123", 10);
    const password2 = await bcrypt.hash("password123", 10);

    // 👤 USERS
    const user1 = await pool.query(
      `INSERT INTO users (email, password, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ["user1@gmail.com", password1, "active"],
    );

    const user2 = await pool.query(
      `INSERT INTO users (email, password, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ["user2@gmail.com", password2, "active"],
    );

    const user1Id = user1.rows[0].id;
    const user2Id = user2.rows[0].id;

    // 🏫 POOL
    const poolRes = await pool.query(
      `INSERT INTO pools (poolname, pooldescription, authorid)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ["DBMS Pool", "All DBMS notes", user1Id],
    );

    const poolId = poolRes.rows[0].id;

    // 👥 POOL MEMBERS
    await pool.query(
      `INSERT INTO poolmembers (userid, poolid)
       VALUES ($1, $2), ($3, $4)`,
      [user1Id, poolId, user2Id, poolId],
    );

    // 💰 TOKENS (INTEGER UNITS: 10 = 1 token)
    await pool.query(
      `INSERT INTO tokens (userid, poolid, tokens, expiresat)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 days'),
              ($4, $5, $6, NOW() + INTERVAL '10 days')`,
      [user1Id, poolId, 50, user2Id, poolId, 30], // 5.0 & 3.0 tokens
    );

    // 📚 NOTES
    await pool.query(
      `INSERT INTO notes (userid, poolid, name, data, tokengiven)
       VALUES 
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10)`,
      [
        user1Id,
        poolId,
        "DBMS Unit 1",
        "Normalization basics...",
        20,
        user2Id,
        poolId,
        "DBMS Unit 2",
        "Transactions and ACID...",
        15,
      ],
    );

    // 💬 CHAT
    const chat1 = await pool.query(
      `INSERT INTO chat (userid, poolid, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user1Id, poolId, "DBMS Doubts"],
    );

    const chatId = chat1.rows[0].id;

    // ❓ Q&A
    await pool.query(
      `INSERT INTO qa (groupid, question, answer)
       VALUES 
       ($1, $2, $3),
       ($4, $5, $6)`,
      [
        chatId,
        "What is normalization?",
        "Normalization reduces redundancy.",
        chatId,
        "What is 2NF?",
        "Second Normal Form removes partial dependency.",
      ],
    );

    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seed();
