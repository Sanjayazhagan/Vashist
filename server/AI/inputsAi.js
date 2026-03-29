import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { HumanMessage } from '@langchain/core/messages';
import { index, embeddings, llm } from './aiConfig.js';

/**
 * FUNCTION 1: Extracts raw text from an uploaded image/PDF buffer.
 * Your Express route MUST 'await' this.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function extractTextFromBinary(buffer, mimeType) {
  try {
    console.log(`👀 Gemini is extracting text from ${mimeType}...`);
    const base64String = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64String,
        },
      },
      {
        text: `You are a highly accurate document extraction tool. Extract the text from the attached document and format it using clean Markdown. 
            
            Strict Rules:
            - Preserve the visual structure (headers, bullet points, bold text).
            - IF YOU SEE A DIAGRAM, GRAPH, OR DRAWING: Insert a blockquote starting with "> **[Diagram Description]:**" and write a highly detailed, educational explanation of exactly what the image shows and how the parts connect.
            - IF YOU SEE A DATA TABLE: Recreate it perfectly using standard Markdown table syntax.
            - Do not add conversational filler. Do not wrap the final output in a markdown code block (\`\`\`markdown).`,
      },
    ]);

    const response = result.response.text();
    console.log("✅ Text successfully extracted!");
    return response;
  } catch (error) {
    console.error("❌ Extraction error:", error);
    throw error;
  }
}

/**
 * FUNCTION 2: Chunks and uploads the notes to Pinecone.
 * Your Express route SHOULD NOT 'await' this (Fire and Forget in the background).
 */
export async function processAndUploadNotes(rawText, authorId, noteId, subject) {
  try {
    console.log("🛠️ Ingestion started for:", noteId);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 200
    });

    const docs = await splitter.createDocuments([rawText]);
    console.log(`✂️ Split into ${docs.length} chunks.`);

    const records = [];

    for (let i = 0; i < docs.length; i++) {
      const textChunk = docs[i].pageContent;

      console.log(`🧠 Requesting embedding for chunk ${i}...`);
      const rawEmbedding = await embeddings.embedQuery(textChunk);
      const values = Array.from(rawEmbedding); // ✅ Force plain JS array

      if (values && values.length > 0) {
        records.push({
          id: `${noteId}_chunk_${i}`,
          values,
          metadata: {
            authorId: String(authorId),
            noteId:   String(noteId),
            subject:  String(subject),
            text:     textChunk,
          },
        });
      } else {
        console.error(`⚠️ Chunk ${i} failed to generate an embedding!`);
      }
    }

    console.log(`📊 Final Record Count to Upload: ${records.length}`);

    if (records.length > 0) {
      console.log("☁️ Sending to Pinecone...");
      await index.upsert({ records }); // ✅ Fixed for SDK v7
      console.log("✅ Pinecone Upsert Successful!");
    } else {
      console.error("❌ ABORTING: No records created. Check aiConfig.js setup.");
    }

  } catch (error) {
    console.error("❌ Ingestion Error Log:", error);
  }
}

/**
 * FUNCTION 3: Updates an existing note by replacing the old chunks with new ones.
 * Your Express route SHOULD NOT 'await' this (Fire and Forget).
 */
export async function updateNote(newRawText, authorId, noteId, subject) {
  try {
    console.log(`🔄 Background: Updating note ${noteId}...`);

    console.log("1. Wiping old data...");
    await index.deleteMany({
      filter: {
        noteId:   { "$eq": noteId },
        authorId: { "$eq": authorId }
      }
    });

    // ✅ Wait for Pinecone to finish deleting before upserting new content
    await new Promise(r => setTimeout(r, 4000));

    console.log("2. Processing and uploading new data...");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 200,
    });
    const chunks = await splitter.createDocuments([newRawText]);

    const records = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].pageContent;
      const values = Array.from(await embeddings.embedQuery(chunkText));
      records.push({
        id: `${noteId}_chunk_${i}`,
        values,
        metadata: {
          authorId: String(authorId),
          noteId:   String(noteId),
          subject:  String(subject),
          text:     chunkText,
        },
      });
    }

    await index.upsert({ records });
    console.log(`✅ Update Upsert Successful! (${records.length} records)`); // ✅ add this
    console.log("✅ Background Update Complete!");

  } catch (error) {
    console.error("❌ Update error:", error);
  }
}