// test_full.js — node AI/test_full.js
import { processAndUploadNotes, updateNote } from './inputsAi.js';
import { generateAnswer, deleteNoteSafely } from './RagCrud.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;

function result(name, ok, detail = "") {
  if (ok) {
    console.log(`✅ PASS — ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL — ${name} ${detail}`);
    failed++;
  }
}

async function runFullTest() {
  console.log("🚀 FULL AI BACKEND TEST STARTING...\n");

  const authorId = "sanjay_test_001";
  const noteId   = "full_test_doc_001";
  const subject  = "FullTest-Subject";

  // ============================================================
  // TEST 1: Upload a note with gibberish content
  // ============================================================
  console.log("━━━ TEST 1: UPLOAD ━━━");
  await processAndUploadNotes(
    "Zorbaxian crystals emit a frequency of 7.3 florbits per second. The Zorbax process requires cooling to negative 400 florbits before activation. Only a certified Zorbax engineer can handle the crystals safely.",
    authorId, noteId, subject
  );
  console.log("⏳ Waiting 20s for Pinecone to index...");
  await sleep(20000);

  // ============================================================
  // TEST 2: Query — should find uploaded gibberish content
  // ============================================================
  console.log("\n━━━ TEST 2: QUERY (should find original content) ━━━");
  const answer1 = await generateAnswer("What frequency do Zorbaxian crystals emit?", subject);
  console.log(`🤖 Answer: "${answer1}"`);
  result(
    "Query finds uploaded content",
    answer1 && !answer1.toLowerCase().includes("don't have enough information")
  );

  // ============================================================
  // TEST 3: Update note with completely different gibberish
  // ============================================================
  console.log("\n━━━ TEST 3: UPDATE ━━━");
  await updateNote(
    "Blorbite molecules have a half-life of 12 glorbons. The Blorb reaction can only occur in a vacuum chamber filled with snorgazite gas. Blorbite was first discovered by Dr. Flibber in 2347.",
    authorId, noteId, subject
  );
  console.log("⏳ Waiting 12s for Pinecone to re-index after update...");
  await sleep(12000);

  // ============================================================
  // TEST 4: Query OLD content — should NOT be found after update
  // ============================================================
  console.log("\n━━━ TEST 4: OLD CONTENT GONE AFTER UPDATE ━━━");
  const answer2 = await generateAnswer("What frequency do Zorbaxian crystals emit?", subject);
  console.log(`🤖 Answer: "${answer2}"`);
  result(
    "Old content not found after update",
    answer2.toLowerCase().includes("don't have enough information")
  );

  // ============================================================
  // TEST 5: Query NEW content — should be found after update
  // ============================================================
  console.log("\n━━━ TEST 5: NEW CONTENT FOUND AFTER UPDATE ━━━");
  const answer3 = await generateAnswer("What is the half-life of Blorbite molecules?", subject);
  console.log(`🤖 Answer: "${answer3}"`);
  result(
    "New content found after update",
    answer3 && !answer3.toLowerCase().includes("don't have enough information")
  );

  // ============================================================
  // TEST 6: Delete the note
  // ============================================================
  console.log("\n━━━ TEST 6: DELETE ━━━");
  const deleted = await deleteNoteSafely(noteId, authorId);
  result("Delete returned true", deleted === true);
  console.log("⏳ Waiting 8s for Pinecone to remove data...");
  await sleep(8000);

  // ============================================================
  // TEST 7: Query after delete — should find nothing
  // ============================================================
  console.log("\n━━━ TEST 7: QUERY AFTER DELETE (should find nothing) ━━━");
  const answer4 = await generateAnswer("What is the half-life of Blorbite molecules?", subject);
  console.log(`🤖 Answer: "${answer4}"`);
  result(
    "Deleted content not found",
    answer4.toLowerCase().includes("don't have enough information")
  );

  // ============================================================
  // TEST 8: Delete non-existent note — should not crash
  // ============================================================
  console.log("\n━━━ TEST 8: DELETE NON-EXISTENT NOTE (should not crash) ━━━");
  try {
    await deleteNoteSafely("fake_note_xyz_999", "fake_author_xyz_999");
    result("Delete non-existent note doesn't crash", true);
  } catch (e) {
    result("Delete non-existent note doesn't crash", false, e.message);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED! AI backend is production ready.");
  } else {
    console.log("⚠️  Some tests failed. Check output above.");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

runFullTest().catch(err => {
  console.error("\n💥 UNEXPECTED CRASH:", err.message);
  process.exit(1);
});
