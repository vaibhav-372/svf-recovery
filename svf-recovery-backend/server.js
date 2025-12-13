const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");

// Import database connection
const db = require("./utils/database");

// Import routes
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(compression({ level: 6, threshold: 1024 }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request timeout middleware (SINGLE INSTANCE)
app.use((req, res, next) => {
  // Set request timeout (30 seconds)
  req.setTimeout(30000, () => {
    console.log(`Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout",
      });
    }
  });

  // Set response timeout (30 seconds)
  res.setTimeout(30000, () => {
    console.log(`Response timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Service timeout",
      });
    }
  });

  // Log slow requests (>5 seconds)
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.log(`SLOW REQUEST: ${req.method} ${req.url} - ${duration}ms`);
    }
  });

  next();
});

// Use all routes
app.use("/api", routes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server and save reference
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Set server-level timeout (consistent with middleware)
server.timeout = 30000;

// Global error handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit in production, allow graceful recovery
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});