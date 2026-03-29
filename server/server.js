import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// ✅ All route imports at the top
import authRoutes from "./routes/auth.routes.js";
import poolRoutes from "./routes/pool.routes.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import notesRoutes from "./routes/notes.route.js";

dotenv.config();

import pool from "./config/db.js";

const app = express();

// --- CORS Configuration ---
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // ✅ Handle ALL preflight requests (regex works in all Express versions)

app.use(express.json());
app.use(cookieParser()); // ✅ Before routes

// --- Swagger Configuration ---
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
  apis: [],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- API Routes (all registered BEFORE app.listen) ---
app.post("/api/chat", async (req, res) => {
  try {
    res.json({ reply: "hi" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notes", notesRoutes);

// --- DB Connection ---
pool
  .connect()
  .then(() => console.log("DB connected ✅"))
  .catch((err) => console.error("DB connection error ❌", err));

console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("TYPE:", typeof process.env.DB_PASSWORD);

// --- Start Server (always last) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 API Docs available at http://localhost:${PORT}/docs`);
});
