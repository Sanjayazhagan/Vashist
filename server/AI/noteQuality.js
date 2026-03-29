import { llm } from './aiConfig.js'; // ✅ Single import at top of this file

/**
 * Evaluates extracted note text and awards 1–5 tokens based on quality.
 * Returns { isValid: boolean, tokens: number, reason: string }
 */
export async function evaluateNoteQuality(rawText) {
  try {
    console.log("🧐 Evaluating note quality for token reward...");

    // 1. Reject empty / tiny texts without spending an API call
    if (!rawText || rawText.trim().length < 15) {
      console.log("⚠️ Text too short. 0 tokens awarded.");
      return { isValid: false, tokens: 0, reason: "Text is too short to be a meaningful note." };
    }

    // 2. Prompt — token range is 1–5 to match your system design
    const prompt = `You are an AI academic assistant and content moderator.
Analyze the following extracted text and determine if it is a "valid educational note".

CRITERIA FOR "INVALID" (tokens: 0):
- Random keystrokes, gibberish, or keyboard smashing (e.g., "asdfghjkl", "qwerqwer").
- Spam, repetitive words, or conversational filler without educational value.
- Completely nonsensical or explicitly inappropriate content.

CRITERIA FOR "VALID" (tokens: 1 to 5):
- Contains coherent information, facts, study materials, formulas, or summaries.
- Token scaling:
  - 1 token: Very brief — a single definition or one-liner fact.
  - 2 tokens: Short but useful — a few related facts or a basic explanation.
  - 3 tokens: Medium length — decent structure and information density.
  - 4 tokens: Long and well-structured — multiple concepts covered clearly.
  - 5 tokens: Highly detailed — comprehensive study material with examples or diagrams described.

You MUST respond with ONLY a valid JSON object. No markdown formatting, no code blocks (\`\`\`json), just the raw JSON string.
Format exactly like this:
{
  "isValid": boolean,
  "tokens": number,
  "reason": "A brief 1-sentence explanation for your score."
}

--- EXTRACTED NOTES TO EVALUATE ---
${rawText}`;

    // 3. Call the LLM
    const response = await llm.invoke(prompt);

    // 4. Strip markdown fences Gemini sometimes adds anyway
    const cleanJsonString = response.content
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // 5. Parse
    const evaluation = JSON.parse(cleanJsonString);

    // 6. Fail-safe: force tokens to 0 if invalid
    if (!evaluation.isValid) {
      evaluation.tokens = 0;
    }

    // 7. ✅ Clamp tokens to valid range [0, 5] — guards against AI hallucination
    evaluation.tokens = Math.min(5, Math.max(0, Math.round(evaluation.tokens)));

    console.log(`🏅 Evaluation: ${evaluation.tokens} tokens. Reason: ${evaluation.reason}`);
    return evaluation;

  } catch (error) {
    console.error("❌ Note evaluation failed:", error);
    return {
      isValid: false,
      tokens: 0,
      reason: "Failed to evaluate note quality due to server error or unreadable AI format.",
    };
  }
}