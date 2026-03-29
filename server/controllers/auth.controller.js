import {
  signupUser,
  loginUser,
  verifyEmail,
  refreshAccessToken,
  logoutUser,
} from "../services/auth.service.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  try {
    const user = await signupUser(req.body);

    res.status(201).json({
      message: "Signup successful. Please check your email to verify.",
      user,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const signin = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await loginUser(req.body);

    // set refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // true when deployed (https)
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const verify = async (req, res) => {
  try {
    const message = await verifyEmail(req.params.token);

    res.status(200).send(message);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const accessToken = await refreshAccessToken(token);

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.json({ message: "Already logged out" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    await logoutUser(decoded.userId);

    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
