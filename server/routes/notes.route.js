import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  uploadNote,
  getNotesByPool,
  getSingleNote,
  updateNote,
  deleteNote,
} from "../controllers/notes.controller.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", protect, upload.single("file"), uploadNote);
router.get("/:poolId", protect, getNotesByPool);
router.get("/:noteId", protect, getSingleNote);
router.put("/:noteId", protect, updateNote);
router.delete("/:noteId", protect, deleteNote);
export default router;
