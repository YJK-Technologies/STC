// // frontend/src/hooks/websocket.js
// let socket = null;

// // Use your actual backend IP or domain here
// const WS_URL = "ws://192.168.29.123:5502"; // replace with your server IP

// export const initWebSocket = (user_code) => {
//   if (!user_code) return;

//   socket = new WebSocket(WS_URL);

//   socket.onopen = () => {
//     console.log("✅ WebSocket connected");
//     socket.send(JSON.stringify({ type: "LOGIN", user_code }));
//   };

//   socket.onclose = () => {
//     console.log("⚠️ WebSocket disconnected");
//   };

//   socket.onerror = (err) => {
//     console.error("❌ WebSocket error:", err);
//   };
// };

// export const closeWebSocket = () => {
//   if (socket) {
//     socket.close();
//     socket = null;
//   }
// };



//07-10-25 morning
// let socket = null;
// let heartbeatInterval = null;

// export const initWebSocket = (user_code) => {
//   if (!user_code) return;

//   socket = new WebSocket("ws://192.168.29.123:5502");
//   // socket = new WebSocket("wss://erpdev.yjktechnologies.com:5502");

//   socket.onopen = () => {
//     console.log("✅ Secure WebSocket (WSS) connected");
//     socket.send(JSON.stringify({ type: "LOGIN", user_code }));

//     // Client heartbeat every 2-3 seconds
//     heartbeatInterval = setInterval(() => {
//       if (socket.readyState === WebSocket.OPEN) {
//         socket.send(JSON.stringify({ type: "HEARTBEAT", user_code }));
//       }
//     }, 2000);
//   };

//   socket.onclose = () => {
//     console.log("⚠️ Secure WebSocket disconnected");
//     clearInterval(heartbeatInterval);
//   };

//   socket.onerror = (err) => {
//     console.error("❌ Secure WebSocket error:", err);
//   };
// };

// export const closeWebSocket = () => {
//   if (socket) {
//     socket.close();
//     socket = null;
//     clearInterval(heartbeatInterval);
//   }
// };


//16-10-25
let socket = null;
let heartbeatInterval = null;

export const initWebSocket = (user_code) => {
  if (!user_code) return;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.protocol === "https:"
    ? "erpdev.yjktechnologies.com:5507"
    : "localhost:5500";

  socket = new WebSocket(`${protocol}://${host}`);

  socket.onopen = () => {
    console.log("✅ WS connected");
    socket.send(JSON.stringify({ type: "LOGIN", user_code }));

    heartbeatInterval = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "HEARTBEAT", user_code }));
      }
    }, 5000); // 5 seconds
  };

  socket.onclose = () => {
    console.log("⚠️ WS closed");
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    socket = null;
  };

  socket.onerror = () => {
    clearInterval(heartbeatInterval);
  };
};

export const closeWebSocket = () => {
  clearInterval(heartbeatInterval);
  heartbeatInterval = null;
  if (socket) socket.close();
  socket = null;
};
