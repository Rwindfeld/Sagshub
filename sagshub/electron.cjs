const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

// Start backend server
function startServer() {
  console.log('Starting backend server...');
  
  if (isDev) {
    // Development mode - use tsx
    serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } else {
    // Production mode - use compiled JS
    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
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
    icon: path.join(__dirname, 'assets/icon.png'), // Tilføj et ikon hvis du har et
    title: 'SagsHub - Sags- og Kundestyring',
    show: false // Start skjult indtil server er klar
  });

  // Fjern menu bar
  Menu.setApplicationMenu(null);

  // Vis vindue når det er klar
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    // Development - load from Vite dev server
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // Production - load built files
    // Vent på server er startet
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 5000);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Start server first
  startServer();
  
  // Wait for server to start, then create window
  setTimeout(() => {
    createWindow();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill server process
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
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