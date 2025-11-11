import { HfInference } from "@huggingface/inference";
import { config } from "../config/env.config.js";

// Initialize HfInference
const hf = new HfInference(config.hfToken);

/**
 * Extract JSON from LLM response
 */
function extractJson(raw) {
  // Remove markdown code blocks
  let cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    // Try parsing full string first
    return JSON.parse(cleaned);
  } catch {
    // Try extracting object
    const objStart = cleaned.indexOf("{");
    const objEnd = cleaned.lastIndexOf("}") + 1;
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(cleaned.slice(objStart, objEnd));
      } catch {}
    }

    // Try extracting array
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]") + 1;
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        return JSON.parse(cleaned.slice(arrStart, arrEnd));
      } catch {}
    }

    throw new Error("Could not extract valid JSON from LLM response");
  }
}

/**
 * Generate output using Hugging Face LLM
 */
export const generateCompletion = async (prompt) => {
  try {
    console.log("[AI Service] Generating completion with LLM...");

    const response = await hf.chatCompletion({
      model: config.ai.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: config.ai.temperature,
      max_tokens: config.ai.maxTokens,
      top_p: 0.9,
    });

    console.log("[AI Service] LLM response received.");
    const rawText = response.choices[0].message.content;
    console.log("[AI Service] Raw response preview:", rawText.substring(0, 200) + "...");

    const parsedJson = extractJson(rawText);
    console.log("[AI Service] JSON extracted successfully.");

    return parsedJson;
  } catch (error) {
    console.error("[AI Service] Error generating completion:", error);

    if (error.message?.includes("rate limit")) {
      throw new Error("Rate limit reached. Please wait and try again.");
    } else if (error.message?.includes("not supported")) {
      throw new Error("Model not available. Check your configuration.");
    }

    throw error;
  }
};

export default {
  generateCompletion,
};
