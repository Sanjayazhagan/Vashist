import pool from "../config/db.js";

export const getDashboardService = async (userId) => {
  // 1. get user
  const userResult = await pool.query(
    "SELECT id, email FROM users WHERE id = $1",
    [userId],
  );

  const user = userResult.rows[0];

  // 2. get pools + tokens
  const poolsResult = await pool.query(
    `SELECT 
        p.id AS poolid,
        p.poolname,
        t.tokens,
        t.expiresat
     FROM poolmembers pm
     JOIN pools p ON pm.poolid = p.id
     LEFT JOIN tokens t 
       ON t.poolid = p.id AND t.userid = pm.userid
     WHERE pm.userid = $1`,
    [userId],
  );

  return {
    user,
    pools: poolsResult.rows,
  };
};

export const getPoolDetailsService = async (userId, poolId) => {
  // 1. check if user is part of pool
  const memberCheck = await pool.query(
    "SELECT * FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  if (memberCheck.rows.length === 0) {
    throw new Error("Not a member of this pool");
  }

  // 2. get pool + token details
  const result = await pool.query(
    `SELECT 
        p.id AS poolid,
        p.poolname,
        p.pooldescription,
        t.tokens,
        t.expiresat
     FROM pools p
     LEFT JOIN tokens t 
       ON t.poolid = p.id AND t.userid = $1
     WHERE p.id = $2`,
    [userId, poolId],
  );

  return result.rows[0];
};