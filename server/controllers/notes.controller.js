import {
  uploadNoteService,
  getNotesByPoolService,
  getSingleNoteService,
  updateNoteService,
  deleteNoteService,
} from "../services/notes.service.js";

export const uploadNote = async (req, res) => {
  try {
    const userId = req.user.userId;

    let { poolId, name } = req.body;

    if (!poolId || !name || !req.file) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    poolId = Number(poolId);

    // placeholder AI output
    const extractedText = "Dummy extracted text from PDF";
    const rating = 7;
    const tokensGiven = rating * 2;

    const note = await uploadNoteService({
      userId,
      poolId,
      name,
      data: extractedText,
      tokensGiven,
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getNotesByPool = async (req, res) => {
  try {
    const userId = req.user.userId;
    const poolId = Number(req.params.poolId);

    const notes = await getNotesByPoolService({ userId, poolId });

    res.status(200).json(notes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET SINGLE NOTE
export const getSingleNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);

    const note = await getSingleNoteService({ userId, noteId });

    res.status(200).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// UPDATE NOTE
export const updateNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);
    const { data, name } = req.body;

    const updatedNote = await updateNoteService({
      userId,
      noteId,
      data,
      name,
    });

    res.status(200).json(updatedNote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE NOTE
export const deleteNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const noteId = Number(req.params.noteId);

    await deleteNoteService({ userId, noteId });

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};