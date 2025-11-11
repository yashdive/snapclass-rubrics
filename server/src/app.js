import express from "express";
import cors from "cors";
import { config } from "./config/env.config.js";
import corsOptions from "./config/cors.config.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import requestLogger from "./middleware/logger.middleware.js";

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Snapclass Rubrics API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      generate: "/api/rubric/generate",
      regenerateCell: "/api/rubric/regenerate-cell",
      regenerateRow: "/api/rubric/regenerate-row",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
