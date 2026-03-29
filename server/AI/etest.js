import { processAndUploadNotes } from './inputsAi.js';
import { generateAnswer, deleteNoteSafely } from './RagCrud.js';
import { evaluateNoteQuality } from './noteQuality.js'; // ← import from the other file

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
    console.log("🚀 STARTING AI BACKEND TEST...\n");

    const mockNoteText = "Hackathons are intense coding competitions. The most important rule of a hackathon is to stay hydrated and take screen breaks. Teams usually consist of frontend, backend, and design members.";
    const authorId = "sanjay_test_user_001";
    const noteId = "test_doc_999";
    const subject = "Hackathon-101";

    try {
        console.log("--- TEST 1: UPLOADING NOTE ---");
        await processAndUploadNotes(mockNoteText, authorId, noteId, subject);
        console.log("⏳ Waiting 5 seconds for Pinecone to index the data...\n");
        await sleep(5000);

        console.log("--- TEST 2: ASKING A QUESTION ---");
        const question = "What is the most important rule according to the notes?";
        const answer = await generateAnswer(question, subject);
        console.log("\n🤖 AI ANSWER:");
        console.log(`"${answer}"\n`);

        console.log("--- TEST 3: CLEANING UP DATABASE ---");
        await deleteNoteSafely(noteId, authorId);
        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    }
}

// --- SMOKE TEST: evaluateNoteQuality ---
console.log("--- SMOKE TEST: NOTE QUALITY EVALUATOR ---");
const result = await evaluateNoteQuality(`
  Newton's Laws of Motion:
  1. An object at rest stays at rest.
  2. F = ma
  3. Every action has an equal and opposite reaction.
`);
console.log("Result:", result);

// --- FULL PIPELINE TEST ---
await runTest();