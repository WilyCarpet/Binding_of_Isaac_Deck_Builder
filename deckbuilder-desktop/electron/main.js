const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FLASK_URL = 'http://127.0.0.1:5001';
const FRONTEND_URL = 'http://127.0.0.1:4200';
const projectRoot = path.resolve(__dirname, '..');
const backendScript = path.join(projectRoot, 'backend', 'app.py');
const venvPython = path.resolve(projectRoot, '..', '.venv', 'bin', 'python');

// Resolves the packaged PyInstaller backend binary path.
function getPackagedBackendPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(process.resourcesPath, 'backend', `backend${ext}`);
}

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
    let spawnArgs;
    if (app.isPackaged) {
        const binaryPath = getPackagedBackendPath();
        console.log(`[flask] launching packaged backend: ${binaryPath}`);
        spawnArgs = {
            cmd: binaryPath,
            args: [],
            opts: {
                cwd: app.getPath('userData'),
                env: { ...process.env, APP_USER_DATA: app.getPath('userData') },
                stdio: ['ignore', 'pipe', 'pipe']
            }
        };
    } else {
        const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';
        console.log(`[flask] launching backend with: ${pythonCommand}`);
        spawnArgs = {
            cmd: pythonCommand,
            args: [backendScript],
            opts: {
                cwd: projectRoot,
                env: process.env,
                stdio: ['ignore', 'pipe', 'pipe']
            }
        };
    }

    backendProcess = spawn(spawnArgs.cmd, spawnArgs.args, spawnArgs.opts);

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

    if (app.isPackaged) {
        mainWindow.loadFile(
            path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser', 'index.html')
        );
    } else {
        mainWindow.loadURL(FRONTEND_URL);
    }
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

ipcMain.handle('collection:getCards', async () => {
    const response = await fetch(`${FLASK_URL}/collection/cards`);

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to load collection cards: ${body}`);
    }

    return response.json();
});

ipcMain.handle('setup:checkDb', async () => {
    try {
        const response = await fetch(`${FLASK_URL}/health`);
        if (!response.ok) return false;
        const body = await response.json();
        return Boolean(body.db_exists);
    } catch (_err) {
        return false;
    }
});

ipcMain.handle('collection:updateCard', async (_event, cardId, payload) => {
    const response = await fetch(`${FLASK_URL}/collection/cards/${encodeURIComponent(cardId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to update collection card: ${body}`);
    }

    return response.json();
});

const SAVED_CONFIGS_FILE = () => path.join(app.getPath('userData'), 'saved-configs.json');

function readSavedConfigs() {
    try {
        return JSON.parse(fs.readFileSync(SAVED_CONFIGS_FILE(), 'utf8'));
    } catch (_err) {
        return [];
    }
}

ipcMain.handle('config:save', (_event, config) => {
    const configs = readSavedConfigs();
    const idx = configs.findIndex((c) => c.name === config.name);
    if (idx >= 0) {
        configs[idx] = config;
    } else {
        configs.push(config);
    }
    fs.writeFileSync(SAVED_CONFIGS_FILE(), JSON.stringify(configs, null, 2), 'utf8');
    return { ok: true };
});

ipcMain.handle('config:load', () => readSavedConfigs());

ipcMain.handle('config:delete', (_event, name) => {
    const configs = readSavedConfigs().filter((c) => c.name !== name);
    fs.writeFileSync(SAVED_CONFIGS_FILE(), JSON.stringify(configs, null, 2), 'utf8');
    return { ok: true };
});

ipcMain.handle('deck:count', async (_event, payload) => {
    const response = await fetch(`${FLASK_URL}/deck/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to count deck: ${body}`);
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
