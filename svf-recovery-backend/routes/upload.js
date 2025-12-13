const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { promisePool } = require("../utils/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "../uploads");
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use temporary filename, will be renamed in the upload endpoint
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "temp-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
  },
});

// File upload endpoint
router.post(
  "/upload-image",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const { customer_id, pt_no } = req.body;

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      // Check file size
      const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes
      const stats = fs.statSync(req.file.path);
      if (stats.size > MAX_FILE_SIZE) {
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum allowed is 1MB. Current size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`,
        });
      }

      console.log(
        `Uploaded file size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`
      );

      // Get agent details
      const agentId = req.user.userId;
      const getAgentQuery =
        "SELECT user_name FROM tbl_emp_profile WHERE entry_id = ?";
    
      try {
        const [agentResults] = await promisePool.query(getAgentQuery, [agentId]);

        if (agentResults.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Agent not found",
          });
        }

        const agentName = agentResults[0].user_name;

        // Generate filename with format: pt_no-agentname-todayDate
        const today = new Date();
        const dateString = today.toISOString().split("T")[0]; // YYYY-MM-DD format

        let filename;
        if (pt_no) {
          // Use pt_no-agentname-date format
          filename = `${pt_no}-${agentName}-${dateString}${path.extname(req.file.originalname)}`;
        } else {
          // Fallback to customer_id if pt_no not available
          filename = `${customer_id}-${agentName}-${dateString}${path.extname(req.file.originalname)}`;
        }

        // Clean filename (remove special characters)
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

        // Rename the file with the new filename
        const oldPath = req.file.path;
        const newPath = path.join(__dirname, "../uploads", cleanFilename);

        // Use fs.promises for async file operations
        try {
          await fs.promises.rename(oldPath, newPath);
          
          const imageUrl = `/uploads/${cleanFilename}`;
          console.log("Image uploaded successfully:", imageUrl);

          res.json({
            success: true,
            message: "Image uploaded successfully",
            image_url: imageUrl,
            filename: cleanFilename,
          });
        } catch (renameError) {
          console.error("Error renaming file:", renameError);
          return res.status(500).json({
            success: false,
            message: "Error saving image file",
          });
        }
      } catch (dbError) {
        console.error("Error fetching agent details:", dbError);
        return res.status(500).json({
          success: false,
          message: "Error fetching agent information",
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading image",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;