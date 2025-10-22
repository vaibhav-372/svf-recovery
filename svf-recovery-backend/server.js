// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ailydkastfvae8c5r3497e6qfusdadgcdtfu';

// Middleware
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: '192.168.65.22', 
  user: 'root', 
  password: 'JrkLH@#@#*', 
  database: 'recovery_admin',
  port: 3306 
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to remote database');
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const findUserQuery = 'SELECT * FROM tbl_emp_profile WHERE user_name = ? AND status = "active" AND isDeleted = 0';
    db.query(findUserQuery, [username], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        console.log('User not found or inactive:', username);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const user = results[0];

      if (user.emp_role !== 'agent') {
        console.log('Access denied - not an agent:', username);
        return res.status(403).json({ message: 'Access denied. Agents only.' });
      }

      if (password !== user.password) {
        console.log('Password mismatch for user:', username);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      console.log('Login successful for agent:', username);

      const token = jwt.sign(
        { 
          userId: user.entry_id, 
          username: user.user_name,
          userType: user.emp_role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: user.entry_id,
          username: user.user_name,
          fullName: user.full_name,
          email: user.email || '',
          mobile: user.mobile1 || '',
          userType: user.emp_role
        }
      });
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Verify token endpoint
app.post('/api/auth/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.json({ valid: false, message: 'Token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('Token verification failed:', err.message);
        return res.json({ valid: false, message: 'Invalid or expired token' });
      }

      const checkUserQuery = 'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';
      
      db.query(checkUserQuery, [decoded.userId], (err, results) => {
        if (err) {
          console.error('Database error during token verification:', err);
          return res.json({ valid: false, message: 'Database error' });
        }

        if (results.length === 0) {
          console.log('User not found or not an agent during token verification');
          return res.json({ valid: false, message: 'User not found or not an agent' });
        }

        const user = results[0];

        res.json({ 
          valid: true, 
          user: {
            id: user.entry_id,
            username: user.user_name,
            userType: user.emp_role
          }
        });
      });
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false, message: 'Token verification failed' });
  }
});

// Get customer data for specific agent (PROTECTED ROUTE)
app.get('/api/customers', authenticateToken, (req, res) => {
  try {
    const agentId = req.user.userId;
    console.log('Fetching customers for agent:', agentId);

    const getCustomersQuery = `
      SELECT 
      tac.*
      FROM tbl_auction_customers as tac, tbl_assigned_agents as taa
      WHERE taa.assigned_agent_id = ? AND taa.is_closed = 0 AND tac.pt_no = taa.pt_no
      ORDER BY taa.assigned_at DESC
    `;
    
    db.query(getCustomersQuery, [agentId], (err, results) => {
      if (err) {
        console.error('Database error fetching customers:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to fetch customer data' 
        });
      }

      console.log(`Found ${results.length} customers for agent ${agentId}`);
      
      res.json({
        success: true,
        customers: results,
        total: results.length,
        agentId: agentId
      });
    });
  } catch (error) {
    console.error('Server error fetching customers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    const checkUserQuery = 'SELECT entry_id, user_name, emp_role FROM tbl_emp_profile WHERE entry_id = ? AND emp_role = "agent" AND status = "active" AND isDeleted = 0';
    db.query(checkUserQuery, [user.userId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).json({ message: 'User not authorized' });
      }
      
      req.user = user;
      next();
    });
  });
}

// Update last login time
app.post('/api/auth/update-last-login', authenticateToken, (req, res) => {
  try {
    const { userId } = req.body;
    
    const updateQuery = 'UPDATE tbl_emp_profile SET last_login = NOW() WHERE entry_id = ?';
    db.query(updateQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error updating last login:', err);
        return res.status(500).json({ success: false, message: 'Failed to update login time' });
      }
      
      console.log('Last login updated for user:', userId);
      res.json({ success: true, message: 'Last login updated' });
    });
  } catch (error) {
    console.error('Update last login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});