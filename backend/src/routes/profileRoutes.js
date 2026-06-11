const express = require("express");

const router = express.Router();

const {
  getDriverProfile,
} = require("../controllers/profileController");

router.get("/driver/:driverId", getDriverProfile);

module.exports = router;