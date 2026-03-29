import { generateJoinCode } from "../utils/generateCode.js";
import pool from "../config/db.js";

export const createPoolService = async ({
  poolname,
  pooldescription,
  userId,
}) => {
  let newPool;
  let attempts = 0;

  while (attempts < 5) {
    try {
      const joincode = generateJoinCode();

      const result = await pool.query(
        `INSERT INTO pools (poolname, pooldescription, authorid, joincode)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [poolname, pooldescription, userId, joincode],
      );

      newPool = result.rows[0];
      break; // success → exit loop
    } catch (err) {
      // check if unique constraint failed
      if (err.code === "23505") {
        attempts++;
        continue; // try again
      }
      throw err; // other errors
    }
  }

  if (!newPool) {
    throw new Error("Failed to generate unique join code");
  }

  // add to poolmembers
  await pool.query(
    `INSERT INTO poolmembers (userid, poolid)
     VALUES ($1, $2)`,
    [userId, newPool.id],
  );

  // create token row
  await pool.query(
    `INSERT INTO tokens (userid, poolid, tokens)
     VALUES ($1, $2, $3)`,
    [userId, newPool.id, 0],
  );

  return newPool;
};

export const joinPoolService = async ({ joincode, userId }) => {
  // 1. find pool
  const poolResult = await pool.query(
    "SELECT * FROM pools WHERE joincode = $1",
    [joincode],
  );

  if (poolResult.rows.length === 0) {
    throw new Error("Invalid join code");
  }

  const poolData = poolResult.rows[0];

  // 2. check if already member
  const memberCheck = await pool.query(
    "SELECT * FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolData.id],
  );

  if (memberCheck.rows.length > 0) {
    throw new Error("Already joined this pool");
  }

  // 3. add to poolmembers
  await pool.query("INSERT INTO poolmembers (userid, poolid) VALUES ($1, $2)", [
    userId,
    poolData.id,
  ]);

  // 4. create token row
  await pool.query(
    "INSERT INTO tokens (userid, poolid, tokens) VALUES ($1, $2, $3)",
    [userId, poolData.id, 0],
  );

  return poolData;
};

export const getUserPoolsService = async (userId) => {
  const result = await pool.query(
    `SELECT p.*
     FROM pools p
     JOIN poolmembers pm ON p.id = pm.poolid
     WHERE pm.userid = $1`,
    [userId],
  );

  return result.rows;
};