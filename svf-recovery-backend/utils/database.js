const mysql = require("mysql2");

// Create connection pool with optimized settings
const pool = mysql.createPool({
  host: "192.168.65.22",
  user: "root",
  password: "JrkLH@#@#*",
  database: "recovery_admin",
  port: 3306,
  
  // Pool configuration
  waitForConnections: true,
  connectionLimit: 20, // Increased for concurrent requests
  queueLimit: 100, // Increased queue size
  maxIdle: 10, // Max idle connections
  idleTimeout: 60000, // Idle connections timeout after 60 seconds
  
  // Connection timeout settings
  connectTimeout: 10000, // 10 seconds connection timeout
  
  // Timezone
  timezone: '+00:00',
  
  // SSL (if needed)
  ssl: false,
  
  // Debug
  debug: false,
  
  // Multiple statements (disabled for security)
  multipleStatements: false
});

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    console.error("Error code:", err.code);
    console.error("Error number:", err.errno);
    console.error("SQL state:", err.sqlState);
    
    // Retry logic (optional)
    setTimeout(() => {
      console.log("Retrying database connection...");
    }, 5000);
    return;
  }
  
  console.log("Connected to remote database");
  
  // Test query to verify connection works
  connection.query('SELECT 1 + 1 AS result', (queryErr, results) => {
    connection.release(); // Always release connection back to pool
    
    if (queryErr) {
      console.error("Database test query failed:", queryErr);
    } else {
      console.log("Database test query successful, result:", results[0].result);
    }
  });
});

// Event listeners for pool
pool.on('acquire', (connection) => {
  console.log('Connection %d acquired', connection.threadId);
});

pool.on('release', (connection) => {
  console.log('Connection %d released', connection.threadId);
});

pool.on('enqueue', () => {
  console.log('Waiting for available connection slot');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  
  // Handle specific error codes
  switch (err.code) {
    case 'PROTOCOL_CONNECTION_LOST':
      console.error('Database connection was closed.');
      break;
    case 'ER_CON_COUNT_ERROR':
      console.error('Database has too many connections.');
      break;
    case 'ECONNREFUSED':
      console.error('Database connection was refused.');
      break;
    case 'ETIMEDOUT':
      console.error('Database connection timed out.');
      break;
    default:
      console.error('Unknown database error:', err.code);
  }
});

// Create promise wrapper for async/await support
const promisePool = pool.promise();

// Export both pool and promisePool for flexibility
module.exports = { pool, promisePool };