
import pool from "../config/db.js";

// ── Upload Note ───────────────────────────────────────────────────────────────
export const uploadNoteService = async ({ userId, poolId, name, data, tokensGiven }) => {
  // 1. Check membership
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId]
  );
  if (memberCheck.rows.length === 0) {
    throw new Error("You are not a member of this pool");
  }

  // 2. Insert note
  const noteRes = await pool.query(
    `INSERT INTO notes (userid, poolid, name, data, tokengiven)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, poolId, name, data, tokensGiven]
  );

  // 3. Update token balance — only if tokens were awarded
  if (tokensGiven > 0) {
    await pool.query(
      `UPDATE tokens
       SET tokens = tokens + $1,
           expiresat = NOW() + INTERVAL '10 days'
       WHERE userid = $2 AND poolid = $3`,
      [tokensGiven, userId, poolId]
    );
  }

  return noteRes.rows[0];
};

// ── Get Notes By Pool ─────────────────────────────────────────────────────────
export const getNotesByPoolService = async ({ userId, poolId }) => {
  // 1. Check membership
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId]
  );
  if (memberCheck.rows.length === 0) {
    throw new Error("You are not a member of this pool");
  }

  // 2. Fetch all notes in pool
  const result = await pool.query(
    `SELECT id, userid, poolid, name, data, tokengiven, createdat
     FROM notes
     WHERE poolid = $1
     ORDER BY id DESC`,
    [poolId]
  );

  return result.rows;
};

// ── Get Single Note ───────────────────────────────────────────────────────────
export const getSingleNoteService = async ({ userId, noteId }) => {
  // 1. Fetch note
  const result = await pool.query(
    `SELECT n.id, n.userid, n.poolid, n.name, n.data, n.tokengiven, n.createdat
     FROM notes n
     INNER JOIN poolmembers pm ON pm.poolid = n.poolid AND pm.userid = $1
     WHERE n.id = $2`,
    [userId, noteId]
  );

  if (result.rows.length === 0) {
    throw new Error("Note not found or you don't have access");
  }

  return result.rows[0];
};

// ── Update Note ───────────────────────────────────────────────────────────────
export const updateNoteService = async ({ userId, noteId, data, name }) => {
  // 1. Make sure user owns the note
  const ownerCheck = await pool.query(
    "SELECT 1 FROM notes WHERE id = $1 AND userid = $2",
    [noteId, userId]
  );
  if (ownerCheck.rows.length === 0) {
    throw new Error("Note not found or you don't have permission to update it");
  }

  // 2. Build update dynamically — only update fields that were provided
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
  if (data !== undefined) { fields.push(`data = $${idx++}`); values.push(data); }

  if (fields.length === 0) throw new Error("No fields to update");

  values.push(noteId); // last param for WHERE

  const result = await pool.query(
    `UPDATE notes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  return result.rows[0];
};

// ── Delete Note ───────────────────────────────────────────────────────────────
export const deleteNoteService = async ({ userId, noteId }) => {
  // 1. Make sure user owns the note
  const ownerCheck = await pool.query(
    "SELECT 1 FROM notes WHERE id = $1 AND userid = $2",
    [noteId, userId]
  );
  if (ownerCheck.rows.length === 0) {
    throw new Error("Note not found or you don't have permission to delete it");
  }

  // 2. Delete
  await pool.query("DELETE FROM notes WHERE id = $1", [noteId]);
};
