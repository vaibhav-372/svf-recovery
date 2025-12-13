const express = require("express");
const { promisePool } = require("../utils/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Helper function to update isVisited status in tbl_assigned_agents
async function updateIsVisited(agentId, ptNumbers) {
  try {
    if (!ptNumbers || ptNumbers.length === 0) {
      return { success: true, affectedRows: 0 };
    }

    const placeholders = ptNumbers.map(() => "?").join(",");
    const updateQuery = `
      UPDATE tbl_assigned_agents 
      SET isVisited = 1 
      WHERE assigned_agent_id = ? 
        AND pt_no IN (${placeholders})
    `;

    const values = [agentId, ...ptNumbers];
    const [results] = await promisePool.query(updateQuery, values);

    console.log(
      `isVisited updated to 1 for ${results.affectedRows} PT numbers`
    );
    return { success: true, affectedRows: results.affectedRows };
  } catch (error) {
    console.error("Error updating isVisited status:", error);
    return { success: false, error };
  }
}

// Save recovery response endpoint (PROTECTED ROUTE) - OPTIMIZED VERSION
router.post("/save-recovery-response", authenticateToken, async (req, res) => {
  // Set timeout for this specific request
  req.setTimeout(30000); // 30 seconds timeout
  
  let connection;
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

    // VALIDATION - STRICTER AND FASTER
    const validationErrors = [];
    
    if (!customer_id) validationErrors.push("Customer ID is required");
    if (!response_type) validationErrors.push("Response type is required");
    if (!image_url) validationErrors.push("Image URL is required");
    
    if (response_type === "Others" && (!response_description || !response_description.trim())) {
      validationErrors.push("Description is required for 'Others' response");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Generate location coordinates if available
    let location_coordinates = null;
    if (latitude && longitude) {
      try {
        location_coordinates = JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });
      } catch (parseError) {
        console.warn("Failed to parse location coordinates:", parseError);
        // Continue without location data
      }
    }

    // Get database connection from pool
    connection = await promisePool.getConnection();

    // Get agent details and branch_id in single query
    const [agentResults] = await connection.query(
      "SELECT branch_id, user_name FROM tbl_emp_profile WHERE entry_id = ?",
      [agentId]
    );

    if (agentResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    const branch_id = agentResults[0].branch_id;
    const device_id = req.headers["user-agent"] || "mobile-app";

    // OPTIMIZED QUERY: Get customer PT numbers with their max visit number
    const getCustomerPTsQuery = `
      WITH MaxVisits AS (
        SELECT 
          pt_no,
          MAX(no_of_visit) as max_visit
        FROM tbl_assigned_agents 
        WHERE cus_auction_id = ? 
          AND assigned_agent_id = ?
          AND is_closed = 0
        GROUP BY pt_no
      )
      SELECT 
        tac.pt_no,
        mv.max_visit as no_of_visit
      FROM tbl_auction_customers tac
      INNER JOIN MaxVisits mv ON tac.pt_no = mv.pt_no
      WHERE tac.customer_id = ?
    `;

    const [ptResults] = await connection.query(
      getCustomerPTsQuery,
      [customer_id, agentId, customer_id]
    );

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

    // Check existing responses in batch
    const checkExistingQuery = `
      SELECT pt_no, entry_id, image_url, response_description 
      FROM tbl_recovery_responses 
      WHERE customer_id = ? AND agent_id = ?
    `;

    const [existingResults] = await connection.query(
      checkExistingQuery,
      [customer_id, agentId]
    );

    const existingPTs = new Map();
    existingResults.forEach((row) => {
      existingPTs.set(row.pt_no, row);
    });

    // Separate PTs into update and insert batches
    const updatePTs = [];
    const newPTs = [];

    ptData.forEach((pt) => {
      if (existingPTs.has(pt.pt_no)) {
        updatePTs.push({
          ...pt,
          entry_id: existingPTs.get(pt.pt_no).entry_id
        });
      } else {
        newPTs.push(pt);
      }
    });

    console.log(`Found ${existingPTs.size} existing responses`);
    console.log(`${updatePTs.length} PTs to update`);
    console.log(`${newPTs.length} new PTs to insert`);

    // Prepare final response values
    const finalResponseText = response_type === "Others" ? "Others" : response_type;
    const finalResponseDescription = response_type === "Others" 
      ? (response_description || "") 
      : (response_description || "");

    // Start transaction for data consistency
    await connection.beginTransaction();

    try {
      // UPDATE existing responses in batch
      if (updatePTs.length > 0) {
        const updatePromises = updatePTs.map(async (pt) => {
          const existing = existingPTs.get(pt.pt_no);
          
          // Preserve existing image if no new image provided
          let finalImageUrl = image_url;
          if (!finalImageUrl && existing.image_url) {
            finalImageUrl = existing.image_url;
          }

          // Preserve existing description if applicable
          let finalDesc = finalResponseDescription;
          if (
            (!finalDesc || finalDesc.trim() === "") &&
            existing.response_description &&
            existing.response_description.trim() !== "" &&
            response_type !== "Others"
          ) {
            finalDesc = existing.response_description;
          }

          const updateQuery = `
            UPDATE tbl_recovery_responses 
            SET response_text = ?, response_description = ?, no_of_visit = ?,
                response_timestamp = ?, image_url = ?, location_coordinates = ?,
                completed_date = ?, device_id = ?
            WHERE entry_id = ?
          `;

          await connection.query(updateQuery, [
            finalResponseText,
            finalDesc,
            pt.no_of_visit,
            new Date(),
            finalImageUrl,
            location_coordinates,
            new Date(),
            device_id,
            pt.entry_id,
          ]);

          console.log(`Updated response for PT: ${pt.pt_no}`);
        });

        await Promise.all(updatePromises);
      }

      // INSERT new responses in batch
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
          finalResponseText,
          finalResponseDescription,
          pt.no_of_visit,
          new Date(),
          image_url,
          location_coordinates,
          new Date(),
          device_id,
          branch_id,
        ]);

        const [insertResults] = await connection.query(insertQuery, [insertValues]);
        console.log(`Inserted ${insertResults.affectedRows} new responses`);
      }

      // Commit transaction
      await connection.commit();

      // Update isVisited status (non-critical, can fail without affecting main operation)
      try {
        await updateIsVisited(agentId, ptNumbers);
      } catch (visitError) {
        console.warn("Failed to update isVisited status:", visitError);
        // Continue with response - this is not critical
      }

      // Determine response message
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

      // Send success response
      res.json({
        success: true,
        message: message,
        pt_count: ptNumbers.length,
        pt_numbers: ptNumbers,
        customer_id: customer_id,
        updated: updatePTs.length,
        inserted: newPTs.length,
        operation: wasUpdate ? "update" : "insert",
        timestamp: new Date().toISOString(),
      });

    } catch (transactionError) {
      // Rollback transaction on error
      await connection.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error("Error saving recovery response:", error);
    
    // Send appropriate error response based on error type
    let statusCode = 500;
    let errorMessage = "Server error while saving response";
    
    if (error.code === 'ETIMEDOUT' || error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
      statusCode = 408;
      errorMessage = "Request timeout - please try again";
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      statusCode = 503;
      errorMessage = "Database connection lost - please try again";
    } else if (error.code === 'ER_LOCK_DEADLOCK') {
      statusCode = 409;
      errorMessage = "Database conflict - please try again";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    // Always release connection back to pool
    if (connection) {
      connection.release();
    }
  }
});

// POST /save-individual-response - Save/update individual response for specific PT number
router.post("/save-individual-response", authenticateToken, async (req, res) => {
  req.setTimeout(30000); // 30 seconds timeout
  
  let connection;
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

    // VALIDATION
    const validationErrors = [];
    
    if (!customer_id) validationErrors.push("Customer ID is required");
    if (!pt_no) validationErrors.push("PT number is required");
    if (!response_type) validationErrors.push("Response type is required");
    
    if (response_type === "Others" && (!response_description || !response_description.trim())) {
      validationErrors.push("Description is required for 'Others' response");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Generate location coordinates if available
    let location_coordinates = null;
    if (latitude && longitude) {
      try {
        location_coordinates = JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });
      } catch (parseError) {
        console.warn("Failed to parse location coordinates:", parseError);
      }
    }

    // Get database connection
    connection = await promisePool.getConnection();

    // Validate PT number and get agent details in single transaction
    await connection.beginTransaction();

    try {
      // Get agent details
      const [agentResults] = await connection.query(
        "SELECT branch_id FROM tbl_emp_profile WHERE entry_id = ?",
        [agentId]
      );

      if (agentResults.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      const branch_id = agentResults[0].branch_id;
      const device_id = req.headers["user-agent"] || "mobile-app";

      // Validate PT number and get visit count
      const validatePTQuery = `
        SELECT taa.no_of_visit
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

      const [validateResults] = await connection.query(
        validatePTQuery,
        [customer_id, pt_no, agentId, agentId]
      );

      if (validateResults.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "PT number not found or not assigned to this agent",
        });
      }

      const no_of_visit = validateResults[0].no_of_visit;

      // Prepare response values
      const finalResponseText = response_type === "Others" ? "Others" : response_type;
      const finalResponseDescription = response_type === "Others" 
        ? (response_description || "") 
        : (response_description || "");

      // Check if response already exists
      const [existingResults] = await connection.query(
        `SELECT entry_id, image_url, response_description 
         FROM tbl_recovery_responses 
         WHERE pt_no = ? AND agent_id = ? AND customer_id = ? 
         LIMIT 1`,
        [pt_no, agentId, customer_id]
      );

      let finalImageUrl = image_url;
      
      if (existingResults.length > 0) {
        // UPDATE existing response
        const existing = existingResults[0];
        
        // Preserve existing image if no new image
        if (!finalImageUrl && existing.image_url) {
          finalImageUrl = existing.image_url;
        }

        // Preserve existing description if applicable
        let finalDesc = finalResponseDescription;
        if (
          (!finalDesc || finalDesc.trim() === "") &&
          existing.response_description &&
          existing.response_description.trim() !== "" &&
          response_type !== "Others"
        ) {
          finalDesc = existing.response_description;
        }

        await connection.query(
          `UPDATE tbl_recovery_responses 
           SET response_text = ?, response_description = ?, 
               response_timestamp = ?, image_url = ?, location_coordinates = ?,
               completed_date = ?, device_id = ?, no_of_visit = ?
           WHERE entry_id = ?`,
          [
            finalResponseText,
            finalDesc,
            new Date(),
            finalImageUrl,
            location_coordinates,
            new Date(),
            device_id,
            no_of_visit,
            existing.entry_id,
          ]
        );

        console.log("Individual response updated for PT:", pt_no);
      } else {
        // INSERT new response
        await connection.query(
          `INSERT INTO tbl_recovery_responses 
           (pt_no, customer_id, agent_id, response_text, response_description, 
            response_timestamp, image_url, location_coordinates, completed_date, 
            device_id, branch_id, no_of_visit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
            no_of_visit,
          ]
        );

        console.log("Individual response inserted for PT:", pt_no);
      }

      // Update isVisited status
      await connection.query(
        `UPDATE tbl_assigned_agents 
         SET isVisited = 1 
         WHERE assigned_agent_id = ? AND pt_no = ?`,
        [agentId, pt_no]
      );

      // Commit transaction
      await connection.commit();

      // Send success response
      res.json({
        success: true,
        message: `Response saved successfully for PT number: ${pt_no}`,
        pt_count: 1,
        pt_numbers: [pt_no],
        customer_id: customer_id,
        timestamp: new Date().toISOString(),
      });

    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error("Error saving individual response:", error);
    
    let statusCode = 500;
    let errorMessage = "Server error while saving individual response";
    
    if (error.code === 'ETIMEDOUT') {
      statusCode = 408;
      errorMessage = "Request timeout - please try again";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get("/get-visited-status/:customerId", authenticateToken, (req, res) => {
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

    pool.query(
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
});

router.get("/get-all-previous-responses/:customerId", authenticateToken, (req, res) => {
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

    pool.query(getPreviousResponsesQuery, [customerId], (err, results) => {
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
});

// GET /get-previous-responses-by-pt/:customerId/:ptNo - Get previous responses for specific PT number
router.get("/get-previous-responses-by-pt/:customerId/:ptNo", authenticateToken, (req, res) => {
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

    pool.query(
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
});

module.exports = router;