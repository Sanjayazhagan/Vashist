import express from "express";
import { createPool, joinPool, getUserPools } from "../controllers/pool.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createPool);
router.post("/join", protect, joinPool);

router.get("/", protect, getUserPools);

export default router;
