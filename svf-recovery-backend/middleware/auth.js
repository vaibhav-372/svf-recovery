const jwt = require("jsonwebtoken");
const { promisePool } = require("../utils/database");

const JWT_SECRET = "ailydkastfvae8c5r3497e6qfusdadgcdtfu";

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Check user in database
    const checkUserQuery =
      'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';
    
    const [results] = await promisePool.query(checkUserQuery, [decoded.userId]);
    
    if (results.length === 0) {
      return res.status(403).json({ message: "User not authorized" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}

module.exports = { authenticateToken, JWT_SECRET };