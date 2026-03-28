import express from "express";
import {
  createChat,
  getChats,
  getChatHistory,
  askQuestion,
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";


const router = express.Router();
router.post("/", protect, createChat);

router.get("/", protect, getChats);

router.get("/:chatId", protect, getChatHistory);

router.post("/:chatId/ask", protect, askQuestion);

export default router;