const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FLASK_URL = 'http://127.0.0.1:5001';
const FRONTEND_URL = 'http://127.0.0.1:4200';
const projectRoot = path.resolve(__dirname, '..');
const backendScript = path.join(projectRoot, 'backend', 'app.py');
const venvPython = path.resolve(projectRoot, '..', '.venv', 'bin', 'python');

let mainWindow;
let backendProcess;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isBackendHealthy() {
    try {
        const response = await fetch(`${FLASK_URL}/health`);
        return response.ok;
    } catch (_err) {
        return false;
    }
}

async function waitForBackend(maxAttempts = 40) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch(`${FLASK_URL}/health`);
            if (response.ok) {
                return;
            }
        } catch (_err) {
            // Continue retrying while Flask starts.
        }
        await delay(250);
    }
    throw new Error('Flask backend did not become healthy in time.');
}

function startBackend() {
    const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';
    console.log(`[flask] launching backend with: ${pythonCommand}`);

    backendProcess = spawn(pythonCommand, [backendScript], {
        cwd: projectRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
        process.stdout.write(`[flask] ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
        process.stderr.write(`[flask] ${data}`);
    });

    backendProcess.on('exit', (code) => {
        console.log(`[flask] exited with code ${code}`);
    });
}

async function ensureBackendRunning() {
    if (await isBackendHealthy()) {
        console.log('[flask] already running, reusing existing backend');
        return;
    }

    startBackend();
    await waitForBackend();
}

function stopBackend() {
    if (!backendProcess || backendProcess.killed) {
        return;
    }
    backendProcess.kill();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error(
            `[electron] failed to load ${validatedURL} (${errorCode}): ${errorDescription}`
        );
    });

    mainWindow.loadURL(FRONTEND_URL);
}

ipcMain.handle('deck:build', async (_event, payload) => {
    const response = await fetch(`${FLASK_URL}/deck/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to build deck: ${body}`);
    }

    return response.json();
});

app.whenReady().then(async () => {
    try {
        await ensureBackendRunning();
        createWindow();
    } catch (error) {
        console.error('[electron] startup failed:', error);
        app.quit();
        return;
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopBackend();
});
