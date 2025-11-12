import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { config } from "../config/env.config.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module-level cache for vector store
let globalSplits = null;
let globalVectorStore = null;

/**
 * Initialize vector store at module load
 */
async function initializeVectorStore() {
  try {
    console.log("[RAG Service] Initializing vector store...");
    
    const docPath = path.resolve(__dirname, "../../", config.rag.docPath);
    const loader = new PDFLoader(docPath);
    const docs = await loader.load();
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.rag.chunkSize,
      chunkOverlap: config.rag.chunkOverlap,
    });
    
    globalSplits = await textSplitter.splitDocuments(docs);
    
    // Use Hugging Face embeddings for production (works without local Ollama)
    const embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HF_TOKEN,
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });
    
    globalVectorStore = await MemoryVectorStore.fromDocuments(
      globalSplits,
      embeddings
    );
    
    console.log(`[RAG Service] Vector store initialized with ${globalSplits.length} chunks.`);
  } catch (error) {
    console.error("[RAG Service] Failed to initialize vector store:", error);
    
    // Provide specific error messages for common issues
    if (error.message?.includes("quota") || error.message?.includes("insufficient_quota")) {
      console.error("[RAG Service] ⚠️ HuggingFace quota exceeded for embeddings");
    } else if (error.message?.includes("rate limit")) {
      console.error("[RAG Service] ⚠️ HuggingFace rate limit reached");
    } else if (error.code === "ENOENT") {
      console.error("[RAG Service] ⚠️ PDF file not found:", error.path);
    }
    
    console.warn("[RAG Service] Continuing without RAG - rubric generation will work but without context from manual");
    // Don't throw - allow server to start without RAG in production
  }
}

// Start initialization immediately (but don't block server startup)
const vectorStoreReady = initializeVectorStore();

/**
 * Get document splits (uses cache)
 */
export const getDocumentSplits = async () => {
  await vectorStoreReady;
  if (!globalSplits) {
    throw new Error("[RAG Service] Document splits not initialized.");
  }
  console.log("[RAG Service] Returning cached splits.");
  return globalSplits;
};

/**
 * Perform similarity search
 */
export const performSimilaritySearch = async (query, title, description) => {
  await vectorStoreReady;
  
  if (!globalVectorStore) {
    throw new Error("[RAG Service] Vector store not initialized.");
  }
  
  const combinedQuery = [title, description, query]
    .filter(Boolean)
    .join("\n\n");
  
  console.log("[RAG Service] Running similarity search...");
  const results = await globalVectorStore.similaritySearch(
    combinedQuery,
    config.rag.searchResults
  );
  
  console.log(`[RAG Service] Found ${results.length} relevant documents.`);
  return results;
};

/**
 * Build context from search results
 */
export const buildContext = (searchResults) => {
  let context = "";
  searchResults.forEach((result) => {
    context += "\n\n" + result.pageContent;
  });
  return context.trim();
};

export default {
  getDocumentSplits,
  performSimilaritySearch,
  buildContext,
};
