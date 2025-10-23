// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "ailydkastfvae8c5r3497e6qfusdadgcdtfu";

// Middleware
app.use(cors());
app.use(express.json());

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

// Update last login time
app.post("/api/auth/update-last-login", authenticateToken, (req, res) => {
  try {
    const { userId } = req.body;

    const updateQuery =
      "UPDATE tbl_emp_profile SET last_login = NOW() WHERE entry_id = ?";
    db.query(updateQuery, [userId], (err, results) => {
      if (err) {
        console.error("Error updating last login:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to update login time" });
      }

      console.log("Last login updated for user:", userId);
      res.json({ success: true, message: "Last login updated" });
    });
  } catch (error) {
    console.error("Update last login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all PT numbers/loans for a specific customer (PROTECTED ROUTE)
// app.get("/api/customers/:customerId/loans", authenticateToken, (req, res) => {
//   try {
//     const agentId = req.user.userId;
//     const customerId = req.params.customerId;

//     console.log(
//       "Fetching loans for customer:",
//       customerId,
//       "by agent:",
//       agentId
//     );

//     const getCustomerLoansQuery = `
//       SELECT
//         tac.*,
//         taa.*,
//         tac.entry_id as customer_entry_id,
//         taa.entry_id as assignment_entry_id
//       FROM tbl_auction_customers as tac
//       INNER JOIN tbl_assigned_agents as taa ON tac.pt_no = taa.pt_no
//       WHERE tac.customer_id = ?
//         AND taa.assigned_agent_id = ?
//         AND taa.is_closed = 0
//       ORDER BY tac.loan_created_date DESC
//     `;

//     db.query(getCustomerLoansQuery, [customerId, agentId], (err, results) => {
//       if (err) {
//         console.error("Database error fetching customer loans:", err);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to fetch customer loan data",
//         });
//       }

//       console.log(`Found ${results.length} loans for customer ${customerId}`);

//       // Transform the data to match your frontend expectations
//       const loans = results.map((loan) => ({
//         entry_id: loan.customer_entry_id,
//         customer_id: loan.customer_id,
//         customer_name: loan.customer_name,
//         pt_no: loan.pt_no,
//         address: loan.address,
//         contact_number1: loan.contact_number1,
//         contact_number2: loan.contact_number2,
//         nominee_name: loan.nominee_name,
//         nominee_contact_number: loan.nominee_contact_number,
//         ornament_name: loan.ornament_name,
//         loan_created_date: loan.loan_created_date,
//         interest_rate: loan.interest_rate,
//         gross_weight: loan.gross_weight,
//         net_weight: loan.net_weight,
//         tenure: loan.tenure,
//         loan_amount: loan.loan_amount,
//         paid_amount: loan.paid_amount,
//         first_letter_date: loan.first_letter_date,
//         second_letter_date: loan.second_letter_date,
//         final_letter_date: loan.final_letter_date,
//         assigned_date: loan.assigned_date,
//         last_date: loan.last_date,
//         no_of_visit: loan.no_of_visit,
//         is_closed: loan.is_closed,
//         // Add any other fields you need
//       }));

//       res.json({
//         success: true,
//         loans: loans,
//         total: loans.length,
//         customerId: customerId,
//       });
//     });
//   } catch (error) {
//     console.error("Server error fetching customer loans:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });

// ... your existing code ...

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
