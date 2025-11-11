import { PromptTemplate } from "@langchain/core/prompts";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load assignment examples
const assignmentsPath = path.resolve(__dirname, "../../../data/all_assignments.json");
const assignments = JSON.parse(readFileSync(assignmentsPath, "utf8"));

// Compact examples for the prompt
const compactExamples = assignments.map((ex) =>
  ex.rubric.map((r) => ({
    category: r.category,
    criteria: r.criteria.map((c) => ({
      points: c.points,
      description: c.description,
    })),
  }))
);

const examplesJson = JSON.stringify(compactExamples, null, 2);

/**
 * Generate initial rubric prompt
 */
export const generateRubricPrompt = async (context, title, description, question) => {
  try {
    console.log("[Prompt Service] Generating rubric prompt...");

    const prompt = PromptTemplate.fromTemplate(`
You are an expert rubric generator. 
Your task is to create grading rubrics for coding/design assignments. 

--- CONTEXT (Manual) ---
{context}

--- LEARN FROM EXAMPLES ---
{examples}

--- NOW APPLY THE PATTERN TO THE NEW ASSIGNMENT BELOW ---
Rubric Title: {title}
Rubric Description: {description}
Assignment : {question}

--- REQUIREMENTS ---
1. Follow the JSON structure shown below exactly:

    {{
            "title": "<Rubric Title>",
    "description": [
      "<Description >",
    

    "rubrics" : [       {{
    "category": "<Category Name>",
    "rubrics": [
      {{ "score": "<points>", "description": "<criteria>" }},
      {{ "score": "<points>", "description": "<criteria>" }}
    ]
  }},
   "category": "<Category Name>",
    "rubrics": [
      {{ "score": "<points>", "description": "<criteria>" }},
      {{ "score": "<points>", "description": "<criteria>" }}
    ]
  }}, ...

        ]
    }}

You must adapt categories and criteria directly to the given assignment context. 
Do not reuse category names from examples unless the assignment clearly requires them.
Assign higher point values to criteria that require more work, complexity, or difficulty. Assign lower point values to easier or partial work.
Ensure every category has multiple scoring levels.
Ensure within each category the "rubrics" list is sorted from highest "score" (most complete and correct work) to lowest "score" (least complete/incorrect/incomplete work).
Use the exact same set of "score" values across ALL categories so table columns align; do not create category-specific point scales. If needed, normalize each category to this shared set and preserve descending order.
Send only the array of objects, do not include any additional text or explanations.

Now generate the rubric:
`);

    const formattedPrompt = await prompt.format({
      context,
      examples: examplesJson,
      title,
      description,
      question: question || "No additional requirements",
    });

    console.log("[Prompt Service] Rubric prompt generated.");
    return formattedPrompt;
  } catch (error) {
    console.error("[Prompt Service] Error generating rubric prompt:", error);
    throw error;
  }
};

/**
 * Generate cell regeneration prompt
 */
export const generateCellPrompt = async (
  context,
  title,
  description,
  categoryName,
  categoryReasoning,
  allObjectives,
  existingObjective,
  instruction
) => {
  try {
    console.log("[Prompt Service] Generating cell regeneration prompt...");

    // Sort objectives by points (descending)
    const sortedObjectives = [...(allObjectives || [])].sort(
      (a, b) => (b.points || 0) - (a.points || 0)
    );

    const objectivesContext = sortedObjectives
      .map((obj) => `  ${obj.points} pts: ${obj.objective}`)
      .join("\n");

    const targetPoints = existingObjective?.points || existingObjective?.score || 0;
    const targetText = existingObjective?.objective || existingObjective?.description || "";

    // Determine position description
    const higherCount = sortedObjectives.filter((o) => (o.points || 0) > targetPoints).length;
    const lowerCount = sortedObjectives.filter((o) => (o.points || 0) < targetPoints).length;

    let positionDescription = "";
    if (higherCount === 0) {
      positionDescription = "the HIGHEST tier (most complete/correct work)";
    } else if (lowerCount === 0) {
      positionDescription = "the LOWEST tier (least complete/incorrect work)";
    } else {
      positionDescription = `a MIDDLE tier (with ${higherCount} tier(s) above and ${lowerCount} tier(s) below)`;
    }

    const prompt = PromptTemplate.fromTemplate(`
You are an expert rubric generator for Snap! programming assignments. Your task is to regenerate ONE specific objective within a scoring category while maintaining consistency with the other objectives.

═══════════════════════════════════════════════════════════════════
ASSIGNMENT CONTEXT
═══════════════════════════════════════════════════════════════════
Title: {title}
Description: {description}

═══════════════════════════════════════════════════════════════════
SNAP! MANUAL REFERENCE
═══════════════════════════════════════════════════════════════════
{context}

═══════════════════════════════════════════════════════════════════
CATEGORY BEING ASSESSED
═══════════════════════════════════════════════════════════════════
Category: {categoryName}
Purpose: {categoryReasoning}

This category uses a point-based scale where:
- Higher points = More complete, correct, sophisticated work
- Lower points = Less complete, incorrect, or missing work
- Points are in DESCENDING order of quality/correctness

═══════════════════════════════════════════════════════════════════
CURRENT SCORING SPECTRUM (All objectives in this category)
═══════════════════════════════════════════════════════════════════
{objectivesContext}

═══════════════════════════════════════════════════════════════════
OBJECTIVE TO REGENERATE
═══════════════════════════════════════════════════════════════════
Points: {targetPoints}
Current Text: "{targetText}"

This is at position {positionDescription} in the scoring spectrum.

═══════════════════════════════════════════════════════════════════
USER'S REGENERATION INSTRUCTION
═══════════════════════════════════════════════════════════════════
{instruction}

═══════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════

Regenerate the {targetPoints}-point objective based on the user's instruction while:

1. CRITICAL - PRESERVE POINT VALUE:
   - You MUST keep "points" as exactly {targetPoints}
   - DO NOT change the point value unless explicitly instructed
   - The point value defines the quality tier - respect it

2. MAINTAIN SCORING SPECTRUM CONSISTENCY:
   - Review ALL objectives above (higher points) - they represent better work
   - Review ALL objectives below (lower points) - they represent worse work
   - Your regenerated objective must fit logically between them
   - It should be clearly LESS demanding than objectives with MORE points
   - It should be clearly MORE demanding than objectives with FEWER points
   - Avoid overlap or contradiction with other tiers

3. UNDERSTAND THE TIER POSITION:
   - If this is the highest-point tier: describe COMPLETE, EXCELLENT, FULLY CORRECT work
   - If this is a middle tier: describe PARTIAL or MOSTLY CORRECT work with specific gaps
   - If this is the lowest tier: describe MINIMAL, INCORRECT, or MISSING work
   - Be specific about what differentiates this tier from adjacent ones

4. APPLY USER'S INSTRUCTION:
   - Follow the user's specific request for how to modify the objective
   - If instruction is generic or empty, improve clarity and specificity
   - Keep the same LEVEL of work quality (don't shift tiers)
   - Make it measurable and concrete

5. CONTEXT AWARENESS:
   - Consider the assignment requirements ({title})
   - Use appropriate Snap! programming terminology from the manual
   - Make criteria specific to this programming assignment
   - Ensure it's assessable/gradable by an instructor

6. FORMATTING:
   - Be clear and concise (1-3 sentences)
   - Start with what the student demonstrates/produces
   - Use active language ("The program demonstrates...", "Code includes...", "Student implements...")
   - Avoid vague terms like "good" or "adequate"

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════════

Output ONLY valid JSON with this exact structure (NO markdown, NO extra text):

{{
  "objective": "<regenerated objective description>",
  "points": {targetPoints}
}}

REMEMBER: Points must be EXACTLY {targetPoints}. Focus on improving the description while respecting its tier position in the scoring spectrum.

Generate the improved objective now:
`);

    const formattedPrompt = await prompt.format({
      context,
      title,
      description,
      categoryName,
      categoryReasoning: categoryReasoning || "Assessing this aspect of the assignment",
      objectivesContext: objectivesContext || "No other objectives available",
      targetPoints,
      targetText,
      positionDescription,
      instruction:
        instruction ||
        "Improve clarity and specificity of this objective while maintaining its tier level and point value",
    });

    console.log("[Prompt Service] Cell prompt generated.");
    return formattedPrompt;
  } catch (error) {
    console.error("[Prompt Service] Error generating cell prompt:", error);
    throw error;
  }
};

/**
 * Generate row regeneration prompt
 */
export const generateRowPrompt = async (
  context,
  title,
  description,
  categoryName,
  categoryReasoning,
  currentObjectives,
  instruction
) => {
  try {
    console.log("[Prompt Service] Generating row regeneration prompt...");

    const objectives = Array.isArray(currentObjectives) ? currentObjectives : [];
    const sorted = [...objectives].sort((a, b) => (b.points || 0) - (a.points || 0));
    const pointsList = sorted.map((o) => Number(o.points || o.score || 0));
    const spectrumContext = sorted.map((o) => `${o.points} pts: ${o.objective}`).join("\n");

    const prompt = PromptTemplate.fromTemplate(`
You are an expert rubric generator for Snap! programming assignments. Regenerate the ENTIRE set of objectives for ONE category while preserving its scoring scale and order.

═══════════════════════════════════════════════════════════════════
ASSIGNMENT CONTEXT
═══════════════════════════════════════════════════════════════════
Title: {title}
Description: {description}

═══════════════════════════════════════════════════════════════════
SNAP! MANUAL REFERENCE
═══════════════════════════════════════════════════════════════════
{context}

═══════════════════════════════════════════════════════════════════
CATEGORY TO REGENERATE (KEEP CATEGORY THE SAME)
═══════════════════════════════════════════════════════════════════
Category: {categoryName}
Purpose: {categoryReasoning}

Keep the category name and purpose the SAME. Replace the objectives with improved ones.

═══════════════════════════════════════════════════════════════════
CURRENT SCORING SPECTRUM (for reference)
═══════════════════════════════════════════════════════════════════
{spectrumContext}

═══════════════════════════════════════════════════════════════════
CONSTRAINTS (CRITICAL)
═══════════════════════════════════════════════════════════════════
1) PRESERVE POINTS EXACTLY and ORDER DESCENDING:
   - Use EXACTLY these points in this order (highest quality to lowest): {pointsList}
   - Do NOT change, remove, or add point values.
2) FIT TIER MEANINGS:
   - Highest points = fully complete, correct, sophisticated work.
   - Middle points = partial/mostly correct work with specific gaps.
   - Lowest points = minimal, incorrect, or missing work.
3) BE SPECIFIC and ASSESSABLE:
   - Use Snap! terminology from the manual.
   - 1-3 sentences per objective, measurable and concrete.
4) AVOID OVERLAP:
   - Each tier must be clearly different from adjacent tiers.

USER INSTRUCTION (optional):
{instruction}

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════════
Return ONLY valid JSON (no markdown fences, no commentary). Exact schema:
{{
    "objectives": [
        {{
            "objective": "<tier description 1-3 sentences>",
            "points": <number>
        }},
        {{
            "objective": "<tier description 1-3 sentences>",
            "points": <number>
        }}
        // one object per point value listed above, in the SAME ORDER
    ]
}}

RULES FOR OBJECTIVES:
- Use each point value exactly once, in descending order.
- Descriptions must clearly differentiate adjacent tiers (explicit contrasts).
- Use Snap! domain terminology where applicable.
- Be specific/measurable; avoid vague adjectives.
- No duplicate or near-duplicate wording.

RULE: The objectives array MUST have the same length as the provided points list and use those exact points in the same order.
Generate the improved objectives now.
`);

    const formattedPrompt = await prompt.format({
      context,
      title,
      description,
      categoryName,
      categoryReasoning: categoryReasoning || "Assessing this aspect of the assignment",
      spectrumContext: spectrumContext || "",
      pointsList: JSON.stringify(pointsList),
      instruction:
        instruction || "Improve clarity and specificity while preserving the scoring scale and order.",
    });

    console.log("[Prompt Service] Row prompt generated.");
    return formattedPrompt;
  } catch (error) {
    console.error("[Prompt Service] Error generating row prompt:", error);
    throw error;
  }
};

export default {
  generateRubricPrompt,
  generateCellPrompt,
  generateRowPrompt,
};
