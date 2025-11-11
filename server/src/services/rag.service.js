import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OllamaEmbeddings } from "@langchain/ollama";
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
    const embeddings = new OllamaEmbeddings();
    
    globalVectorStore = await MemoryVectorStore.fromDocuments(
      globalSplits,
      embeddings
    );
    
    console.log(`[RAG Service] Vector store initialized with ${globalSplits.length} chunks.`);
  } catch (error) {
    console.error("[RAG Service] Failed to initialize vector store:", error);
    throw error;
  }
}

// Start initialization immediately
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
