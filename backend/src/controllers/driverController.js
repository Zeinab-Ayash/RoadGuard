const bcrypt = require("bcrypt");
const crypto = require("crypto");

const supabase = require("../utils/dbConnection");
const { signToken } = require("../utils/jwt");


// ==============================
// 🔹 DRIVER CODE GENERATOR
// ==============================
const generateDriverCode = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DV-${num}`;
};


// ==============================
// ➕ ADD DRIVER
// ==============================
const addDriver = async (req, res) => {
  try {
    const { driver_name, phone } = req.body;
    const companyId = req.user.id;

    if (!driver_name || !phone) {
      return res.status(400).json({
        message: "driver_name and phone are required",
      });
    }

    for (let i = 0; i < 5; i++) {
      const driver_code = generateDriverCode();

      const plainPassword = crypto.randomBytes(5).toString("hex");
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const { data, error } = await supabase
        .from("driver")
        .insert([
          {
            company_id: companyId,
            driver_name,
            phone,
            driver_code,
            password: hashedPassword,
            profile_image: null,
            current_score: 100,
            is_active: true, // ✅ important
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({
          message: "Driver created successfully",
          driver: {
            driver_id: data.driver_id,
            driver_name: data.driver_name,
            phone: data.phone,
            driver_code: data.driver_code,
            password: plainPassword,
          },
        });
      }

      if (error && error.code !== "23505") {
        console.error(error);
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message: "Failed to generate unique driver code",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ==============================
// 🔐 DRIVER LOGIN
// ==============================
const loginDriver = async (req, res) => {
  try {
    const { driver_code, password } = req.body;

    if (!driver_code || !password) {
      return res.status(400).json({
        message: "driver_code and password are required",
      });
    }

    const cleanCode = driver_code.trim().toUpperCase();

    const { data: driver, error } = await supabase
      .from("driver")
      .select("*")
      .eq("driver_code", cleanCode)
      .single();

    if (error || !driver) {
      return res.status(401).json({
        message: "Invalid driver code",
      });
    }

    // ❌ prevent login if deactivated
    if (driver.is_active === false) {
      return res.status(403).json({
        message: "Driver account is deactivated",
      });
    }

    const isMatch = await bcrypt.compare(password, driver.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = signToken({
      id: driver.driver_id,
      role: "driver",
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        driver_id: driver.driver_id,
        driver_name: driver.driver_name,
        driver_code: driver.driver_code,
        phone: driver.phone,
        current_score: driver.current_score,
      },
      role: "driver",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};





// ==============================
// 🚫 DEACTIVATE DRIVER (NEW)
// ==============================

const deactivateDriver = async (req, res) => {
  console.log("🔥 HIT DEACTIVATE DRIVER");
  console.log("USER:", req.user);
  console.log("PARAMS:", req.params);

  try {
    const driverId = req.params.id; // driver_id from URL
    const companyId = req.user.id;   // company_id from token
    const role = req.user.role;

    // ✅ Only companies can deactivate
    if (role !== "company") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ Check if driver exists and belongs to this company
    const { data: driverCheck, error: checkError } = await supabase
      .from("driver")
      .select("company_id, status, driver_name")
      .eq("driver_id", driverId)
      .single();

    if (checkError || !driverCheck) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driverCheck.company_id !== companyId) {
      return res.status(403).json({ message: "You do not own this driver" });
    }

    // ✅ Update the driver status to inactive
    const { data, error } = await supabase
      .from("driver")
      .update({ status: "inactive" })
      .eq("driver_id", driverId)
      .select("driver_id, driver_name, status")
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: `Driver "${data.driver_name}" has been deactivated successfully`,
      driver: data,
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
// ==============================
// EXPORTS
// ==============================
module.exports = {
  addDriver,
  loginDriver,
  deactivateDriver,
};