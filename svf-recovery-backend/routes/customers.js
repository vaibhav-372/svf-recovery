const express = require("express");
const { promisePool } = require("../utils/database"); 
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get customer data for specific agent (PROTECTED ROUTE)
router.get("/customers", authenticateToken, async (req, res) => {
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

    const [results] = await promisePool.query(getCustomersQuery, [agentId]);

    console.log(`Found ${results.length} customers for agent ${agentId}`);

    res.json({
      success: true,
      customers: results,
      total: results.length,
      agentId: agentId,
    });
  } catch (error) {
    console.error("Server error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get all PT numbers/loans for a specific customer (PROTECTED ROUTE)
router.get(
  "/customers/:customerId/loans",
  authenticateToken,
  async (req, res) => {
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

      const [results] = await promisePool.query(getCustomerLoansQuery, [
        customerId,
        agentId,
      ]);

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
    } catch (error) {
      console.error("Server error fetching customer loans:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Get all PT numbers/loans for a specific customer by name (PROTECTED ROUTE)
router.get(
  "/customers/:customerName/loans-by-name",
  authenticateToken,
  async (req, res) => {
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

      const [results] = await promisePool.query(getCustomerLoansQuery, [
        customerName,
        agentId,
      ]);

      console.log(`Found ${results.length} loans for customer ${customerName}`);

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
    } catch (error) {
      console.error("Server error fetching customer loans by name:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// GET /api/get-existing-responses/:customerId - Get existing responses for all PT numbers
router.get(
  "/api/get-existing-responses/:customerId",
  authenticateToken,
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const agentId = req.user.userId;

      console.log("Getting existing responses for customer:", customerId);
      console.log("Agent ID:", agentId);

      // First, let's verify the agent exists and get their details
      const agentQuery = `
        SELECT entry_id, user_name 
        FROM tbl_emp_profile 
        WHERE entry_id = ? AND emp_role = 'agent' AND status = 'active' AND isDeleted = 0
      `;

      const [agentResults] = await promisePool.query(agentQuery, [agentId]);

      if (agentResults.length === 0) {
        console.log("Agent not found or inactive:", agentId);
        return res.status(403).json({
          success: false,
          message: "Agent not found or inactive",
        });
      }

      // Get existing responses for this customer and agent
      const getResponsesQuery = `
        SELECT 
          trr.pt_no,
          trr.response_text,
          trr.response_description,
          trr.image_url,
          trr.response_timestamp,
          trr.no_of_visit,
          trr.latitude,
          trr.longitude
        FROM 
          tbl_recovery_responses AS trr
        INNER JOIN tbl_assigned_agents AS taa ON 
          trr.pt_no = taa.pt_no 
          AND trr.agent_id = taa.assigned_agent_id
        WHERE 
          trr.customer_id = ?
          AND trr.agent_id = ?
          AND taa.status = 'active'
          AND taa.isDeleted = 0
        ORDER BY 
          trr.response_timestamp DESC
        LIMIT 1
      `;

      const [responseResults] = await promisePool.query(getResponsesQuery, [
        customerId,
        agentId,
      ]);

      const existingResponses = {};

      if (responseResults.length > 0) {
        const row = responseResults[0];
        existingResponses[row.pt_no] = {
          response_text: row.response_text,
          response_description: row.response_description,
          image_url: row.image_url,
          response_timestamp: row.response_timestamp,
          no_of_visit: row.no_of_visit,
          latitude: row.latitude,
          longitude: row.longitude,
        };
      }

      console.log(
        "Found existing responses:",
        Object.keys(existingResponses).length
      );

      res.json({
        success: true,
        existingResponses: existingResponses,
        total: Object.keys(existingResponses).length,
      });
    } catch (error) {
      console.error("Error getting existing responses:", error);
      res.status(500).json({
        success: false,
        message: "Error getting existing responses",
        error: error.message,
      });
    }
  }
);

module.exports = router;
