const supabase = require("../utils/dbConnection");

const getDriverProfile = async (req, res) => {
  try {
    const { driverId } = req.params;

    // =========================
    // DRIVER + COMPANY
    // =========================
    const { data: driver, error: driverError } = await supabase
      .from("driver")
      .select(`
        driver_id,
        driver_name,
        driver_code,
        profile_image,
        current_score,
        company:company_id (
          company_name,
          logo_path
        )
      `)
      .eq("driver_id", driverId)
      .single();

    if (driverError || !driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // =========================
    // ALL MISBEHAVIORS
    // =========================
    const now = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 7);

    const { data: allMisbehaviors, error: misbehaviorError } = await supabase
      .from("misbehavior")
      .select(`
        misbehavior_id,
        detected_at,
        misbehavior_type (
          behavior_name,
          severity_score
        )
      `)
      .eq("driver_id", driverId)
      .order("detected_at", { ascending: false });

    if (misbehaviorError) {
      console.log(misbehaviorError);
    }

    // =========================
    // TODAY HISTORY
    // =========================
    const todayHistory = (allMisbehaviors || []).filter((item) => {
      return new Date(item.detected_at) >= today;
    });

    // =========================
    // LAST 7 DAYS HISTORY
    // =========================
    const last7DaysHistory = (allMisbehaviors || []).filter((item) => {
      const detected = new Date(item.detected_at);
      return detected >= last7Days && detected < today;
    });

    // =========================
    // MONTHLY HISTORY
    // =========================
    const monthlyHistory = {};

    (allMisbehaviors || []).forEach((item) => {
      const date = new Date(item.detected_at);

      const monthName = date.toLocaleString("default", {
        month: "long",
      });

      if (!monthlyHistory[monthName]) {
        monthlyHistory[monthName] = [];
      }

      monthlyHistory[monthName].push({
        id: item.misbehavior_id,
        behavior_name: item.misbehavior_type?.behavior_name || "Unknown",
        severity: item.misbehavior_type?.severity_score || 0,
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });

    // =========================
    // NOTIFICATIONS COUNT
    // =========================
    const { count: notificationsCount } = await supabase
      .from("notification")
      .select("*", { count: "exact", head: true })
      .eq("driver_id", driverId)
      .eq("is_read", false);

    // =========================
    // MONTHLY SCORES
    // =========================
    const currentYear = new Date().getFullYear();

    const { data: monthlyScores } = await supabase
      .from("monthly_score")
      .select("month, score")
      .eq("driver_id", driverId)
      .eq("year", currentYear)
      .order("month", { ascending: true });

    // =========================
    // FINAL RESPONSE
    // =========================
    return res.json({
      driver: {
        driver_id: driver.driver_id,
        driver_name: driver.driver_name,
        driver_code: driver.driver_code,
        company_name: driver.company.company_name,
        profile_image: driver.profile_image,
        app_logo: driver.company.logo_path,
        current_score: driver.current_score,
      },

      notificationsCount: notificationsCount || 0,

      history: {
        today: todayHistory.map((item) => ({
          id: item.misbehavior_id,
          behavior_name: item.misbehavior_type?.behavior_name || "Unknown",
          severity: item.misbehavior_type?.severity_score || 0,
          time: new Date(item.detected_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),

        last7Days: last7DaysHistory.map((item) => ({
          id: item.misbehavior_id,
          behavior_name: item.misbehavior_type?.behavior_name || "Unknown",
          severity: item.misbehavior_type?.severity_score || 0,
          time: new Date(item.detected_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),

        monthlyHistory,
      },

      monthlyScores:
        monthlyScores?.map((m) => ({
          month: m.month,
          score: m.score,
        })) || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDriverProfile,
};