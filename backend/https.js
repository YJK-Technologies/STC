const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const WebSocket = require("ws");
const sql = require("mssql");
const connection = require("./connection/connection");
const dataRoutes = require("./routes/dataRoutes");

const app = express();
const HTTPS_PORT = 5507;

/* ================= SSL ================= */
const sslOptions = {
  key: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com_key.key")),
  cert: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.crt")),
  ca: fs.readFileSync(path.resolve("C:/Utils/Certificates/STAR.yjktechnologies.com_cert_Nov2025", "STAR.yjktechnologies.com.ca-bundle")),
};

/* ================= Middleware ================= */
app.use(cors());
app.use(express.json());
app.use("/", dataRoutes);

/* ================= HTTPS Server ================= */
const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server });

/* ================= USER HEARTBEAT MAP ================= */
// user_code => lastSeenTimestamp
const activeUsers = new Map();

/* ================= WebSocket ================= */
wss.on("connection", (ws) => {
  console.log("✅ Secure WS connected");

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);

      /* LOGIN */
      if (data.type === "LOGIN" && data.user_code) {
        activeUsers.set(data.user_code, Date.now());
        ws.user_code = data.user_code;

        const pool = await connection.connectToDatabase();
        await pool.request()
          .input("user_code", sql.NVarChar, data.user_code)
          .query(`
            UPDATE tbl_user_info_hdr
            SET is_logged_in = 1
            WHERE user_code = @user_code
          `);

        console.log("👤 Logged in:", data.user_code);
      }

      /* HEARTBEAT */
      if (data.type === "HEARTBEAT" && data.user_code) {
        activeUsers.set(data.user_code, Date.now());
      }

    } catch (err) {
      console.error("❌ WS error:", err.message);
    }
  });

  // ❌ DO NOTHING ON CLOSE (VERY IMPORTANT)
  ws.on("close", () => {
    console.log("⚠️ WS closed (no logout here)");
  });
});

/* ================= HEARTBEAT CHECKER ================= */
setInterval(async () => {
  const now = Date.now();

  for (const [userCode, lastSeen] of activeUsers.entries()) {
    if (now - lastSeen > 20000) { // 20 seconds no heartbeat
      console.log("⏰ Auto logout (tab closed):", userCode);

      try {
        const pool = await connection.connectToDatabase();
        await pool.request()
          .input("user_code", sql.NVarChar, userCode)
          .query(`
            UPDATE tbl_user_info_hdr
            SET is_logged_in = 0
            WHERE user_code = @user_code
          `);
      } catch (err) {
        console.error("❌ Logout error:", err.message);
      } finally {
        activeUsers.delete(userCode);
      }
    }
  }
}, 5000);

/* ================= START SERVER ================= */
server.listen(HTTPS_PORT, () => {
  console.log(`🚀 HTTPS + WSS running on port ${HTTPS_PORT}`);
});
