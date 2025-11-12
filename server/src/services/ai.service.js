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

    // Handle different HuggingFace API errors with user-friendly messages
    if (error.message?.includes("rate limit") || error.statusCode === 429) {
      throw new Error("⏱️ Rate limit reached. Please wait a moment and try again.");
    } 
    
    if (error.message?.includes("quota") || error.message?.includes("insufficient_quota") || error.statusCode === 402) {
      throw new Error(
        "💳 HuggingFace API quota exceeded. The free tier has limits on usage. " +
        "Please try again later or upgrade your HuggingFace account at https://huggingface.co/pricing"
      );
    }
    
    if (error.message?.includes("not supported") || error.message?.includes("does not exist")) {
      throw new Error("🚫 The AI model is not available. Please contact the administrator.");
    }
    
    if (error.message?.includes("Invalid API token") || error.statusCode === 401 || error.statusCode === 403) {
      throw new Error("🔑 API authentication failed. Please contact the administrator.");
    }
    
    if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
      throw new Error("⏰ Request timed out. The server took too long to respond. Please try again.");
    }

    // Generic fallback with helpful message
    throw new Error(
      "❌ AI service error: " + (error.message || "Unknown error occurred") + 
      ". Please try again or contact support if the problem persists."
    );
  }
};

export default {
  generateCompletion,
};
