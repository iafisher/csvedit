const {app, BrowserWindow} = require('electron')
const fs = require('fs');
const path = require('path')
const Papa = require('papaparse');

function createWindow() {
  const fpath = process.argv[2];
  fs.readFile(fpath, { encoding: 'utf-8' }, (err, data) => {
    if (err) {
      throw err;
    }

    const rows = Papa.parse(data, { skipEmptyLines: true }).data;
    const mainWindow = new BrowserWindow({
      allowRendererProcessReuse: false,
      /* Hide initially before maximizing. */
      show: false,
      title: 'csvedit ' + path,
      webPreferences: {
        nodeIntegration: true,
      }
    });

    mainWindow.maximize();
    mainWindow.show();

    global.sharedObject = {
      path: fpath,
      rows: rows,
    };

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
})
