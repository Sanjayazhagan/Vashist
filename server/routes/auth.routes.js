import express from "express";
import {
  signup,
  signin,
  verify,
  refresh,
  logout,
} from "../controllers/auth.controller.js";


const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);

router.get("/verify/:token", verify);

router.post("/refresh", refresh);

router.post("/logout", logout);
export default router;
