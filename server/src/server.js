import app from "./app.js";
import { config } from "./config/env.config.js";

const PORT = config.port;

app.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Snapclass Rubrics Server");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Server is ready to accept requests");
  console.log("═══════════════════════════════════════════════════════\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[Server] SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n[Server] SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
