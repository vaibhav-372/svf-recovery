// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;
const JWT_SECRET = "ailydkastfvae8c5r3497e6qfusdadgcdtfu";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = mysql.createConnection({
  host: "192.168.65.22",
  user: "root",
  password: "JrkLH@#@#*",
  database: "recovery_admin",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to remote database");
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
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

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const checkUserQuery =
      'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';
    db.query(checkUserQuery, [user.userId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).json({ message: "User not authorized" });
      }

      req.user = user;
      next();
    });
  });
}

// File upload endpoint
app.post(
  "/api/upload-image",
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

      db.query(getAgentQuery, [agentId], (err, agentResults) => {
        if (err) {
          console.error("Error fetching agent details:", err);
          return res.status(500).json({
            success: false,
            message: "Error fetching agent information",
          });
        }

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
        const newPath = path.join(uploadsDir, cleanFilename);

        fs.rename(oldPath, newPath, (err) => {
          if (err) {
            console.error("Error renaming file:", err);
            return res.status(500).json({
              success: false,
              message: "Error saving image file",
            });
          }

          const imageUrl = `/uploads/${cleanFilename}`;
          console.log("Image uploaded successfully:", imageUrl);

          res.json({
            success: true,
            message: "Image uploaded successfully",
            image_url: imageUrl,
            filename: cleanFilename,
          });
        });
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading image",
      });
    }
  }
);

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("Login attempt for username:", username);

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const findUserQuery =
      'SELECT * FROM tbl_emp_profile WHERE user_name = ? AND status = "active" AND isDeleted = 0';
    db.query(findUserQuery, [username], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        console.log("User not found or inactive:", username);
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      const user = results[0];

      if (user.emp_role !== "agent") {
        console.log("Access denied - not an agent:", username);
        return res.status(403).json({ message: "Access denied. Agents only." });
      }

      if (password !== user.password) {
        console.log("Password mismatch for user:", username);
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      console.log("Login successful for agent:", username);

      const token = jwt.sign(
        {
          userId: user.entry_id,
          username: user.user_name,
          userType: user.emp_role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        token: token,
        user: {
          id: user.entry_id,
          username: user.user_name,
          fullName: user.full_name,
          email: user.email || "",
          mobile: user.mobile1 || "",
          userType: user.emp_role,
        },
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Verify token endpoint
app.post("/api/auth/verify", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ valid: false, message: "Token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log("Token verification failed:", err.message);
        return res.json({ valid: false, message: "Invalid or expired token" });
      }

      const checkUserQuery =
        'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';

      db.query(checkUserQuery, [decoded.userId], (err, results) => {
        if (err) {
          console.error("Database error during token verification:", err);
          return res.json({ valid: false, message: "Database error" });
        }

        if (results.length === 0) {
          console.log(
            "User not found or not an agent during token verification"
          );
          return res.json({
            valid: false,
            message: "User not found or not an agent",
          });
        }

        const user = results[0];

        res.json({
          valid: true,
          user: {
            id: user.entry_id,
            username: user.user_name,
            userType: user.emp_role,
          },
        });
      });
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.json({ valid: false, message: "Token verification failed" });
  }
});

// Get customer data for specific agent (PROTECTED ROUTE)
app.get("/api/customers", authenticateToken, (req, res) => {
  try {
    const agentId = req.user.userId;
    console.log("Fetching customers for agent:", agentId);

    const getCustomersQuery = `
      SELECT 
      tac.*, taa.*
      FROM tbl_auction_customers as tac, tbl_assigned_agents as taa
      WHERE taa.assigned_agent_id = ? AND taa.is_closed = 0 AND tac.pt_no = taa.pt_no
      Group BY tac.customer_id
      ORDER BY taa.assigned_at DESC
    `;

    db.query(getCustomersQuery, [agentId], (err, results) => {
      if (err) {
        console.error("Database error fetching customers:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch customer data",
        });
      }

      console.log(`Found ${results.length} customers for agent ${agentId}`);

      res.json({
        success: true,
        customers: results,
        total: results.length,
        agentId: agentId,
      });
    });
  } catch (error) {
    console.error("Server error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Get all PT numbers/loans for a specific customer (PROTECTED ROUTE)
app.get("/api/customers/:customerId/loans", authenticateToken, (req, res) => {
  try {
    const agentId = req.user.userId;
    const customerId = req.params.customerId;

    console.log(
      "Fetching loans for customer:",
      customerId,
      "by agent:",
      agentId
    );

    const getCustomerLoansQuery = `
      SELECT 
        tac.*, 
        taa.*,
        tac.entry_id as customer_entry_id,
        taa.entry_id as assignment_entry_id
      FROM tbl_auction_customers as tac
      INNER JOIN tbl_assigned_agents as taa ON tac.pt_no = taa.pt_no
      WHERE tac.customer_id = ? 
        AND taa.assigned_agent_id = ?
        AND taa.is_closed = 0
      ORDER BY tac.loan_created_date DESC
    `;

    db.query(getCustomerLoansQuery, [customerId, agentId], (err, results) => {
      if (err) {
        console.error("Database error fetching customer loans:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch customer loan data",
        });
      }

      console.log(`Found ${results.length} loans for customer ${customerId}`);

      const loans = results.map((loan) => ({
        entry_id: loan.customer_entry_id,
        customer_id: loan.customer_id,
        customer_name: loan.customer_name,
        pt_no: loan.pt_no,
        address: loan.address,
        contact_number1: loan.contact_number1,
        contact_number2: loan.contact_number2,
        nominee_name: loan.nominee_name,
        nominee_contact_number: loan.nominee_contact_number,
        ornament_name: loan.ornament_name,
        loan_created_date: loan.loan_created_date,
        interest_rate: loan.interest_rate,
        gross_weight: loan.gross_weight,
        net_weight: loan.net_weight,
        tenure: loan.tenure,
        loan_amount: loan.loan_amount,
        paid_amount: loan.paid_amount,
        first_letter_date: loan.first_letter_date,
        second_letter_date: loan.second_letter_date,
        final_letter_date: loan.final_letter_date,
        assigned_date: loan.assigned_date,
        last_date: loan.last_date,
        no_of_visit: loan.no_of_visit,
        is_closed: loan.is_closed,
      }));

      res.json({
        success: true,
        loans: loans,
        total: loans.length,
        customerId: customerId,
      });
    });
  } catch (error) {
    console.error("Server error fetching customer loans:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Get all PT numbers/loans for a specific customer by name (PROTECTED ROUTE)
app.get(
  "/api/customers/:customerName/loans-by-name",
  authenticateToken,
  (req, res) => {
    try {
      const agentId = req.user.userId;
      const customerName = req.params.customerName;

      console.log(
        "Fetching loans for customer by name:",
        customerName,
        "by agent:",
        agentId
      );

      const getCustomerLoansQuery = `
      SELECT 
        tac.*, 
        taa.*,
        tac.entry_id as customer_entry_id,
        taa.entry_id as assignment_entry_id
      FROM tbl_auction_customers as tac
      INNER JOIN tbl_assigned_agents as taa ON tac.pt_no = taa.pt_no
      WHERE tac.customer_name = ? 
        AND taa.assigned_agent_id = ?
        AND taa.is_closed = 0
      ORDER BY tac.loan_created_date DESC
    `;

      db.query(
        getCustomerLoansQuery,
        [customerName, agentId],
        (err, results) => {
          if (err) {
            console.error(
              "Database error fetching customer loans by name:",
              err
            );
            return res.status(500).json({
              success: false,
              message: "Failed to fetch customer loan data",
            });
          }

          console.log(
            `Found ${results.length} loans for customer ${customerName}`
          );

          const loans = results.map((loan) => ({
            entry_id: loan.customer_entry_id,
            customer_id: loan.customer_id,
            customer_name: loan.customer_name,
            pt_no: loan.pt_no,
            address: loan.address,
            contact_number1: loan.contact_number1,
            contact_number2: loan.contact_number2,
            nominee_name: loan.nominee_name,
            nominee_contact_number: loan.nominee_contact_number,
            ornament_name: loan.ornament_name,
            loan_created_date: loan.loan_created_date,
            interest_rate: loan.interest_rate,
            gross_weight: loan.gross_weight,
            net_weight: loan.net_weight,
            tenure: loan.tenure,
            loan_amount: loan.loan_amount,
            paid_amount: loan.paid_amount,
            first_letter_date: loan.first_letter_date,
            second_letter_date: loan.second_letter_date,
            final_letter_date: loan.final_letter_date,
            assigned_date: loan.assigned_date,
            last_date: loan.last_date,
            no_of_visit: loan.no_of_visit,
            is_closed: loan.is_closed,
          }));

          res.json({
            success: true,
            loans: loans,
            total: loans.length,
            customerName: customerName,
          });
        }
      );
    } catch (error) {
      console.error("Server error fetching customer loans by name:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// // Save recovery response endpoint (PROTECTED ROUTE)
// app.post("/api/save-recovery-response", authenticateToken, async (req, res) => {
//   try {
//     const agentId = req.user.userId;
//     const {
//       customer_id,
//       response_type,
//       response_description,
//       image_url,
//       latitude,
//       longitude,
//     } = req.body;

//     console.log("Received recovery response data:", req.body);

//     console.log("Saving recovery response for agent:", agentId);

//     // Validate required fields
//     if (!customer_id || !response_type || !response_description) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Missing required fields: customer_id, response_type, response_description",
//       });
//     }

//     // Generate location coordinates if available
//     let location_coordinates = null;
//     if (latitude && longitude) {
//       location_coordinates = JSON.stringify({
//         latitude: parseFloat(latitude),
//         longitude: parseFloat(longitude),
//       });
//     }

//     // Get branch_id from agent profile
//     const getAgentQuery =
//       "SELECT branch_id FROM tbl_emp_profile WHERE entry_id = ?";

//     db.query(getAgentQuery, [agentId], (err, agentResults) => {
//       if (err) {
//         console.error("Error fetching agent details:", err);
//         return res.status(500).json({
//           success: false,
//           message: "Error fetching agent information",
//         });
//       }

//       if (agentResults.length === 0) {
//         return res.status(404).json({
//           success: false,
//           message: "Agent not found",
//         });
//       }

//       const branch_id = agentResults[0].branch_id;
//       const device_id = req.headers["user-agent"] || "mobile-app";

//       // Get all PT numbers for this customer assigned to this agent
//       const getCustomerPTsQuery = `
//         SELECT DISTINCT tac.pt_no
//         FROM tbl_auction_customers tac
//         INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
//         WHERE tac.customer_id = ?
//           AND taa.assigned_agent_id = ?
//           AND taa.is_closed = 0
//       `;

//       db.query(
//         getCustomerPTsQuery,
//         [customer_id, agentId],
//         (err, ptResults) => {
//           if (err) {
//             console.error("Error fetching customer PTs:", err);
//             return res.status(500).json({
//               success: false,
//               message: "Error fetching customer loan accounts",
//             });
//           }

//           if (ptResults.length === 0) {
//             return res.status(404).json({
//               success: false,
//               message: "No active loan accounts found for this customer",
//             });
//           }

//           const ptNumbers = ptResults.map((row) => row.pt_no);
//           console.log(
//             `Saving response for ${ptNumbers.length} PT numbers:`,
//             ptNumbers
//           );

//           // Prepare insert query for bulk insert
//           const insertQuery = `
//           INSERT INTO tbl_recovery_responses
//           (pt_no, customer_id, agent_id, response_text, response_description,
//            response_timestamp, image_url, location_coordinates, completed_date,
//            device_id, branch_id)
//           VALUES ?
//         `;

//           // Prepare values for bulk insert
//           const values = ptNumbers.map((pt_no) => [
//             pt_no,
//             customer_id,
//             agentId,
//             response_type,
//             response_description,
//             new Date(),
//             image_url,
//             location_coordinates,
//             new Date(),
//             device_id,
//             branch_id,
//           ]);

//           console.log(`Executing bulk insert with ${values.length} records`);

//           db.query(insertQuery, [values], (err, results) => {
//             if (err) {
//               console.error("Database error saving recovery responses:", err);
//               return res.status(500).json({
//                 success: false,
//                 message: "Failed to save recovery responses: " + err.message,
//               });
//             }

//             console.log(
//               `Recovery responses saved successfully for ${ptNumbers.length} PT numbers. Affected rows:`,
//               results.affectedRows
//             );

//             // Update isVisited to 1 for all PT numbers in tbl_assigned_agents
//             updateIsVisited(agentId, ptNumbers, (updateErr) => {
//               if (updateErr) {
//                 console.error("Error updating isVisited status:", updateErr);
//               }

//               res.json({
//                 success: true,
//                 message: `Recovery response saved successfully for ${ptNumbers.length} loan account(s)`,
//                 pt_count: ptNumbers.length,
//                 pt_numbers: ptNumbers,
//               });
//             });
//           });
//         }
//       );
//     });
//   } catch (error) {
//     console.error("Server error saving recovery response:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while saving response: " + error.message,
//     });
//   }
// });

// server.js - Updated save-recovery-response endpoint
app.post("/api/save-recovery-response", authenticateToken, async (req, res) => {
  try {
    const agentId = req.user.userId;
    const {
      customer_id,
      response_type,
      response_description,
      image_url,
      latitude,
      longitude,
    } = req.body;

    console.log("Saving recovery response for agent:", agentId);
    console.log("Received customer_id:", customer_id);

    // Validate required fields - STRICTER VALIDATION
    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!response_type) {
      return res.status(400).json({
        success: false,
        message: "Response type is required",
      });
    }

    if (!response_description) {
      return res.status(400).json({
        success: false,
        message: "Response description is required",
      });
    }

    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // Generate location coordinates if available
    let location_coordinates = null;
    if (latitude && longitude) {
      location_coordinates = JSON.stringify({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
    }

    // Get branch_id from agent profile
    const getAgentQuery =
      "SELECT branch_id FROM tbl_emp_profile WHERE entry_id = ?";

    db.query(getAgentQuery, [agentId], (err, agentResults) => {
      if (err) {
        console.error("Error fetching agent details:", err);
        return res.status(500).json({
          success: false,
          message: "Error fetching agent information",
        });
      }

      if (agentResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      const branch_id = agentResults[0].branch_id;
      const device_id = req.headers["user-agent"] || "mobile-app";

      // Get all PT numbers for this customer assigned to this agent
      const getCustomerPTsQuery = `
        SELECT DISTINCT tac.pt_no, tac.customer_id
        FROM tbl_auction_customers tac
        INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
        WHERE tac.customer_id = ? 
          AND taa.assigned_agent_id = ?
          AND taa.is_closed = 0
      `;

      db.query(
        getCustomerPTsQuery,
        [customer_id, agentId],
        (err, ptResults) => {
          if (err) {
            console.error("Error fetching customer PTs:", err);
            return res.status(500).json({
              success: false,
              message: "Error fetching customer loan accounts",
            });
          }

          if (ptResults.length === 0) {
            return res.status(404).json({
              success: false,
              message: "No active loan accounts found for this customer",
            });
          }

          const ptNumbers = ptResults.map((row) => row.pt_no);
          console.log(
            `Saving response for ${ptNumbers.length} PT numbers:`,
            ptNumbers
          );

          // Prepare insert query for bulk insert
          const insertQuery = `
          INSERT INTO tbl_recovery_responses 
          (pt_no, customer_id, agent_id, response_text, response_description, 
           response_timestamp, image_url, location_coordinates, completed_date, 
           device_id, branch_id)
          VALUES ?
        `;

          // Prepare values for bulk insert - FIXED: Use the actual customer_id from request
          const values = ptNumbers.map((pt_no) => [
            pt_no,
            customer_id, // Use the customer_id from request body
            agentId,
            response_type,
            response_description,
            new Date(),
            image_url,
            location_coordinates,
            new Date(),
            device_id,
            branch_id,
          ]);

          console.log(`Executing bulk insert with ${values.length} records`);
          console.log("First record sample:", values[0]);

          db.query(insertQuery, [values], (err, results) => {
            if (err) {
              console.error("Database error saving recovery responses:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to save recovery responses: " + err.message,
              });
            }

            console.log(
              `Recovery responses saved successfully for ${ptNumbers.length} PT numbers. Affected rows:`,
              results.affectedRows
            );

            // Update isVisited to 1 for all PT numbers in tbl_assigned_agents
            updateIsVisited(agentId, ptNumbers, (updateErr) => {
              if (updateErr) {
                console.error("Error updating isVisited status:", updateErr);
              }

              res.json({
                success: true,
                message: `Recovery response saved successfully for ${ptNumbers.length} loan account(s)`,
                pt_count: ptNumbers.length,
                pt_numbers: ptNumbers,
                customer_id: customer_id, // Return the customer_id for verification
              });
            });
          });
        }
      );
    });
  } catch (error) {
    console.error("Server error saving recovery response:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving response: " + error.message,
    });
  }
});

// Helper function to update isVisited status in tbl_assigned_agents
function updateIsVisited(agentId, ptNumbers, callback) {
  if (!ptNumbers || ptNumbers.length === 0) {
    return callback(null);
  }

  const placeholders = ptNumbers.map(() => "?").join(",");
  const updateQuery = `
    UPDATE tbl_assigned_agents 
    SET isVisited = 1 
    WHERE assigned_agent_id = ? 
      AND pt_no IN (${placeholders})
  `;

  const values = [agentId, ...ptNumbers];

  db.query(updateQuery, values, (err, results) => {
    if (err) {
      console.error("Error updating isVisited status:", err);
      return callback(err);
    }

    console.log(
      `isVisited updated to 1 for ${results.affectedRows} PT numbers`
    );
    callback(null);
  });
}

// GET /api/check-existing-response/:customerId
app.get(
  "/api/check-existing-response/:customerId",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId } = req.params;
      const agentId = req.user.userId;

      console.log(
        "Checking existing response for customer:",
        customerId,
        "by agent:",
        agentId
      );

      // Check if response exists for this customer and agent
      const checkResponseQuery = `
        SELECT * FROM tbl_recovery_responses 
        WHERE customer_id = ? AND agent_id = ?
        ORDER BY response_timestamp DESC 
        LIMIT 1
      `;

      db.query(checkResponseQuery, [customerId, agentId], (err, results) => {
        if (err) {
          console.error("Database error checking existing response:", err);
          return res.status(500).json({
            success: false,
            message: "Error checking existing response",
          });
        }

        if (results.length > 0) {
          const existingResponse = results[0];
          console.log("Raw existing response from DB:", existingResponse);

          // Handle location coordinates safely
          let latitude = null;
          let longitude = null;

          if (existingResponse.location_coordinates) {
            try {
              const coords = existingResponse.location_coordinates;
              console.log(
                "Location coordinates type:",
                typeof coords,
                "value:",
                coords
              );

              // If it's a string that looks like JSON, parse it
              if (typeof coords === "string" && coords.trim().startsWith("{")) {
                const locationData = JSON.parse(coords);
                latitude = locationData.latitude;
                longitude = locationData.longitude;
              }
              // If it's already an object with latitude/longitude properties
              else if (typeof coords === "object" && coords !== null) {
                latitude = coords.latitude;
                longitude = coords.longitude;
              }
              // If it's a string representation of an object
              else if (
                typeof coords === "string" &&
                coords.includes("latitude")
              ) {
                // Try to extract values using regex
                const latMatch = coords.match(/"latitude":\s*([0-9.]+)/);
                const lngMatch = coords.match(/"longitude":\s*([0-9.]+)/);

                if (latMatch) latitude = parseFloat(latMatch[1]);
                if (lngMatch) longitude = parseFloat(lngMatch[1]);
              }
            } catch (parseError) {
              console.error("Error parsing location coordinates:", parseError);
              console.log(
                "Raw location_coordinates value:",
                existingResponse.location_coordinates
              );
            }
          }

          const responseData = {
            response_type: existingResponse.response_text,
            response_description: existingResponse.response_description,
            image_url: existingResponse.image_url,
            latitude: latitude,
            longitude: longitude,
            response_timestamp: existingResponse.response_timestamp,
            pt_no: existingResponse.pt_no,
            entry_id: existingResponse.entry_id,
            agent_id: existingResponse.agent_id,
            customer_id: existingResponse.customer_id,
          };

          console.log("Processed existing response:", responseData);

          res.json({
            success: true,
            existingResponse: responseData,
          });
        } else {
          console.log("No existing response found for customer:", customerId);
          res.json({
            success: false, // Changed to false when no response found
            existingResponse: null,
          });
        }
      });
    } catch (error) {
      console.error("Error checking existing response:", error);
      res.status(500).json({
        success: false,
        message: "Error checking existing response",
      });
    }
  }
);
// GET /api/check-customer-status/:customerId - Check if customer is visited
app.get("/api/check-customer-status/:customerId", authenticateToken, (req, res) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.userId;

    console.log("Checking customer status for:", customerId, "by agent:", agentId);

    // First check if customer has any PT numbers that are visited
    const checkVisitedQuery = `
      SELECT isVisited 
      FROM tbl_assigned_agents 
      WHERE assigned_agent_id = ? 
        AND pt_no IN (
          SELECT pt_no FROM tbl_auction_customers WHERE customer_id = ?
        )
      ORDER BY isVisited DESC 
      LIMIT 1
    `;

    db.query(checkVisitedQuery, [agentId, customerId], (err, visitedResults) => {
      if (err) {
        console.error("Database error checking visited status:", err);
        return res.status(500).json({
          success: false,
          message: "Error checking customer status",
        });
      }

      const isVisited = visitedResults.length > 0 && visitedResults[0].isVisited === 1;

      if (isVisited) {
        // If visited, get the existing response with image URL
        const getResponseQuery = `
          SELECT * FROM tbl_recovery_responses 
          WHERE customer_id = ? AND agent_id = ?
          ORDER BY response_timestamp DESC 
          LIMIT 1
        `;

        db.query(getResponseQuery, [customerId, agentId], (err, responseResults) => {
          if (err) {
            console.error("Database error fetching existing response:", err);
            return res.status(500).json({
              success: false,
              message: "Error fetching existing response",
            });
          }

          let existingResponse = null;
          if (responseResults.length > 0) {
            const response = responseResults[0];
            
            // Handle location coordinates
            let latitude = null;
            let longitude = null;
            if (response.location_coordinates) {
              try {
                if (typeof response.location_coordinates === 'string') {
                  const locationData = JSON.parse(response.location_coordinates);
                  latitude = locationData.latitude;
                  longitude = locationData.longitude;
                } else if (typeof response.location_coordinates === 'object') {
                  latitude = response.location_coordinates.latitude;
                  longitude = response.location_coordinates.longitude;
                }
              } catch (parseError) {
                console.error("Error parsing location coordinates:", parseError);
              }
            }

            existingResponse = {
              response_type: response.response_text,
              response_description: response.response_description,
              image_url: response.image_url, // IMPORTANT: Ensure image_url is included
              latitude: latitude,
              longitude: longitude,
              response_timestamp: response.response_timestamp,
              pt_no: response.pt_no,
            };
          }

          res.json({
            success: true,
            isVisited: true,
            existingResponse: existingResponse,
          });
        });
      } else {
        // Not visited
        res.json({
          success: true,
          isVisited: false,
          existingResponse: null,
        });
      }
    });
  } catch (error) {
    console.error("Error checking customer status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking customer status",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
