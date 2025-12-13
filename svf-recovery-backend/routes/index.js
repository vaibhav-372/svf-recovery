const express = require("express");
const authRoutes = require("./auth");
const customerRoutes = require("./customers");
const uploadRoutes = require("./upload");
const responseRoutes = require("./responses");
const historyRoutes = require("./history");

const router = express.Router();

// Mount all routes
router.use(authRoutes);
router.use(customerRoutes);
router.use(uploadRoutes);
router.use(responseRoutes);
router.use(historyRoutes);

module.exports = router;