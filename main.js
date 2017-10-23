/**
 * @file Application main file
 * @author zdying
 */
'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
// const http = require('http');
const url = require('url');

const hiproxy = require('hiproxy');
const Server = hiproxy.Server;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let hiproxyServer;
const {ipcMain} = electron;

global.hiproxy = hiproxy;

ipcMain.on('close-main-window', function () {
  app.quit();
});

ipcMain.on('load-url', function (eve, url) {
  mainWindow.loadURL(url);
});

ipcMain.on('start-hiproxy', function (eve, workspace) {
  console.log('在main中启动hiproxy', workspace);
  // Start a hiproxy server
  loadHiproxyPlugins()
    .then(function () {
      startHiproxyServer({
        workspace: workspace
      });
    })
    .then(function () {
      mainWindow.loadURL('http://127.0.0.1:6636/?from=start-up');
      mainWindow.setSize(1280, 867);
      mainWindow.center();
    });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    console.log('quit application.');
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

function createWindow () {
  // Start a test server.
  // http.createServer(function (request, response) {
  //   console.log(request.method, request.url);
  //   response.end(request.method + ' ==> ' + request.url);
  // }).listen(6636);

  // Start a hiproxy server
  // loadHiproxyPlugins().then(startHiproxyServer);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 380,
    center: true
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app', 'welcome.html'),
    protocol: 'file:',
    slashes: true
  }));
  // mainWindow.loadURL(
  //   'http://127.0.0.1:6636/?from=start-up'
  // );

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.

    // hiproxyServer && hiproxyServer.stop();
    // mainWindow = null;
    app.quit();
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

/**
 * Load hiproxy plugins
 */
function loadHiproxyPlugins () {
  return hiproxy.plugin.getInstalledPlugins().then(function (plugins) {
    if (plugins && plugins.length > 0) {
      hiproxy.plugin.loadPlugins(plugins, {});
    }
  });
}

/**
 * Start hiproxy server
 *
 * @returns Promise
 */
function startHiproxyServer (options) {
  var Proxy = Server;
  var cliArgs = options || {};
  // var https = cliArgs.https;
  var port = cliArgs.port || 6636;
  var httpsPort = cliArgs.middleManPort || 10011;
  var workspace = cliArgs.workspace || process.cwd();

  var proxy = new Proxy(port, httpsPort, workspace);

  global.hiproxyServer = hiproxyServer = proxy;

  // log format
  // proxy.logger.on('data', showLog);

  return proxy.start(cliArgs).then(function (servers) {
    // proxy.showStartedMessage();

    // var open = cliArgs.open;
    // var browser = open === true ? 'chrome' : open;
    // browser && proxy.openBrowser(browser, proxy.localIP + ':' + port, cliArgs.pacProxy);

    // proxy.addRule('rewrite', ['test.abc.com => {', '  location / {', '    echo "it works";', '  }', '}'].join('\n'));
    // proxy.addRule('hosts', ['127.0.0.1:8000 eight.hiproxy.org', '127.0.0.1 hiproxy.org'].join('\n'));
    return servers;
  }).catch(function (err) {
    proxy.logger.error('Server start failed:', err.message);
    proxy.logger.detail(err.stack);
  });
}
