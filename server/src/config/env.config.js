import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  hfToken: process.env.HF_TOKEN,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  
  // AI Configuration
  ai: {
    model: process.env.AI_MODEL || "meta-llama/Llama-3.1-70B-Instruct",
    maxTokens: parseInt(process.env.MAX_TOKENS || "2048"),
    temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
  },
  
  // RAG Configuration
  rag: {
    docPath: process.env.DOC_PATH || "SnapManual.pdf",
    chunkSize: parseInt(process.env.CHUNK_SIZE || "500"),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || "50"),
    searchResults: parseInt(process.env.SEARCH_RESULTS || "5"),
  },
};

// Validate required environment variables
if (!config.hfToken && config.nodeEnv === "production") {
  throw new Error("HF_TOKEN is required in production environment");
}

export default config;
