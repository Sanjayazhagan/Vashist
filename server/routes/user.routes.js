import express from "express";
import {
  getDashboard,
  getPoolDetails,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getDashboard);
router.get("/me/:poolId", protect, getPoolDetails);

export default router;
