import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import assignments from '../data/all_assignments.json' with {type: 'json'};
import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

// Initialize HfInference with your token
const hf = new HfInference(process.env.HF_TOKEN);

// --- Module-level cache for vector store ---
let globalSplits = null;
let globalVectorStore = null;
const DOC_PATH = "SnapManual.pdf";

// Compact examples for the prompt
const compactExamples = assignments.map(ex =>
  ex.rubric.map(r => ({
    category: r.category,
    criteria: r.criteria.map(c => ({
      points: c.points,
      description: c.description
    }))
  }))
);

const examplesJson = JSON.stringify(compactExamples, null, 2);

// Initialize vector store at module load
async function initializeVectorStore() {
    try {
        console.log("[RAG] Initializing vector store at startup...");
        const loader = new PDFLoader(DOC_PATH);
        const docs = await loader.load();
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50,
        });
        globalSplits = await textSplitter.splitDocuments(docs);
        const embeddings = new OllamaEmbeddings();

        globalVectorStore = await MemoryVectorStore.fromDocuments(globalSplits, embeddings);
        console.log(`[RAG] Vector store initialized with ${globalSplits.length} chunks.`);
    } catch (error) {
        console.error("[RAG] Failed to initialize vector store:", error);
        throw error;
    }
}

// Immediately start initialization
const vectorStoreReady = initializeVectorStore();

// Load and split documents (uses cache)
export const loadAndSplitTheDocs = async (file_path) => {
    if (globalSplits) {
        console.log("[RAG] Returning cached splits.");
        return globalSplits;
    } else {
        throw new Error("[RAG] Splits not initialized yet.");
    }
}

// Vector search with combined query
export const vectorSaveAndSearch = async (splits, question, title, description) => {
    await vectorStoreReady;
    try {
        if (!globalVectorStore) throw new Error("[RAG] Vector store not initialized.");
        const combinedQuery = [title, description, question].filter(Boolean).join("\n\n");
        console.log("[RAG] Running similarity search with combined query...");
        const results = await globalVectorStore.similaritySearch(combinedQuery, 5);
        console.log("[RAG] Similarity search complete. Results found:", results.length);
        return results;
    } catch (error) {
        console.error("[RAG] Error in vector storage or search:", error);
        throw error;
    }
}

// Generate prompt from search results
export const generatePrompt = async (searches, question, title, description) => {
    try {
        console.log("[RAG] Generating prompt from search results...");
        let context = "";
        searches.forEach((search) => {
            context = context + "\n\n" + search.pageContent;
        });
        
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
            context: context,
            examples: examplesJson,
            title,
            description,
            question: question || "No additional requirements",
        });
        
        console.log("[RAG] Prompt generated.");
        return formattedPrompt;
    } catch (error) {
        console.error("[RAG] Error generating prompt:", error);
        throw error;
    }
}

// Generate prompt for single cell regeneration
export const generateCellPrompt = async (searches, title, description, categoryName, categoryReasoning, allObjectives, objectiveIndex, existingObjective, instruction) => {
    try {
        console.log("[RAG] Generating cell regeneration prompt...");
        let context = "";
        searches.forEach((search) => {
            context = context + "\n\n" + search.pageContent;
        });
        
        // Sort objectives by points (descending) to show the scoring spectrum
        const sortedObjectives = [...(allObjectives || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        // Build a clear view of all objectives in this category
        const objectivesContext = sortedObjectives.map((obj, idx) => 
            `  ${obj.points} pts: ${obj.objective}`
        ).join('\n');
        
        const targetPoints = existingObjective?.points || existingObjective?.score || 0;
        const targetText = existingObjective?.objective || existingObjective?.description || "";
        
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
        
        // Determine position description for context
        let positionDescription = "";
        const higherCount = sortedObjectives.filter(o => (o.points || 0) > targetPoints).length;
        const lowerCount = sortedObjectives.filter(o => (o.points || 0) < targetPoints).length;
        
        if (higherCount === 0) {
            positionDescription = "the HIGHEST tier (most complete/correct work)";
        } else if (lowerCount === 0) {
            positionDescription = "the LOWEST tier (least complete/incorrect work)";
        } else {
            positionDescription = `a MIDDLE tier (with ${higherCount} tier(s) above and ${lowerCount} tier(s) below)`;
        }
        
        const formattedPrompt = await prompt.format({
            context: context,
            title,
            description,
            categoryName,
            categoryReasoning: categoryReasoning || "Assessing this aspect of the assignment",
            objectivesContext: objectivesContext || "No other objectives available",
            targetPoints: targetPoints,
            targetText: targetText,
            positionDescription: positionDescription,
            instruction: instruction || "Improve clarity and specificity of this objective while maintaining its tier level and point value",
        });
        
        console.log("[RAG] Cell prompt generated.");
        return formattedPrompt;
    } catch (error) {
        console.error("[RAG] Error generating cell prompt:", error);
        throw error;
    }
}

// Generate prompt for row (entire category objectives) regeneration
export const generateRowPrompt = async (searches, title, description, categoryName, categoryReasoning, currentObjectives, instruction) => {
    try {
        console.log("[RAG] Generating row regeneration prompt...");
        let context = "";
        searches.forEach((search) => {
            context = context + "\n\n" + search.pageContent;
        });

        const objectives = Array.isArray(currentObjectives) ? currentObjectives : [];
        const sorted = [...objectives].sort((a, b) => (b.points || 0) - (a.points || 0));
        const pointsList = sorted.map(o => Number(o.points || o.score || 0));
        const uniquePointsDesc = [...pointsList]; // already desc order by sorted
        const spectrumContext = sorted.map(o => `${o.points} pts: ${o.objective}`).join("\n");

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
            pointsList: JSON.stringify(uniquePointsDesc),
            instruction: instruction || "Improve clarity and specificity while preserving the scoring scale and order."
        });

        console.log("[RAG] Row prompt generated.");
        return formattedPrompt;
    } catch (error) {
        console.error("[RAG] Error generating row prompt:", error);
        throw error;
    }
}
// Generate output using Hugging Face LLM (single run)
export const generateOutput = async (prompt) => {
    try {
        console.log("[RAG] Generating rubric with LLM...");
        
        const response = await hf.chatCompletion({
            model: "meta-llama/Llama-3.1-70B-Instruct",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 3000,
            top_p: 0.9,
        });
        
        console.log("[RAG] LLM response received.");
        const rawText = response.choices[0].message.content;
        console.log("[RAG] Raw response:", rawText.substring(0, 200) + "...");
        
        const parsedJson = extractJson(rawText);
        console.log("[RAG] JSON extracted successfully.");
        
        return parsedJson;
        
    } catch (error) {
        console.error("[RAG] Error generating output:", error);
        
        if (error.message?.includes("rate limit")) {
            throw new Error("Rate limit reached. Please wait a moment and try again.");
        } else if (error.message?.includes("not supported")) {
            throw new Error("Model not available. Please check your Hugging Face configuration.");
        }
        
        throw error;
    }
}

// Extract JSON from LLM response
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
