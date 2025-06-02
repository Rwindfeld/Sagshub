const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

// Get the correct app directory
function getAppPath() {
  return __dirname;
}

// Start backend server directly with Node.js
function startServer() {
  console.log('Starting SagsHub server...');
  
  const appPath = getAppPath();
  const serverPath = path.join(appPath, 'dist', 'index.js');
  
  console.log('App path:', appPath);
  console.log('Server path:', serverPath);
  
  // Check if server file exists
  if (!fs.existsSync(serverPath)) {
    console.error('Server file not found:', serverPath);
    console.log('Available files in app path:');
    try {
      const files = fs.readdirSync(appPath);
      console.log(files);
      
      // Check if dist directory exists
      const distPath = path.join(appPath, 'dist');
      if (fs.existsSync(distPath)) {
        console.log('Files in dist directory:');
        const distFiles = fs.readdirSync(distPath);
        console.log(distFiles);
      }
    } catch (err) {
      console.error('Cannot read app path:', err);
    }
    
    showErrorWindow('Server filer ikke fundet. Kontakt support.');
    return;
  }
  
  // Start Node.js directly without using cmd.exe
  console.log('Starting Node.js server directly...');
  
  // Find Node.js executable
  const nodeExe = process.execPath; // Use the same Node.js that Electron uses
  console.log('Using Node.js executable:', nodeExe);
  
  serverProcess = spawn(nodeExe, [serverPath], {
    cwd: appPath,
    stdio: 'pipe',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: '3000'
    }
  });

  serverProcess.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server with Node.js:', err);
    showErrorWindow('Kunne ikke starte server. Kontakt support.');
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0) {
      console.log('Server crashed, trying to restart...');
      setTimeout(() => {
        startServer();
      }, 3000);
    }
  });
}

function showErrorWindow(message) {
  if (mainWindow) {
    mainWindow.loadURL(`data:text/html,<html><head><title>Fejl</title><style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;color:#333;}h1{color:#e74c3c;}</style></head><body><h1>⚠️ Fejl</h1><p>${message}</p><p>Prøv at genstarte programmet.</p><button onclick="window.location.reload()">Genstart</button></body></html>`);
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false // Tillad loading fra localhost
    },
    title: 'SagsHub - Sags- og Kundestyring',
    show: false,
    autoHideMenuBar: true, // Skjul menu bar
    icon: path.join(__dirname, 'assets', 'icon.png') // Hvis ikon findes
  });

  // Fjern menu bar helt
  Menu.setApplicationMenu(null);

  // Vis vindue når det er klar
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Load loading page first
  const appPath = getAppPath();
  const loadingPath = path.join(appPath, 'loading.html');
  
  if (fs.existsSync(loadingPath)) {
    mainWindow.loadFile(loadingPath);
  } else {
    // Fallback loading page
    mainWindow.loadURL('data:text/html,<html><head><title>SagsHub</title><style>body{font-family:Arial;text-align:center;padding:50px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;}h1{font-size:2.5em;margin-bottom:20px;font-weight:300;}.spinner{border:4px solid rgba(255,255,255,0.3);border-top:4px solid white;border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite;margin:20px auto;}@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.status{font-size:0.9em;opacity:0.8;margin-top:20px;}</style></head><body><h1>🚀 SagsHub</h1><div class="spinner"></div><p>Starter sags- og kundestyringssystem...</p><div class="status">Initialiserer server...</div></body></html>');
  }

  // Try to connect to server after delay
  setTimeout(() => {
    tryConnectToServer();
  }, 8000); // Vent 8 sekunder på server starter

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function tryConnectToServer() {
  if (!mainWindow) return;
  
  console.log('Trying to connect to server...');
  
  mainWindow.loadURL('http://localhost:3000').catch(err => {
    console.error('Failed to load URL:', err);
    // Show retry message
    mainWindow.loadURL('data:text/html,<html><head><title>SagsHub</title><style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;color:#333;}h1{color:#e74c3c;}.retry{background:#3498db;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;margin:10px;}.retry:hover{background:#2980b9;}</style></head><body><h1>⏳ Venter på server...</h1><p>Serveren starter stadig op. Vent venligst...</p><button class="retry" onclick="window.location.href=\\'http://localhost:3000\\'">Prøv igen</button><button class="retry" onclick="window.location.reload()">Genstart</button></body></html>');
    
    // Retry after 3 seconds
    setTimeout(() => {
      tryConnectToServer();
    }, 3000);
  });
}

app.whenReady().then(() => {
  console.log('App ready, starting server...');
  
  // Start server first
  startServer();
  
  // Wait for server to start, then create window
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill server process
  if (serverProcess) {
    console.log('Killing server process...');
    serverProcess.kill('SIGTERM');
    // Force kill after 3 seconds
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
    }, 3000);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
    console.log('App quitting, killing server...');
    serverProcess.kill('SIGTERM');
  }
});

// Handle app crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 