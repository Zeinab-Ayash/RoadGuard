//new
const bcrypt = require("bcrypt");
const { signToken } = require("../utils/jwt");
const supabase = require("../utils/dbConnection");

/* ================= ME (GET CURRENT USER) ================= */
async function me(req, res) {
  const { id, role } = req.user;

  try {
    // ================= COMPANY =================
    if (role === "company") {
      const { data, error } = await supabase
        .from("company")
        .select(
          "company_id, company_name, email, phone, logo_path, created_at"
        )
        .eq("company_id", id)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: "Company not found" });
      }

      return res.json({
        role: "company",
        user: data,
      });
    }

    // ================= DRIVER =================
    if (role === "driver") {
      const { data, error } = await supabase
        .from("driver")
        .select(
          "driver_id, company_id, driver_name, driver_code, phone, profile_image, current_score, created_at"
        )
        .eq("driver_id", id)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: "Driver not found" });
      }

      return res.json({
        role: "driver",
        user: data,
      });
    }

    return res.status(400).json({
      error: "Invalid role in token",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

module.exports = {
  
  me,
};






































