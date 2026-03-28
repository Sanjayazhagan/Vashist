import { index, embeddings, llm } from './aiConfig.js';

/**
 * FUNCTION 4: Answers questions based on the entire study group's notes for a subject.
 * ⚠️ Your teammate MUST 'await' this in the Express route.
 */
export async function generateAnswer(question, subject) {
  try {
    console.log(`🔍 Searching collaborative notes for: "${question}" in ${subject}`);

    const queryVec = Array.from(await embeddings.embedQuery(question)); // ✅ Force plain JS array

    const queryResponse = await index.query({
      vector: queryVec,
      topK: 5,
      filter: {
        subject: { "$eq": subject }
      },
      includeMetadata: true
    });

    const retrievedNotes = queryResponse.matches.map(match => match.metadata.text);
    const combinedNotes = retrievedNotes.join("\n\n---\n\n");

    const prompt = `
      You are an AI teaching assistant for a collaborative class. 
      Answer the user's question using ONLY the provided student-contributed notes below.
      If the notes conflict, synthesize the best answer or point out the different perspectives.
      If the answer isn't in these notes, say "I don't have enough information in the class notes to answer that."

      COLLABORATIVE CLASS NOTES:
      ${combinedNotes}

      QUESTION: ${question}
    `;

    console.log("🤖 Synthesizing the final answer...");
    const response = await llm.invoke(prompt);

    return response.content;

  } catch (error) {
    console.error("❌ Generation error:", error);
    throw error;
  }
}

/**
 * FUNCTION 5: Deletes a specific note from the database safely.
 * ⚠️ Your teammate MUST 'await' this so they can tell the user it was deleted.
 */
export async function deleteNoteSafely(noteId, authorId) {
  try {
    console.log(`🗑️ Attempting to delete note ${noteId}...`);

    await index.deleteMany({
      filter: {
        noteId:   { "$eq": noteId },
        authorId: { "$eq": authorId }
      }
    });

    console.log("✅ Note successfully deleted!");
    return true;

  } catch (error) {
    console.error("❌ Deletion error:", error);
    throw error;
  }
}
