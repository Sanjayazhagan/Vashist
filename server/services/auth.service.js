import pool from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "./mail.service.js";
import jwt from "jsonwebtoken";

export const signupUser = async ({ email, password }) => {
  // check if user exists
  const existingUser = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );

  if (existingUser.rows.length > 0) {
    throw new Error("User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // insert user (status = pending)
  const result = await pool.query(
    `INSERT INTO users (email, password, status, verificationtoken)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, status`,
    [email, hashedPassword, "pending", verificationToken],
  );

  // send email
  await sendVerificationEmail(email, verificationToken);

  return result.rows[0];
};

export const loginUser = async ({ email, password }) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  // check verification
  if (user.status !== "active") {
    throw new Error("Please verify your email first");
  }

  // check password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // generate tokens
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  // store refresh token in DB
  await pool.query("UPDATE users SET refreshtoken = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  return { user, accessToken, refreshToken };
};
export const verifyEmail = async (token) => {
  // find user with this token
  const result = await pool.query(
    "SELECT * FROM users WHERE verificationtoken = $1",
    [token],
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired token");
  }

  const user = result.rows[0];

  // update user
  await pool.query(
    `UPDATE users 
     SET status = $1, verificationtoken = NULL 
     WHERE id = $2`,
    ["active", user.id],
  );

  return "Email verified successfully";
};

export const refreshAccessToken = async (token) => {
  if (!token) {
    throw new Error("No refresh token");
  }

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    decoded.userId,
  ]);

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  // match token with DB
  if (user.refreshtoken !== token) {
    throw new Error("Invalid refresh token");
  }

  const newAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  return newAccessToken;
};

export const logoutUser = async (userId) => {
  await pool.query("UPDATE users SET refreshtoken = NULL WHERE id = $1", [
    userId,
  ]);
};