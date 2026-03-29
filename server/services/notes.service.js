import pool from "../config/db.js";

export const uploadNoteService = async ({
  userId,
  poolId,
  name,
  data,
  tokensGiven,
}) => {
  // 1. check membership
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  if (memberCheck.rows.length === 0) {
    throw new Error("You are not a member of this pool");
  }

  // 2. insert note
  const noteRes = await pool.query(
    `INSERT INTO notes (userid, poolid, name, data, tokengiven)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, poolId, name, data, tokensGiven],
  );

  // 3. update tokens
  await pool.query(
    `UPDATE tokens
     SET tokens = tokens + $1,
         expiresat = NOW() + INTERVAL '10 days'
     WHERE userid = $2 AND poolid = $3`,
    [tokensGiven, userId, poolId],
  );

  return noteRes.rows[0];
};

export const getNotesByPoolService = async ({ userId, poolId }) => {
  // 1. check membership
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, poolId],
  );

  if (memberCheck.rows.length === 0) {
    throw new Error("You are not a member of this pool");
  }

  // 2. fetch ALL notes in pool
  const result = await pool.query(
    `SELECT id, userid, name, data, tokengiven
     FROM notes
     WHERE poolid = $1
     ORDER BY id DESC`,
    [poolId],
  );

  return result.rows;
};

export const getSingleNoteService = async ({ userId, noteId }) => {
  const result = await pool.query("SELECT * FROM notes WHERE id = $1", [
    noteId,
  ]);

  if (result.rows.length === 0) {
    throw new Error("Note not found");
  }

  const note = result.rows[0];

  // check membership
  const memberCheck = await pool.query(
    "SELECT 1 FROM poolmembers WHERE userid = $1 AND poolid = $2",
    [userId, note.poolid],
  );

  if (memberCheck.rows.length === 0) {
    throw new Error("Not authorized to view this note");
  }

  return note;
};

export const updateNoteService = async ({ userId, noteId, data, name }) => {
  const result = await pool.query("SELECT * FROM notes WHERE id = $1", [
    noteId,
  ]);

  if (result.rows.length === 0) {
    throw new Error("Note not found");
  }

  const note = result.rows[0];

  if (note.userid !== userId) {
    throw new Error("Not authorized to edit this note");
  }

  const updated = await pool.query(
    `UPDATE notes
     SET data = COALESCE($1, data),
         name = COALESCE($2, name)
     WHERE id = $3
     RETURNING *`,
    [data, name, noteId],
  );

  return updated.rows[0];
};

export const deleteNoteService = async ({ userId, noteId }) => {
  const result = await pool.query("SELECT * FROM notes WHERE id = $1", [
    noteId,
  ]);

  if (result.rows.length === 0) {
    throw new Error("Note not found");
  }

  const note = result.rows[0];

  if (note.userid !== userId) {
    throw new Error("Not authorized to delete this note");
  }

  await pool.query("DELETE FROM notes WHERE id = $1", [noteId]);
};