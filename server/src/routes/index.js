import express from "express";
import rubricRoutes from "./rubric.routes.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Mount rubric routes
router.use("/rubric", rubricRoutes);

export default router;
