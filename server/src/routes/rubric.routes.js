import express from "express";
import * as rubricController from "../controllers/rubric.controller.js";

const router = express.Router();

/**
 * @route   POST /api/rubric/generate
 * @desc    Generate a complete rubric from assignment details
 * @access  Public
 */
router.post("/generate", rubricController.generateRubric);

/**
 * @route   POST /api/rubric/regenerate-cell
 * @desc    Regenerate a single cell in the rubric
 * @access  Public
 */
router.post("/regenerate-cell", rubricController.regenerateCell);

/**
 * @route   POST /api/rubric/regenerate-row
 * @desc    Regenerate an entire row (category) in the rubric
 * @access  Public
 */
router.post("/regenerate-row", rubricController.regenerateRow);

export default router;
