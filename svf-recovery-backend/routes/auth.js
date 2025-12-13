const express = require("express");
const jwt = require("jsonwebtoken");
const { promisePool } = require("../utils/database"); // Import promisePool
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Login endpoint with async/await
router.post("/auth/login", async (req, res) => {
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
    
    try {
      // Using promisePool with async/await
      const [results] = await promisePool.query(findUserQuery, [username]);

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
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ message: "Database error" });
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Verify token endpoint with async/await
router.post("/auth/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ valid: false, message: "Token required" });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log("Token verification failed:", err.message);
        return res.json({ valid: false, message: "Invalid or expired token" });
      }

      const checkUserQuery =
        'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';

      try {
        const [results] = await promisePool.query(checkUserQuery, [decoded.userId]);

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
      } catch (dbError) {
        console.error("Database error during token verification:", dbError);
        return res.json({ valid: false, message: "Database error" });
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.json({ valid: false, message: "Token verification failed" });
  }
});

module.exports = router;