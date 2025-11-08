import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import {
  generateOutput,
  generatePrompt,
  generateCellPrompt,
    generateRowPrompt,
  loadAndSplitTheDocs,
  vectorSaveAndSearch,
} from "./ragSimple.js";
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
const PORT = 3001;
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'data');
        },
        filename: (req, file, cb) => {
            const fileExtension = file.originalname.split(".")[1]
            const fileName = "sample." + fileExtension
            cb(null, fileName)
        }
    })
})

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.post("/generate", async (req, res) => {
    console.log("[API] /generate endpoint hit");
    try {
        const title = req.body.title || "";
        const description = req.body.description || "";
        const question = req.body.question || "";
        
        console.log("[API] Received request:", { title, description, question });
        console.log("[API] Loading and splitting docs...");
        
        const splits = await loadAndSplitTheDocs("SnapManual.pdf");
        
        console.log("[API] Running vector search...");
        const searches = await vectorSaveAndSearch(splits, question, title, description);
        
        console.log("[API] Generating prompt...");
        const prompt = await generatePrompt(searches, question, title, description);
        
        console.log("[API] Generating rubric...");
        const result = await generateOutput(prompt);

        console.log("[API] Rubric generated successfully.", result);

        res.json({
            data: {
                content: result
            } 
        });

    } catch (error) {
        console.error("[API] Error processing request:", error);
        res.status(500).json({ 
            error: error.message || "Internal Server Error" 
        });
    }
})

app.post("/regenerate-cell", async (req, res) => {
    console.log("[API] /regenerate-cell endpoint hit");
    try {
        const { title, description, categoryName, categoryReasoning, allObjectives, objectiveIndex, existingObjective, instruction } = req.body;
        
        if (!title || !description || !categoryName) {
            return res.status(400).json({ error: "Missing required fields: title, description, categoryName" });
        }
        
        console.log("[API] Received cell regeneration request:", { categoryName, objectiveIndex, instruction });
        console.log("[API] Loading and splitting docs...");
        
        const splits = await loadAndSplitTheDocs("SnapManual.pdf");
        
        console.log("[API] Running vector search...");
        const searches = await vectorSaveAndSearch(splits, instruction || categoryName, title, description);
        
        console.log("[API] Generating cell prompt...");
        const prompt = await generateCellPrompt(searches, title, description, categoryName, categoryReasoning, allObjectives, objectiveIndex, existingObjective, instruction);
        
        console.log("[API] Generating new objective...");
        const result = await generateOutput(prompt);
        
        console.log("[API] Cell regenerated successfully.");
        
        res.json({ 
            data: {
                objective: result
            } 
        });

    } catch (error) {
        console.error("[API] Error processing cell regeneration:", error);
        res.status(500).json({ 
            error: error.message || "Internal Server Error" 
        });
    }
})

app.post("/regenerate-row", async (req, res) => {
    console.log("[API] /regenerate-row endpoint hit");
    try {
        const { title, description, categoryName, categoryReasoning, objectives, instruction } = req.body;

        if (!title || !description || !categoryName || !Array.isArray(objectives)) {
            return res.status(400).json({ error: "Missing required fields: title, description, categoryName, objectives[]" });
        }

        console.log("[API] Received row regeneration request:", { categoryName, objectivesCount: objectives.length });
        console.log("[API] Loading and splitting docs...");

        const splits = await loadAndSplitTheDocs("SnapManual.pdf");

        console.log("[API] Running vector search...");
        const searches = await vectorSaveAndSearch(splits, instruction || categoryName, title, description);

        console.log("[API] Generating row prompt...");
        const prompt = await generateRowPrompt(searches, title, description, categoryName, categoryReasoning, objectives, instruction);

        console.log("[API] Generating new objectives...");
        const result = await generateOutput(prompt);

        console.log("[API] Row regenerated successfully.");

        // Normalize output to an array of objectives
        const objectivesOut = Array.isArray(result?.objectives) ? result.objectives : (Array.isArray(result) ? result : []);

        res.json({ 
            data: {
                objectives: objectivesOut
            } 
        });

    } catch (error) {
        console.error("[API] Error processing row regeneration:", error);
        res.status(500).json({ 
            error: error.message || "Internal Server Error" 
        });
    }
})

app.listen(3001, () => {
    console.log("Server is running on port 3001");
})




// Read the JSON file
// const jsonData = JSON.parse(readFileSync('input.json', 'utf8'));
// Function to convert JSON to Excel
function convertToExcel(data) {
    const workbook = XLSX.utils.book_new();
    
    // Process each output (text item)
    data.forEach((item, index) => {
        const sheetData = [];
        
        // Handle different structures
        let textData = item.text;
        let title = 'Reverse Guessing Game';
        let description = '';
        let rubrics = [];
        
        if (Array.isArray(textData)) {
            // text is an array - check if it has objects with category or title
            if (textData[0] && textData[0].title) {
                // First element has title (structure type 1)
                title = textData[0].title;
                description = textData[0].description || '';
                rubrics = textData[0].rubrics || [];
            } else if (textData[0] && textData[0].category) {
                // Array of rubrics directly (structure type 2)
                rubrics = textData;
                title = 'Reverse Guessing Game';
                description = 'In this lab, students work in pairs to create a "Reverse Guessing Game" where the computer, rather than the player, tries to guess a secret number between 1 and 10.';
            }
        } else if (textData && typeof textData === 'object') {
            // text is an object (structure type 3)
            title = textData.title || 'Reverse Guessing Game';
            description = Array.isArray(textData.description) ? textData.description[0] : textData.description || '';
            rubrics = textData.rubrics || [];
        }
        
        // Add title and description at the top
        sheetData.push(['Title:', title]);
        sheetData.push(['Description:', description]);
        sheetData.push(['Temperature:', item.temperature]);
        sheetData.push(['Model:', item.model]);
        sheetData.push([]); // Empty row for spacing
        
        // Find all unique score values across all categories
        const allScores = new Set();
        rubrics.forEach(rubric => {
            if (rubric.rubrics && Array.isArray(rubric.rubrics)) {
                rubric.rubrics.forEach(r => {
                    allScores.add(r.score);
                });
            }
        });
        const sortedScores = Array.from(allScores).sort((a, b) => b - a);
        
        // Create header row
        const headerRow = ['Category', ...sortedScores.map(score => `Score ${score}`)];
        sheetData.push(headerRow);
        
        // Add data rows - one row per category
        rubrics.forEach(rubric => {
            const row = [rubric.category];
            
            // For each possible score, find the description
            sortedScores.forEach(score => {
                const scoreRubric = rubric.rubrics ? rubric.rubrics.find(r => r.score === score) : null;
                row.push(scoreRubric ? scoreRubric.description : '');
            });
            
            sheetData.push(row);
        });
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        
        // Set column widths for better readability
        const columnWidths = [
            { wch: 30 }, // Category column
            ...sortedScores.map(() => ({ wch: 50 })) // Score columns
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        const sheetName = `Output ${index + 1} (T${item.temperature})`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // Write to file
    XLSX.writeFile(workbook, 'rubrics_output.xlsx');
    console.log('Excel file created successfully: rubrics_output.xlsx');
}



