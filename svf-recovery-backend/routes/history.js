const express = require("express");
const { promisePool } = require("../utils/database"); // CHANGED THIS LINE
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET /history - Get completed visits history for current agent with date filtering
router.get("/history", authenticateToken, async (req, res) => { // ADDED async
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

    // CHANGED THIS SECTION - Using promisePool with await
    try {
      const [results] = await promisePool.query(getHistoryQuery, queryParams);

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
          name: row.name,
          number: row.number || row.contact_number2,
          pt_no: row.pt_no,
          response: row.response,
          response_description: row.response_description,
          image_url: row.image_url,
          visited_time: row.visited_time,
          date: row.date,
          no_of_visit: row.no_of_visit,
          address: row.address,
          city: row.city,
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
    } catch (dbError) {
      console.error("Database error fetching history:", dbError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch history data",
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error("Server error fetching history:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update your /history/today endpoint to match the grouping:
router.get("/history/today", authenticateToken, async (req, res) => { // ADDED async
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

    // CHANGED THIS SECTION - Using promisePool with await
    try {
      const [results] = await promisePool.query(getTodayHistoryQuery, [agentId, today]);

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
    } catch (dbError) {
      console.error("Database error fetching today's history:", dbError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch today's history data",
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error("Server error fetching today's history:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching today's history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;