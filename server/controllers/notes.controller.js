import {
  uploadNoteService,
  getNotesByPoolService,
  getSingleNoteService,
  updateNoteService,
  deleteNoteService,
} from "../services/notes.service.js";

import { extractTextFromBinary, processAndUploadNotes, updateNote as updateNoteVectors } from "../AI/inputsAi.js";
import { evaluateNoteQuality } from "../AI/noteQuality.js";
import { generateAnswer, deleteNoteSafely } from "../AI/RagCrud.js";

// ── Upload Note ───────────────────────────────────────────────────────────────
export const uploadNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { poolId, name } = req.body;

    if (!poolId || !name || !req.file) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    poolId = Number(poolId);

    // 1. Extract text from uploaded file buffer using Gemini
    //    req.file.buffer is available because multer uses memoryStorage()
    const extractedText = await extractTextFromBinary(
      req.file.buffer,
      req.file.mimetype
    );

    console.log("text extracted successfully!");

    // 2. Evaluate quality and determine token reward (0–5)
    const evaluation = await evaluateNoteQuality(extractedText);
    const tokensGiven = evaluation.tokens;

    console.log("evaluated", evaluation.tokens);

    // 3. Save to DB
    const note = await uploadNoteService({
      userId,
      poolId,
      name,
      data: extractedText,
      tokensGiven,
    });

    // 4. Fire-and-forget: chunk + upsert to Pinecone in background
    //    subject = String(poolId) — used as the filter key in generateAnswer()
    processAndUploadNotes(extractedText, userId, note.id, String(poolId));


    // 5. Respond immediately — don't wait for Pinecone
    res.status(201).json({
      id:           note.id,
      name:         note.name,
      poolId:       note.poolid,
      tokensEarned: note.tokengiven,
      grade:        evaluation.tokens * 20, // 0–5 tokens → 0–100%
      reason:       evaluation.reason,
      createdAt:    note.createdat,
    });

  } catch (err) {
    console.error("❌ uploadNote error:", err);
    res.status(400).json({ error: err.message });
  }
};

// ── Get Notes By Pool ─────────────────────────────────────────────────────────
export const getNotesByPool = async (req, res) => {
  try {
    const userId = req.user.userId;
    const poolId = Number(req.params.poolId);

    const notes = await getNotesByPoolService({ userId, poolId });

    res.status(200).json(
      notes.map((n) => ({
        id:           n.id,
        name:         n.name,
        poolId:       n.poolid,
        tokensEarned: n.tokengiven,
        createdAt:    n.createdat,
      }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── Get Single Note ───────────────────────────────────────────────────────────
export const getSingleNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);

    const note = await getSingleNoteService({ userId, noteId });

    res.status(200).json({
      id:           note.id,
      name:         note.name,
      poolId:       note.poolid,
      data:         note.data,
      tokensEarned: note.tokengiven,
      createdAt:    note.createdat,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── Update Note ───────────────────────────────────────────────────────────────
export const updateNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);
    const { data, name } = req.body;

    const updatedNote = await updateNoteService({ userId, noteId, data, name });

    // Fire-and-forget: replace old Pinecone vectors with updated content
    if (data) {
      updateNoteVectors(data, String(userId), String(noteId), String(updatedNote.poolid));
    }

    res.status(200).json({
      id:        updatedNote.id,
      name:      updatedNote.name,
      poolId:    updatedNote.poolid,
      createdAt: updatedNote.createdat,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── Delete Note ───────────────────────────────────────────────────────────────
export const deleteNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);

    // 1. Delete vectors from Pinecone first
    await deleteNoteSafely(String(noteId), String(userId));

    // 2. Delete from DB
    await deleteNoteService({ userId, noteId });

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ── Ask Question ──────────────────────────────────────────────────────────────
// Called by your chats controller for POST /api/chats/:chatId/ask
// subject = String(poolId) — must match what was used during upload
export const askQuestion = async (req, res) => {
  try {
    const { question, poolId } = req.body;

    if (!question || !poolId) {
      return res.status(400).json({ error: "question and poolId are required" });
    }

    const answer = await generateAnswer(question, String(poolId));

    res.status(200).json({ answer });
  } catch (err) {
    console.error("❌ askQuestion error:", err);
    res.status(500).json({ error: err.message });
  }
};
