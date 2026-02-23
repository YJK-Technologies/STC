// app.js
// const express = require("express");
// const cors = require("cors");
// const dataRoutes = require("./routes/dataRoutes");
// const app = express();
// const PORT = 5502;

// app.use(cors());
// app.use(express.json({limit:'10mb'}));

// app.use("/", dataRoutes);


// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// backend/server.js
// const express = require("express");
// const cors = require("cors");
// const http = require("http");
// const WebSocket = require("ws");
// const sql = require("mssql");
// const connection = require("./connection/connection");
// const dataRoutes = require("./routes/dataRoutes");

// const app = express();
// const PORT = 5502;

// app.use(cors());
// app.use(express.json({ limit: "10mb" }));
// app.use("/", dataRoutes);

// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });

// // 🔹 Store active users (user_code → WebSocket)
// const activeUsers = new Map();

// // ✅ WebSocket connection event
// wss.on("connection", (ws) => {
//   console.log("✅ New WebSocket connected");

//   // Mark alive when connected
//   ws.isAlive = true;

//   // Listen for heartbeat from client
//   ws.on("pong", () => {
//     ws.isAlive = true;
//   });

//   // Listen for messages from frontend
//   ws.on("message", async (msg) => {
//     try {
//       const data = JSON.parse(msg);

//       // When client logs in
//       if (data.type === "LOGIN" && data.user_code) {
//         activeUsers.set(data.user_code, ws);
//         console.log(`👤 User logged in via WS: ${data.user_code}`);

//         const pool = await connection.connectToDatabase();
//         await pool
//           .request()
//           .input("user_code", sql.NVarChar, data.user_code)
//           .query(`
//             UPDATE tbl_user_info_hdr 
//             SET is_logged_in = 1
//             WHERE user_code = @user_code
//           `);
//       }
//     } catch (err) {
//       console.error("❌ WebSocket message error:", err.message);
//     }
//   });

//   // Handle clean disconnection
//   ws.on("close", async () => {
//     for (const [userCode, socket] of activeUsers.entries()) {
//       if (socket === ws) {
//         console.log(`⚠️ WebSocket disconnected for user: ${userCode}`);

//         try {
//           const pool = await connection.connectToDatabase();
//           await pool
//             .request()
//             .input("user_code", sql.NVarChar, userCode)
//             .query(`
//               UPDATE tbl_user_info_hdr
//               SET is_logged_in = 0
//               WHERE user_code = @user_code
//             `);

//           console.log(`✅ User ${userCode} marked as logged out`);
//         } catch (err) {
//           console.error("❌ Logout update error:", err.message);
//         } finally {
//           activeUsers.delete(userCode);
//         }
//       }
//     }
//   });
// });

// // ✅ Heartbeat checker every 10 seconds
// const interval = setInterval(() => {
//   wss.clients.forEach((ws) => {
//     if (ws.isAlive === false) {
//       console.log("⚠️ No heartbeat — terminating socket...");
//       ws.terminate(); // triggers ws.on('close')
//       return;
//     }
//     ws.isAlive = false;
//     ws.ping();
//   });
// }, 10000);

// wss.on("close", () => clearInterval(interval));

// server.listen(PORT, () => {
//   console.log(`🚀 Server + WebSocket running on port ${PORT}`);
// });

//07-10-25
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const sql = require("mssql");
const connection = require("./connection/connection"); // your DB connection
const dataRoutes = require("./routes/dataRoutes");

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/", dataRoutes);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const users = new Map(); // user_code → lastSeen

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "LOGIN") {
      users.set(data.user_code, Date.now());
      const pool = await connection.connectToDatabase();
      await pool.request()
        .input("user_code", sql.NVarChar, data.user_code)
        .query(`UPDATE tbl_user_info_hdr SET is_logged_in = 1 WHERE user_code=@user_code`);
    }

    if (data.type === "HEARTBEAT") {
      users.set(data.user_code, Date.now());
    }
  });
});

// 🔥 HEARTBEAT CHECK (TAB CLOSE / BROWSER CLOSE)
setInterval(async () => {
  const now = Date.now();
  for (const [userCode, lastSeen] of users.entries()) {
    if (now - lastSeen > 5000) { // 20 sec
      const pool = await connection.connectToDatabase();
      await pool.request()
        .input("user_code", sql.NVarChar, userCode)
        .query(`UPDATE tbl_user_info_hdr SET is_logged_in = 0 WHERE user_code=@user_code`);
      users.delete(userCode);
      console.log("✅ Auto logout (tab closed):", userCode);
    }
  }
}, 5000);

server.listen(5500, () =>
  console.log("🚀 HTTP + WS running on 5500")
);