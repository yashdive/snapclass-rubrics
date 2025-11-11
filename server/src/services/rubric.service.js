import * as ragService from "./rag.service.js";
import * as promptService from "./prompt.service.js";
import * as aiService from "./ai.service.js";

/**
 * Generate a complete rubric
 */
export const generateRubric = async (title, description, question) => {
  try {
    console.log("[Rubric Service] Starting rubric generation...");

    // Get document splits and perform search
    const splits = await ragService.getDocumentSplits();
    const searchResults = await ragService.performSimilaritySearch(
      question,
      title,
      description
    );

    // Build context from search results
    const context = ragService.buildContext(searchResults);

    // Generate prompt
    const prompt = await promptService.generateRubricPrompt(
      context,
      title,
      description,
      question
    );

    // Generate rubric using AI
    const rubric = await aiService.generateCompletion(prompt);

    console.log("[Rubric Service] Rubric generation complete.");
    return rubric;
  } catch (error) {
    console.error("[Rubric Service] Error generating rubric:", error);
    throw error;
  }
};

/**
 * Regenerate a single cell in the rubric
 */
export const regenerateCell = async (
  title,
  description,
  categoryName,
  categoryReasoning,
  allObjectives,
  existingObjective,
  instruction
) => {
  try {
    console.log("[Rubric Service] Starting cell regeneration...");

    // Perform search
    const searchResults = await ragService.performSimilaritySearch(
      instruction || categoryName,
      title,
      description
    );

    // Build context
    const context = ragService.buildContext(searchResults);

    // Generate prompt
    const prompt = await promptService.generateCellPrompt(
      context,
      title,
      description,
      categoryName,
      categoryReasoning,
      allObjectives,
      existingObjective,
      instruction
    );

    // Generate new objective
    const result = await aiService.generateCompletion(prompt);

    console.log("[Rubric Service] Cell regeneration complete.");
    return result;
  } catch (error) {
    console.error("[Rubric Service] Error regenerating cell:", error);
    throw error;
  }
};

/**
 * Regenerate an entire row (category) in the rubric
 */
export const regenerateRow = async (
  title,
  description,
  categoryName,
  categoryReasoning,
  objectives,
  instruction
) => {
  try {
    console.log("[Rubric Service] Starting row regeneration...");

    // Perform search
    const searchResults = await ragService.performSimilaritySearch(
      instruction || categoryName,
      title,
      description
    );

    // Build context
    const context = ragService.buildContext(searchResults);

    // Generate prompt
    const prompt = await promptService.generateRowPrompt(
      context,
      title,
      description,
      categoryName,
      categoryReasoning,
      objectives,
      instruction
    );

    // Generate new objectives
    const result = await aiService.generateCompletion(prompt);

    console.log("[Rubric Service] Row regeneration complete.");

    // Normalize output to an array of objectives
    const objectivesOut = Array.isArray(result?.objectives)
      ? result.objectives
      : Array.isArray(result)
      ? result
      : [];

    return objectivesOut;
  } catch (error) {
    console.error("[Rubric Service] Error regenerating row:", error);
    throw error;
  }
};

export default {
  generateRubric,
  regenerateCell,
  regenerateRow,
};
