import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

dotenv.config();

import pool from "./config/db.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  }),
);

app.use(express.json());

// --- 1. Bulletproof Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My AI App API",
      version: "1.0.0",
      description: "API documentation for our Express + LangChain backend",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    paths: {
      "/api/chat": {
        post: {
          summary: "Send a message to the AI",
          description: "Accepts a user message and returns the AI response.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Hello AI!",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      reply: {
                        type: "string",
                        example: "hi",
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: "Server error",
            },
          },
        },
      },
    },
  },
  apis: [], // We leave this empty because we defined paths directly above
};

// --- 2. Initialize Swagger ---
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- 3. Your API Routes ---
app.post("/api/chat", async (req, res) => {
  try {
    // Just sending our test string for now
    res.json({ reply: "hi" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 API Docs available at http://localhost:${PORT}/docs`);
});

console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("TYPE:", typeof process.env.DB_PASSWORD);

pool
  .connect()
  .then(() => console.log("DB connected ✅"))
  .catch((err) => console.error("DB connection error ❌", err));



//cookie
import cookieParser from "cookie-parser";

app.use(cookieParser());

//routes
import authRoutes from "./routes/auth.routes.js";

app.use("/api/auth", authRoutes);

import poolRoutes from "./routes/pool.routes.js";

app.use("/api/pools", poolRoutes);

import userRoutes from "./routes/user.routes.js";

app.use("/api/users", userRoutes);

import chatRoutes from "./routes/chat.routes.js";

app.use("/api/chats", chatRoutes);

import notesRoutes from "./routes/notes.route.js";

app.use("/api/notes", notesRoutes);



