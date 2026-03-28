import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai'; // ✅ Direct SDK
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
export const index = pc.index(process.env.PINECONE_INDEX);

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ Direct SDK — bypasses LangChain's hardcoded v1beta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const llm = {
  invoke: async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return { content: result.response.text() };
      } catch (err) {
        if (err.status === 429 && attempt < 3) {
          console.log(`⏳ Rate limited, retrying in 40s... (attempt ${attempt}/3)`);
          await new Promise(r => setTimeout(r, 40000));
        } else throw err;
      }
    }
  }
};