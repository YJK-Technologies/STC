import './build'
const { app, BrowserWindow } = require("electron");
const { exec } = require("child_process");
const path = require("path");

let mainWindow;

app.whenReady().then(() => {
  // Start the backend server
  exec("node ../backend/server.js", (err, stdout, stderr) => {
    if (err) {
      console.error("Error starting backend:", stderr);
    } else {
      console.log("Backend started:", stdout);
    }
  });

  // Create Electron window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Load the React build file
  mainWindow.loadURL(`file://${path.join(__dirname, "build", "index.html")}`);
  console.log("Loading URL:", `file://${path.join(__dirname, "build", "index.html")}`);
});
