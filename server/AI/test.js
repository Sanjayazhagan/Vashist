import { processAndUploadNotes } from './inputsAi.js';
import { generateAnswer, deleteNoteSafely } from './RagCrud.js';

// A simple helper function to pause the script so Pinecone has time to index
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
    console.log("🚀 STARTING AI BACKEND TEST...\n");

    // --- MOCK DATA ---
    const mockNoteText = "Hackathons are intense coding competitions. The most important rule of a hackathon is to stay hydrated and take screen breaks. Teams usually consist of frontend, backend, and design members.";
    const authorId = "sanjay_test_user_001";
    const noteId = "test_doc_999";
    const subject = "Hackathon-101";

    try {
        // ==========================================
        // TEST 1: INGESTION (Chunk & Upload)
        // ==========================================
        console.log("--- TEST 1: UPLOADING NOTE ---");
        await processAndUploadNotes(mockNoteText, authorId, noteId, subject);
        
        console.log("⏳ Waiting 5 seconds for Pinecone to index the data...\n");
        await sleep(5000); 

        // ==========================================
        // TEST 2: RETRIEVAL & GENERATION (Chat)
        // ==========================================
        console.log("--- TEST 2: ASKING A QUESTION ---");
        const question = "What is the most important rule according to the notes?";
        const answer = await generateAnswer(question, subject);
        
        console.log("\n🤖 AI ANSWER:");
        console.log(`"${answer}"\n`);

        // ==========================================
        // TEST 3: DELETION (Cleanup)
        // ==========================================
        console.log("--- TEST 3: CLEANING UP DATABASE ---");
        await deleteNoteSafely(noteId, authorId);
        
        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Your AI is ready.");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    }
}

// Execute the test
runTest();