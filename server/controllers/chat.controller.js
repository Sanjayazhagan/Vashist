import {
  createChatService,
  getChatsService,
  getChatHistoryService,
} from "../services/chat.service.js";

export const createChat = async (req, res) => {
  try {
    const userId = req.user.userId;

    let { poolId, title } = req.body;

    // basic validation
    if (!poolId) {
      return res.status(400).json({ error: "poolId is required" });
    }
    poolId = Number(poolId);
    // optional: auto title
    if (!title) {
      title = "New Chat";
    }

    const chat = await createChatService({
      userId,
      poolId,
      title,
    });

    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const chats = await getChatsService(userId);

    res.status(200).json({
      chats,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { chatId } = req.params;

    const history = await getChatHistoryService(chatId, userId);

    res.status(200).json({
      history,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

import { askQuestionService } from "../services/chat.service.js";

export const askQuestion = async (req, res) => {
  try {
    const userId = req.user.userId;
    const chatId = Number(req.params.chatId);
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await askQuestionService({
      chatId,
      userId,
      question,
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};