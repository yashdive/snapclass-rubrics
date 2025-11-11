import * as rubricService from "../services/rubric.service.js";

/**
 * Generate a complete rubric
 */
export const generateRubric = async (req, res) => {
  console.log("[Rubric Controller] /generate endpoint hit");
  
  try {
    const { title = "", description = "", question = "" } = req.body;

    console.log("[Rubric Controller] Request:", { title, description, question });

    const rubric = await rubricService.generateRubric(title, description, question);

    res.json({
      data: {
        content: rubric,
      },
    });
  } catch (error) {
    console.error("[Rubric Controller] Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error",
    });
  }
};

/**
 * Regenerate a single cell
 */
export const regenerateCell = async (req, res) => {
  console.log("[Rubric Controller] /regenerate-cell endpoint hit");
  
  try {
    const {
      title,
      description,
      categoryName,
      categoryReasoning,
      allObjectives,
      existingObjective,
      instruction,
    } = req.body;

    if (!title || !description || !categoryName) {
      return res.status(400).json({
        error: "Missing required fields: title, description, categoryName",
      });
    }

    console.log("[Rubric Controller] Cell regeneration request:", {
      categoryName,
      instruction,
    });

    const result = await rubricService.regenerateCell(
      title,
      description,
      categoryName,
      categoryReasoning,
      allObjectives,
      existingObjective,
      instruction
    );

    res.json({
      data: {
        objective: result,
      },
    });
  } catch (error) {
    console.error("[Rubric Controller] Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error",
    });
  }
};

/**
 * Regenerate an entire row (category)
 */
export const regenerateRow = async (req, res) => {
  console.log("[Rubric Controller] /regenerate-row endpoint hit");
  
  try {
    const {
      title,
      description,
      categoryName,
      categoryReasoning,
      objectives,
      instruction,
    } = req.body;

    if (!title || !description || !categoryName || !Array.isArray(objectives)) {
      return res.status(400).json({
        error: "Missing required fields: title, description, categoryName, objectives[]",
      });
    }

    console.log("[Rubric Controller] Row regeneration request:", {
      categoryName,
      objectivesCount: objectives.length,
    });

    const result = await rubricService.regenerateRow(
      title,
      description,
      categoryName,
      categoryReasoning,
      objectives,
      instruction
    );

    res.json({
      data: {
        objectives: result,
      },
    });
  } catch (error) {
    console.error("[Rubric Controller] Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error",
    });
  }
};

export default {
  generateRubric,
  regenerateCell,
  regenerateRow,
};
