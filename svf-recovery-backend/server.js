console.log = () => {};

global.logImportant = (...args) => {
  console.info("[IMPORTANT]", ...args);
};

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
  logImportant("Connected to remote database");
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
        tac.*, 
        taa.*
      FROM tbl_auction_customers tac
      INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
      WHERE taa.assigned_agent_id = ? 
        AND taa.is_closed = 0 
        AND taa.no_of_visit = (
          SELECT MAX(taa2.no_of_visit)
          FROM tbl_assigned_agents taa2
          WHERE taa2.cus_auction_id = tac.customer_id
        )
        AND taa.assigned_agent_id = (
          SELECT taa3.assigned_agent_id
          FROM tbl_assigned_agents taa3
          WHERE taa3.cus_auction_id = tac.customer_id
          AND taa3.no_of_visit = (
            SELECT MAX(taa4.no_of_visit)
            FROM tbl_assigned_agents taa4
            WHERE taa4.cus_auction_id = tac.customer_id
          )
          LIMIT 1
        )
      GROUP BY tac.customer_id
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
      FROM tbl_auction_customers tac
      INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
      WHERE tac.customer_id = ? 
        AND taa.assigned_agent_id = ?
        AND taa.is_closed = 0
        AND taa.no_of_visit = (
          SELECT MAX(taa2.no_of_visit)
          FROM tbl_assigned_agents taa2
          WHERE taa2.cus_auction_id = tac.customer_id
        )
        AND taa.assigned_agent_id = (
          SELECT taa3.assigned_agent_id
          FROM tbl_assigned_agents taa3
          WHERE taa3.cus_auction_id = tac.customer_id
          AND taa3.no_of_visit = (
            SELECT MAX(taa4.no_of_visit)
            FROM tbl_assigned_agents taa4
            WHERE taa4.cus_auction_id = tac.customer_id
          )
          LIMIT 1
        )
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
        FROM tbl_auction_customers tac
        INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
        WHERE tac.customer_name = ? 
          AND taa.assigned_agent_id = ?
          AND taa.is_closed = 0
          AND taa.no_of_visit = (
            SELECT MAX(taa2.no_of_visit)
            FROM tbl_assigned_agents taa2
            WHERE taa2.cus_auction_id = tac.customer_id
          )
          AND taa.assigned_agent_id = (
            SELECT taa3.assigned_agent_id
            FROM tbl_assigned_agents taa3
            WHERE taa3.cus_auction_id = tac.customer_id
            AND taa3.no_of_visit = (
              SELECT MAX(taa4.no_of_visit)
              FROM tbl_assigned_agents taa4
              WHERE taa4.cus_auction_id = tac.customer_id
            )
            LIMIT 1
          )
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

// Save recovery response endpoint (PROTECTED ROUTE) - FIXED VERSION
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

    // NEW: Only require description if response is "Others"
    if (
      response_type === "Others" &&
      (!response_description || !response_description.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required for 'Others' response",
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

      // In the save-recovery-response endpoint, update the getCustomerPTsQuery:
      const getCustomerPTsQuery = `
  SELECT DISTINCT tac.pt_no, tac.customer_id, taa.no_of_visit
  FROM tbl_auction_customers tac
  INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
  WHERE tac.customer_id = ? 
    AND taa.assigned_agent_id = ?
    AND taa.is_closed = 0
    AND taa.no_of_visit = (
      SELECT MAX(taa2.no_of_visit)
      FROM tbl_assigned_agents taa2
      WHERE taa2.cus_auction_id = tac.customer_id
    )
    AND taa.assigned_agent_id = (
      SELECT taa3.assigned_agent_id
      FROM tbl_assigned_agents taa3
      WHERE taa3.cus_auction_id = tac.customer_id
      AND taa3.no_of_visit = (
        SELECT MAX(taa4.no_of_visit)
        FROM tbl_assigned_agents taa4
        WHERE taa4.cus_auction_id = tac.customer_id
      )
      LIMIT 1
    )
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

          const ptData = ptResults.map((row) => ({
            pt_no: row.pt_no,
            no_of_visit: row.no_of_visit || 0,
          }));

          const ptNumbers = ptData.map((row) => row.pt_no);
          console.log(
            `Processing response for ${ptNumbers.length} PT numbers:`,
            ptNumbers
          );

          // NEW LOGIC: Check for existing responses and handle update/insert
          // Pass ptData instead of ptNumbers
          checkAndSaveResponses(ptData);
        }
      );

      // NEW FUNCTION: Handle the logic for checking existing responses and saving
      function checkAndSaveResponses(ptData) {
        const ptNumbers = ptData.map((row) => row.pt_no);

        // Check if responses already exist for this customer and agent
        const checkExistingQuery = `
          SELECT pt_no FROM tbl_recovery_responses 
          WHERE customer_id = ? AND agent_id = ?
        `;

        db.query(
          checkExistingQuery,
          [customer_id, agentId],
          (checkErr, existingResults) => {
            if (checkErr) {
              console.error("Error checking existing responses:", checkErr);
              return res.status(500).json({
                success: false,
                message: "Error checking existing responses",
              });
            }

            const existingPTs = existingResults.map((row) => row.pt_no);
            const newPTs = ptData.filter(
              (pt) => !existingPTs.includes(pt.pt_no)
            );
            const updatePTs = ptData.filter((pt) =>
              existingPTs.includes(pt.pt_no)
            );

            console.log(`Found ${existingPTs.length} existing responses`);
            console.log(
              `${updatePTs.length} PTs to update:`,
              updatePTs.map((pt) => pt.pt_no)
            );
            console.log(
              `${newPTs.length} new PTs to insert:`,
              newPTs.map((pt) => pt.pt_no)
            );

            const promises = [];

            // UPDATE existing responses
            if (updatePTs.length > 0) {
              // Since each PT might have different no_of_visit values, we need to update individually
              updatePTs.forEach((pt) => {
                const updatePromise = new Promise((resolve, reject) => {
                  const updateQuery = `
                    UPDATE tbl_recovery_responses 
                    SET response_text = ?, response_description = ?, no_of_visit = ?,
                        response_timestamp = ?, image_url = ?, location_coordinates = ?,
                        completed_date = ?, device_id = ?
                    WHERE customer_id = ? AND agent_id = ? AND pt_no = ?
                  `;

                  db.query(
                    updateQuery,
                    [
                      response_type,
                      response_description || "",
                      pt.no_of_visit,
                      new Date(),
                      image_url,
                      location_coordinates,
                      new Date(),
                      device_id,
                      customer_id,
                      agentId,
                      pt.pt_no,
                    ],
                    (updateErr, updateResults) => {
                      if (updateErr) {
                        console.error(
                          "Error updating response for PT:",
                          pt.pt_no,
                          updateErr
                        );
                        reject(updateErr);
                      } else {
                        console.log(`Updated response for PT: ${pt.pt_no}`);
                        resolve(updateResults);
                      }
                    }
                  );
                });
                promises.push(updatePromise);
              });
            }

            // INSERT new responses
            if (newPTs.length > 0) {
              const insertQuery = `
              INSERT INTO tbl_recovery_responses 
              (pt_no, customer_id, agent_id, response_text, response_description, no_of_visit,
               response_timestamp, image_url, location_coordinates, completed_date, 
               device_id, branch_id)
              VALUES ?
            `;

              const insertValues = newPTs.map((pt) => [
                pt.pt_no,
                customer_id,
                agentId,
                response_type,
                response_description || "",
                pt.no_of_visit,
                new Date(),
                image_url,
                location_coordinates,
                new Date(),
                device_id,
                branch_id,
              ]);

              const insertPromise = new Promise((resolve, reject) => {
                db.query(
                  insertQuery,
                  [insertValues],
                  (insertErr, insertResults) => {
                    if (insertErr) {
                      console.error(
                        "Error inserting new responses:",
                        insertErr
                      );
                      reject(insertErr);
                    } else {
                      console.log(
                        `Inserted ${insertResults.affectedRows} new responses`
                      );
                      resolve(insertResults);
                    }
                  }
                );
              });
              promises.push(insertPromise);
            }

            // If no PTs to process (shouldn't happen, but just in case)
            if (promises.length === 0) {
              return res.status(400).json({
                success: false,
                message: "No PT numbers to process",
              });
            }

            // Execute all operations
            Promise.all(promises)
              .then((results) => {
                console.log(`All database operations completed successfully`);

                // Update isVisited to 1 for all PT numbers in tbl_assigned_agents
                updateIsVisited(agentId, ptNumbers, (updateErr) => {
                  if (updateErr) {
                    console.error(
                      "Error updating isVisited status:",
                      updateErr
                    );
                  }

                  const wasUpdate = updatePTs.length > 0;
                  const wasInsert = newPTs.length > 0;

                  let message = "";
                  if (wasUpdate && wasInsert) {
                    message = `Recovery response updated for ${updatePTs.length} and saved for ${newPTs.length} loan account(s)`;
                  } else if (wasUpdate) {
                    message = `Recovery response updated successfully for ${updatePTs.length} loan account(s)`;
                  } else {
                    message = `Recovery response saved successfully for ${newPTs.length} loan account(s)`;
                  }

                  res.json({
                    success: true,
                    message: message,
                    pt_count: ptNumbers.length,
                    pt_numbers: ptNumbers,
                    customer_id: customer_id,
                    updated: updatePTs.length,
                    inserted: newPTs.length,
                    operation: wasUpdate ? "update" : "insert",
                  });
                });
              })
              .catch((error) => {
                console.error("Error in save operations:", error);
                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to save recovery responses: " + error.message,
                });
              });
          }
        );
      }
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

app.get(
  "/api/check-customer-status/:customerId",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId } = req.params;
      const agentId = req.user.userId;

      console.log(
        "Checking customer status for:",
        customerId,
        "by agent:",
        agentId
      );

      // Check if customer has visited status AND if max visits match between both tables
      const checkVisitedQuery = `
        SELECT 
          taa.isVisited,
          taa.no_of_visit as agent_visit_no,
          (SELECT MAX(no_of_visit) FROM tbl_recovery_responses WHERE customer_id = ?) as response_visit_no
        FROM tbl_assigned_agents as taa
        WHERE taa.pt_no IN (
          SELECT pt_no FROM tbl_auction_customers WHERE customer_id = ?
        ) 
        AND taa.no_of_visit = (
          SELECT MAX(taa2.no_of_visit)
          FROM tbl_assigned_agents AS taa2
          WHERE taa2.pt_no = taa.pt_no
        )
        ORDER BY taa.isVisited ASC 
        LIMIT 1
      `;

      db.query(
        checkVisitedQuery,
        [customerId, customerId],
        (err, visitedResults) => {
          if (err) {
            console.error("Database error checking visited status:", err);
            return res.status(500).json({
              success: false,
              message: "Error checking customer status",
            });
          }

          if (visitedResults.length === 0) {
            return res.json({
              success: true,
              isVisited: false,
              existingResponse: null,
            });
          }

          const visitedData = visitedResults[0];
          const isVisited = visitedData.isVisited === 1;
          const agentMaxVisit = visitedData.agent_visit_no;
          const responseMaxVisit = visitedData.response_visit_no;

          // Check if max visits match AND customer is visited
          const shouldShowResponse =
            isVisited && agentMaxVisit === responseMaxVisit;

          if (shouldShowResponse) {
            // If visited and max visits match, get the existing response with image URL
            const getResponseQuery = `
              SELECT * FROM tbl_recovery_responses 
              WHERE customer_id = ? AND agent_id = ? AND no_of_visit = ?
              ORDER BY response_timestamp DESC 
              LIMIT 1
            `;

            db.query(
              getResponseQuery,
              [customerId, agentId, responseMaxVisit],
              (err, responseResults) => {
                if (err) {
                  console.error(
                    "Database error fetching existing response:",
                    err
                  );
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
                      if (typeof response.location_coordinates === "string") {
                        const locationData = JSON.parse(
                          response.location_coordinates
                        );
                        latitude = locationData.latitude;
                        longitude = locationData.longitude;
                      } else if (
                        typeof response.location_coordinates === "object"
                      ) {
                        latitude = response.location_coordinates.latitude;
                        longitude = response.location_coordinates.longitude;
                      }
                    } catch (parseError) {
                      console.error(
                        "Error parsing location coordinates:",
                        parseError
                      );
                    }
                  }

                  existingResponse = {
                    response_type: response.response_text,
                    response_description: response.response_description,
                    image_url: response.image_url,
                    latitude: latitude,
                    longitude: longitude,
                    response_timestamp: response.response_timestamp,
                    pt_no: response.pt_no,
                    no_of_visit: response.no_of_visit,
                  };
                }

                res.json({
                  success: true,
                  isVisited: true,
                  existingResponse: existingResponse,
                  visitMatch: true,
                });
              }
            );
          } else {
            // Not visited OR max visits don't match
            res.json({
              success: true,
              isVisited: isVisited,
              existingResponse: null,
              visitMatch: agentMaxVisit === responseMaxVisit,
              agentMaxVisit: agentMaxVisit,
              responseMaxVisit: responseMaxVisit,
            });
          }
        }
      );
    } catch (error) {
      console.error("Error checking customer status:", error);
      res.status(500).json({
        success: false,
        message: "Error checking customer status",
      });
    }
  }
);

// GET /api/get-existing-responses/:customerId - Get existing responses for all PT numbers
app.get(
  "/api/get-existing-responses/:customerId",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId } = req.params;
      const agentId = req.user.userId;

      console.log("Getting existing responses for customer:", customerId);

      const getResponsesQuery = `
        SELECT 
          trr.pt_no,
          trr.response_text,
          trr.response_description,
          trr.image_url,
          trr.response_timestamp,
          trr.no_of_visit
        FROM 
          tbl_recovery_responses AS trr
        WHERE 
          trr.customer_id = ?
          AND trr.agent_id = ?
          AND trr.no_of_visit = (
            SELECT MAX(taa2.no_of_visit)
            FROM tbl_assigned_agents AS taa2
            WHERE taa2.pt_no = trr.pt_no 
            AND taa2.assigned_agent_id = ?
          )
        ORDER BY 
          trr.response_timestamp DESC
      `;

      db.query(
        getResponsesQuery,
        [customerId, agentId, agentId],
        (err, results) => {
          if (err) {
            console.error("Database error fetching existing responses:", err);
            return res.status(500).json({
              success: false,
              message: "Error fetching existing responses",
            });
          }

          const existingResponses = {};
          results.forEach((row) => {
            existingResponses[row.pt_no] = {
              response_text: row.response_text,
              response_description: row.response_description,
              image_url: row.image_url,
              response_timestamp: row.response_timestamp,
              no_of_visit: row.no_of_visit,
            };
          });

          res.json({
            success: true,
            existingResponses: existingResponses,
            total: results.length,
          });
        }
      );
    } catch (error) {
      console.error("Error getting existing responses:", error);
      res.status(500).json({
        success: false,
        message: "Error getting existing responses",
      });
    }
  }
);

// POST /api/save-individual-response - Save/update individual response for specific PT number
app.post(
  "/api/save-individual-response",
  authenticateToken,
  async (req, res) => {
    try {
      const agentId = req.user.userId;
      const {
        customer_id,
        pt_no,
        response_type,
        response_description,
        image_url,
        latitude,
        longitude,
      } = req.body;

      console.log("Saving individual response for agent:", agentId);
      console.log("Individual PT number:", pt_no);
      console.log("Received customer_id:", customer_id);

      // Validate required fields
      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      if (!pt_no) {
        return res.status(400).json({
          success: false,
          message: "PT number is required",
        });
      }

      if (!response_type) {
        return res.status(400).json({
          success: false,
          message: "Response type is required",
        });
      }

      // NEW LOGIC: Only require description if response is "Others"
      if (
        response_type === "Others" &&
        (!response_description || !response_description.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Description is required for 'Others' response",
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

        const validatePTQuery = `
  SELECT tac.pt_no, taa.no_of_visit
  FROM tbl_auction_customers tac
  INNER JOIN tbl_assigned_agents taa ON tac.pt_no = taa.pt_no
  WHERE tac.customer_id = ? 
    AND tac.pt_no = ?
    AND taa.assigned_agent_id = ?
    AND taa.is_closed = 0
    AND taa.no_of_visit = (
      SELECT MAX(taa2.no_of_visit)
      FROM tbl_assigned_agents AS taa2
      WHERE taa2.pt_no = taa.pt_no 
      AND taa2.assigned_agent_id = ?
    )
  LIMIT 1
`;

        db.query(
          validatePTQuery,
          [customer_id, pt_no, agentId, agentId],
          (validateErr, validateResults) => {
            if (validateErr) {
              console.error("Error validating PT number:", validateErr);
              return res.status(500).json({
                success: false,
                message: "Error validating PT number",
              });
            }

            if (validateResults.length === 0) {
              return res.status(404).json({
                success: false,
                message: "PT number not found or not assigned to this agent",
              });
            }

            // NEW LOGIC: Determine what to store in response_text and response_description
            let finalResponseText = response_type;
            let finalResponseDescription = response_description;

            if (response_type === "Others") {
              // For "Others", store the custom description in response_description
              // Keep "Others" in response_text
              finalResponseText = "Others";
              finalResponseDescription = response_description;
            } else {
              finalResponseText = response_type;

              finalResponseDescription = response_description || "";
            }

            // Check if response already exists for this PT number
            const checkExistingQuery = `
          SELECT entry_id, image_url, response_description
          FROM tbl_recovery_responses 
          WHERE pt_no = ? AND agent_id = ? AND customer_id = ?
          LIMIT 1
        `;

            db.query(
              checkExistingQuery,
              [pt_no, agentId, customer_id],
              (checkErr, checkResults) => {
                if (checkErr) {
                  console.error("Error checking existing response:", checkErr);
                  return res.status(500).json({
                    success: false,
                    message: "Error checking existing response",
                  });
                }

                let finalImageUrl = image_url;

                if (checkResults.length > 0) {
                  // UPDATE existing response
                  const existingResponse = checkResults[0];
                  if (!finalImageUrl && existingResponse.image_url) {
                    finalImageUrl = existingResponse.image_url; // Preserve existing image
                  }

                  if (
                    (!finalResponseDescription ||
                      finalResponseDescription.trim() === "") &&
                    existingResponse.response_description &&
                    existingResponse.response_description.trim() !== "" &&
                    response_type !== "Others"
                  ) {
                    finalResponseDescription =
                      existingResponse.response_description;
                  }

                  const updateQuery = `
              UPDATE tbl_recovery_responses 
              SET response_text = ?, response_description = ?, 
                  response_timestamp = ?, image_url = ?, location_coordinates = ?,
                  completed_date = ?, device_id = ?
              WHERE entry_id = ?
            `;

                  const values = [
                    finalResponseText,
                    finalResponseDescription,
                    new Date(),
                    finalImageUrl,
                    location_coordinates,
                    new Date(),
                    device_id,
                    existingResponse.entry_id,
                  ];

                  console.log("Updating existing individual response:", values);

                  db.query(updateQuery, values, (updateErr, updateResults) => {
                    if (updateErr) {
                      console.error(
                        "Database error updating individual response:",
                        updateErr
                      );
                      return res.status(500).json({
                        success: false,
                        message:
                          "Failed to update individual response: " +
                          updateErr.message,
                      });
                    }

                    console.log(
                      "Individual response updated successfully for PT:",
                      pt_no
                    );

                    // Update isVisited to 1 for this specific PT number
                    updateIndividualIsVisited(agentId, [pt_no], (updateErr) => {
                      if (updateErr) {
                        console.error(
                          "Error updating isVisited status:",
                          updateErr
                        );
                      }

                      res.json({
                        success: true,
                        message: `Individual response updated successfully for PT number: ${pt_no}`,
                        pt_count: 1,
                        pt_numbers: [pt_no],
                        customer_id: customer_id,
                        updated: true,
                      });
                    });
                  });
                } else {
                  // INSERT new individual response
                  const insertQuery = `
              INSERT INTO tbl_recovery_responses 
              (pt_no, customer_id, agent_id, response_text, response_description, 
               response_timestamp, image_url, location_coordinates, completed_date, 
               device_id, branch_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

                  const values = [
                    pt_no,
                    customer_id,
                    agentId,
                    finalResponseText,
                    finalResponseDescription,
                    new Date(),
                    finalImageUrl,
                    location_coordinates,
                    new Date(),
                    device_id,
                    branch_id,
                  ];

                  console.log("Inserting new individual response:", values);

                  db.query(insertQuery, values, (insertErr, insertResults) => {
                    if (insertErr) {
                      console.error(
                        "Database error saving individual response:",
                        insertErr
                      );
                      return res.status(500).json({
                        success: false,
                        message:
                          "Failed to save individual response: " +
                          insertErr.message,
                      });
                    }

                    console.log(
                      "Individual response saved successfully for PT:",
                      pt_no
                    );

                    // Update isVisited to 1 for this specific PT number
                    updateIndividualIsVisited(agentId, [pt_no], (updateErr) => {
                      if (updateErr) {
                        console.error(
                          "Error updating isVisited status:",
                          updateErr
                        );
                      }

                      res.json({
                        success: true,
                        message: `Individual response saved successfully for PT number: ${pt_no}`,
                        pt_count: 1,
                        pt_numbers: [pt_no],
                        customer_id: customer_id,
                        response_id: insertResults.insertId,
                      });
                    });
                  });
                }
              }
            );
          }
        );
      });
    } catch (error) {
      console.error("Server error saving individual response:", error);
      res.status(500).json({
        success: false,
        message:
          "Server error while saving individual response: " + error.message,
      });
    }
  }
);

// Helper function to update isVisited status for individual PT(s)
function updateIndividualIsVisited(agentId, ptNumbers, callback) {
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

app.get(
  "/api/get-visited-status/:customerId",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId } = req.params;
      const currentAgentId = req.user.userId;

      console.log(
        "Checking customer status for:",
        customerId,
        "by current agent:",
        currentAgentId
      );

      // Get visited status for current agent only with max no_of_visit
      const checkVisitedQuery = `
        SELECT 
          aa.pt_no,
          aa.isVisited,
          rr.response_text,
          rr.response_description,
          rr.image_url,
          rr.response_timestamp as visited_date,
          rr.agent_id,
          rr.no_of_visit,
          ep.user_name as agent_name,
          ep.full_name as agent_full_name
        FROM tbl_assigned_agents aa
        LEFT JOIN tbl_recovery_responses rr ON aa.pt_no = rr.pt_no 
          AND rr.agent_id = ? 
          AND rr.customer_id = ?
          AND rr.no_of_visit = aa.no_of_visit
        LEFT JOIN tbl_emp_profile ep ON rr.agent_id = ep.entry_id
        WHERE aa.cus_auction_id = ? 
          AND aa.assigned_agent_id = ?
          AND aa.no_of_visit = (
            SELECT MAX(aa2.no_of_visit)
            FROM tbl_assigned_agents aa2
            WHERE aa2.pt_no = aa.pt_no 
            AND aa2.assigned_agent_id = ?
          )
        ORDER BY rr.response_timestamp DESC
      `;

      db.query(
        checkVisitedQuery,
        [
          currentAgentId,
          customerId,
          customerId,
          currentAgentId,
          currentAgentId,
        ],
        (err, results) => {
          if (err) {
            console.error("Database error fetching visited status:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch visited status",
            });
          }

          // Group by PT number and get only current agent's responses
          const visitedData = {};
          const processedPTs = new Set();

          results.forEach((row) => {
            const ptNo = row.pt_no;

            // Only process each PT once and only if it's visited by current agent
            if (
              !processedPTs.has(ptNo) &&
              row.isVisited === 1 &&
              row.agent_id === currentAgentId
            ) {
              visitedData[ptNo] = {
                isVisited: row.isVisited,
                visited_date: row.visited_date,
                response_text: row.response_text,
                response_description: row.response_description,
                image_url: row.image_url,
                agent_id: row.agent_id,
                agent_name: row.agent_name,
                agent_full_name: row.agent_full_name,
                no_of_visit: row.no_of_visit,
                is_current_agent: true,
              };
              processedPTs.add(ptNo);
            }
          });

          console.log("Current agent visited data:", visitedData);

          res.json({
            success: true,
            visitedData: visitedData,
            total_visited_pts: Object.keys(visitedData).length,
          });
        }
      );
    } catch (error) {
      console.error("Error fetching visited status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch visited status",
      });
    }
  }
);

app.get(
  "/api/get-all-previous-responses/:customerId",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId } = req.params;
      const currentAgentId = req.user.userId;

      console.log("Getting all previous responses for customer:", customerId);

      const getPreviousResponsesQuery = `
        SELECT 
          rr.*,
          ep.user_name as agent_name,
          ep.full_name as agent_full_name,
          aa.assigned_at,
          aa.isVisited
        FROM tbl_recovery_responses rr
        INNER JOIN tbl_emp_profile ep ON rr.agent_id = ep.entry_id
        INNER JOIN tbl_assigned_agents aa ON rr.pt_no = aa.pt_no AND rr.agent_id = aa.assigned_agent_id
        WHERE rr.customer_id = ? 
        ORDER BY rr.response_timestamp DESC
      `;

      db.query(getPreviousResponsesQuery, [customerId], (err, results) => {
        if (err) {
          console.error("Database error fetching previous responses:", err);
          return res.status(500).json({
            success: false,
            message: "Error fetching previous responses",
          });
        }

        // Process the results to include location data
        const processedResults = results.map((row) => {
          let latitude = null;
          let longitude = null;

          if (row.location_coordinates) {
            try {
              const coords = row.location_coordinates;
              if (typeof coords === "string" && coords.trim().startsWith("{")) {
                const locationData = JSON.parse(coords);
                latitude = locationData.latitude;
                longitude = locationData.longitude;
              } else if (typeof coords === "object" && coords !== null) {
                latitude = coords.latitude;
                longitude = coords.longitude;
              }
            } catch (parseError) {
              console.error("Error parsing location coordinates:", parseError);
            }
          }

          return {
            entry_id: row.entry_id,
            pt_no: row.pt_no,
            customer_id: row.customer_id,
            agent_id: row.agent_id,
            agent_name: row.agent_name,
            agent_full_name: row.agent_full_name,
            response_text: row.response_text,
            response_description: row.response_description,
            response_timestamp: row.response_timestamp,
            image_url: row.image_url,
            location_coordinates: row.location_coordinates,
            latitude: latitude,
            longitude: longitude,
            completed_date: row.completed_date,
            device_id: row.device_id,
            branch_id: row.branch_id,
            assigned_at: row.assigned_at,
            isVisited: row.isVisited,
            is_current_agent: row.agent_id === currentAgentId,
            visit_count: results.filter(
              (r) => r.pt_no === row.pt_no && r.agent_id === row.agent_id
            ).length,
          };
        });

        console.log(
          `Found ${processedResults.length} previous responses for customer ${customerId}`
        );

        res.json({
          success: true,
          previousResponses: processedResults,
          total: processedResults.length,
        });
      });
    } catch (error) {
      console.error("Error fetching previous responses:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching previous responses",
      });
    }
  }
);

// GET /api/get-previous-responses-by-pt/:customerId/:ptNo - Get previous responses for specific PT number
app.get(
  "/api/get-previous-responses-by-pt/:customerId/:ptNo",
  authenticateToken,
  (req, res) => {
    try {
      const { customerId, ptNo } = req.params;
      const currentAgentId = req.user.userId;

      console.log(
        "Getting previous responses for customer:",
        customerId,
        "PT:",
        ptNo
      );

      const getPreviousResponsesQuery = `
        SELECT 
          rr.*,
          ep.user_name as agent_name,
          ep.full_name as agent_full_name,
          aa.assigned_at,
          aa.isVisited
        FROM tbl_recovery_responses rr
        INNER JOIN tbl_emp_profile ep ON rr.agent_id = ep.entry_id
        INNER JOIN tbl_assigned_agents aa ON rr.pt_no = aa.pt_no AND rr.agent_id = aa.assigned_agent_id
        WHERE rr.customer_id = ? AND rr.pt_no = ?
        ORDER BY rr.response_timestamp DESC
      `;

      db.query(
        getPreviousResponsesQuery,
        [customerId, ptNo],
        (err, results) => {
          if (err) {
            console.error(
              "Database error fetching previous responses by PT:",
              err
            );
            return res.status(500).json({
              success: false,
              message: "Error fetching previous responses",
            });
          }

          // Process the results to include location data
          const processedResults = results.map((row) => {
            let latitude = null;
            let longitude = null;

            if (row.location_coordinates) {
              try {
                const coords = row.location_coordinates;
                if (
                  typeof coords === "string" &&
                  coords.trim().startsWith("{")
                ) {
                  const locationData = JSON.parse(coords);
                  latitude = locationData.latitude;
                  longitude = locationData.longitude;
                } else if (typeof coords === "object" && coords !== null) {
                  latitude = coords.latitude;
                  longitude = coords.longitude;
                }
              } catch (parseError) {
                console.error(
                  "Error parsing location coordinates:",
                  parseError
                );
              }
            }

            return {
              entry_id: row.entry_id,
              pt_no: row.pt_no,
              customer_id: row.customer_id,
              agent_id: row.agent_id,
              agent_name: row.agent_name,
              agent_full_name: row.agent_full_name,
              response_text: row.response_text,
              response_description: row.response_description,
              response_timestamp: row.response_timestamp,
              image_url: row.image_url,
              location_coordinates: row.location_coordinates,
              latitude: latitude,
              longitude: longitude,
              completed_date: row.completed_date,
              device_id: row.device_id,
              branch_id: row.branch_id,
              assigned_at: row.assigned_at,
              isVisited: row.isVisited,
              is_current_agent: row.agent_id === currentAgentId,
            };
          });

          console.log(
            `Found ${processedResults.length} previous responses for PT ${ptNo}`
          );

          res.json({
            success: true,
            previousResponses: processedResults,
            total: processedResults.length,
          });
        }
      );
    } catch (error) {
      console.error("Error fetching previous responses by PT:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching previous responses",
      });
    }
  }
);

// GET /api/history - Get completed visits history for current agent with date filtering
app.get("/api/history", authenticateToken, (req, res) => {
  try {
    const agentId = req.user.userId;
    const { fromDate, toDate } = req.query;

    console.log("Fetching history for agent:", agentId);
    console.log("Date range - From:", fromDate, "To:", toDate);

    // Validate date parameters
    let dateFilter = "";
    let queryParams = [agentId];

    if (fromDate && toDate) {
      dateFilter = " AND DATE(rr.response_timestamp) BETWEEN ? AND ?";
      queryParams.push(fromDate, toDate);
    } else if (fromDate) {
      dateFilter = " AND DATE(rr.response_timestamp) >= ?";
      queryParams.push(fromDate);
    } else if (toDate) {
      dateFilter = " AND DATE(rr.response_timestamp) <= ?";
      queryParams.push(toDate);
    }

    // For both /api/history and /api/history/today, use this query:
    const getHistoryQuery = `
  SELECT 
    rr.customer_id,
    tac.customer_name as name,
    tac.contact_number1 as number,
    tac.address,
    tac.city,
    rr.pt_no,
    rr.response_text AS response,
    rr.response_description,
    rr.image_url,
    rr.response_timestamp AS visited_time
  FROM tbl_recovery_responses rr
  INNER JOIN tbl_auction_customers tac 
    ON rr.customer_id = tac.customer_id
  INNER JOIN tbl_emp_profile ep 
    ON rr.agent_id = ep.entry_id
  WHERE rr.agent_id = ?
    AND rr.pt_no IS NOT NULL
    ${dateFilter}
  ORDER BY rr.customer_id, rr.response_timestamp DESC;
`;
    db.query(getHistoryQuery, queryParams, (err, results) => {
      if (err) {
        console.error("Database error fetching history:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch history data",
        });
      }

      // Process results to include location data and format response
      const historyData = results.map((row) => {
        let latitude = null;
        let longitude = null;

        // Parse location coordinates if available
        if (row.location_coordinates) {
          try {
            const coords = row.location_coordinates;
            if (typeof coords === "string" && coords.trim().startsWith("{")) {
              const locationData = JSON.parse(coords);
              latitude = locationData.latitude;
              longitude = locationData.longitude;
            } else if (typeof coords === "object" && coords !== null) {
              latitude = coords.latitude;
              longitude = coords.longitude;
            }
          } catch (parseError) {
            console.error("Error parsing location coordinates:", parseError);
          }
        }

        return {
          id: row.entry_id,
          customer_id: row.customer_id,
          name: row.customer_name,
          number: row.contact_number1 || row.contact_number2,
          pt_no: row.pt_no,
          response: row.response,
          response_description: row.response_description,
          image_url: row.image_url,
          visited_time: row.visited_time,
          date: row.date,
          no_of_visit: row.no_of_visit,
          address: row.address,
          city: row.city,
          ornament: row.ornament,
          loanCreated: row.loanCreated,
          tenure: row.tenure,
          interest: row.interest,
          amount: row.amount,
          jama: row.jama,
          letter1: row.letter1,
          letter2: row.letter2,
          finalLetter: row.finalLetter,
          lastDate: row.lastDate,
          latitude: latitude,
          longitude: longitude,
          agent_name: row.agent_name,
          agent_full_name: row.agent_full_name,
          isVisited: 1, // Always 1 since we're fetching from recovery_responses
        };
      });

      console.log(
        `Found ${historyData.length} history records for agent ${agentId}`
      );

      res.json({
        success: true,
        data: historyData,
        total: historyData.length,
        fromDate: fromDate,
        toDate: toDate,
        agentId: agentId,
      });
    });
  } catch (error) {
    console.error("Server error fetching history:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching history",
    });
  }
});

// Update your /api/history/today endpoint to match the grouping:
app.get("/api/history/today", authenticateToken, (req, res) => {
  try {
    const agentId = req.user.userId;
    const today = new Date().toISOString().split("T")[0];

    console.log("Fetching today's history for agent:", agentId);

    const getTodayHistoryQuery = `
      SELECT 
        rr.customer_id,
        tac.customer_name as name,
        tac.contact_number1 as number,
        tac.address,
        tac.city,
        rr.response_text AS response,
        rr.response_description,
        rr.image_url,
        rr.response_timestamp AS visited_time,
        GROUP_CONCAT(DISTINCT rr.pt_no ORDER BY rr.pt_no SEPARATOR ', ') AS pt_numbers,
        COUNT(DISTINCT rr.pt_no) AS total_pt_count
      FROM tbl_recovery_responses rr
      INNER JOIN tbl_auction_customers tac 
        ON rr.customer_id = tac.customer_id
      INNER JOIN tbl_emp_profile ep 
        ON rr.agent_id = ep.entry_id
      WHERE rr.agent_id = ?
        AND rr.pt_no IS NOT NULL
        AND DATE(rr.response_timestamp) = ?
      GROUP BY rr.customer_id, tac.customer_name, tac.contact_number1, tac.address, tac.city, rr.response_text, rr.response_description, rr.image_url, rr.response_timestamp
      ORDER BY rr.response_timestamp DESC;
    `;

    db.query(getTodayHistoryQuery, [agentId, today], (err, results) => {
      if (err) {
        console.error("Database error fetching today's history:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch today's history data",
        });
      }

      // Process results (same as your existing processing)
      const todayHistoryData = results.map((row) => {
        let latitude = null;
        let longitude = null;

        if (row.location_coordinates) {
          try {
            const coords = row.location_coordinates;
            if (typeof coords === "string" && coords.trim().startsWith("{")) {
              const locationData = JSON.parse(coords);
              latitude = locationData.latitude;
              longitude = locationData.longitude;
            } else if (typeof coords === "object" && coords !== null) {
              latitude = coords.latitude;
              longitude = coords.longitude;
            }
          } catch (parseError) {
            console.error("Error parsing location coordinates:", parseError);
          }
        }

        return {
          customer_id: row.customer_id,
          name: row.name,
          number: row.number,
          address: row.address,
          city: row.city,
          response: row.response,
          response_description: row.response_description,
          image_url: row.image_url,
          visited_time: row.visited_time,
          pt_numbers: row.pt_numbers,
          total_pt_count: row.total_pt_count,
          latitude: latitude,
          longitude: longitude,
          isVisited: 1,
        };
      });

      console.log(
        `Found ${todayHistoryData.length} today's history records for agent ${agentId}`
      );

      res.json({
        success: true,
        data: todayHistoryData,
        total: todayHistoryData.length,
        date: today,
        agentId: agentId,
      });
    });
  } catch (error) {
    console.error("Server error fetching today's history:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching today's history",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  logImportant(`Server running on http://localhost:${PORT}`);
});
