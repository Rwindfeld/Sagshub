const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Start backend server directly with Node.js
function startServer() {
  console.log('Starting SagsHub server...');
  
  try {
    // Start server directly with Node.js
    const nodePath = process.execPath; // Path to Node.js executable
    const serverScript = path.join(__dirname, 'dist', 'index.js');
    
    console.log('Node path:', nodePath);
    console.log('Server script:', serverScript);
    
    serverProcess = spawn(nodePath, [serverScript], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      
      // Check if server is ready
      if (data.toString().includes('Server successfully listening on port 3000')) {
        console.log('Server is ready, loading app...');
        setTimeout(() => {
          loadApp();
        }, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      if (code !== 0) {
        console.log('Server crashed, attempting restart...');
        setTimeout(() => {
          startServer();
        }, 3000);
      }
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      setTimeout(() => {
        startServer();
      }, 3000);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    setTimeout(() => {
      startServer();
    }, 3000);
  }
}

function loadApp() {
  const appUrl = 'http://localhost:3000';
  console.log('Loading app from:', appUrl);
  
  mainWindow.loadURL(appUrl).catch((error) => {
    console.error('Failed to load URL:', error);
    setTimeout(() => {
      console.log('Retrying server connection...');
      loadApp();
    }, 5000);
  });
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
      webSecurity: true
    },
    title: 'SagsHub - Sags- og Kundestyring',
    show: false,
    autoHideMenuBar: true
  });

  // Fjern menu bar helt
  Menu.setApplicationMenu(null);

  // Load loading screen first
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Start server and then load the app
  startServer();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

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
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
    console.log('Killing server process before quit...');
    serverProcess.kill();
  }
});

// Handle app crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (serverProcess) {
    serverProcess.kill();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 