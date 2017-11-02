/**
 * @file Application main file
 * @author zdying
 */
'use strict';
const log = require('electron-log');
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

const pluginRoot = path.join(app.getAppPath(), 'node_modules');

const {autoUpdater} = require('electron-updater');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let pluginWindow;
// Deep linked url
let deeplinkingUrl;
// let deeplinkingUrl = 'hiproxy://plugin/noah/26527';
let hiproxyServer;

const {ipcMain} = electron;

global.hiproxy = hiproxy;

log.transports.file.level = 'info';

autoUpdater.logger = log;

log.info('v1.0.2 is coming...');

const App = {
  initialize: function () {
    this.initAppEvent();
    this.initIPCEvent();
  },

  initAppEvent: function () {
    var self = this;
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', this.onready.bind(this));

    app.on('will-finish-launching', function () {
      log.info('will-finish-launching event');
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        log.info('quit application.');
        app.quit();
      }
    });

    app.on('activate', function () {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        self.createWindow();
      }
    });

    // Define custom protocol handler. Deep linking works on packaged versions of the application!
    app.setAsDefaultProtocolClient('hiproxy');

    app.on('open-url', function (event, _url) {
      log.info('open-url event.', _url);

      event.preventDefault();
      deeplinkingUrl = _url;

      log.info('log', 'app.event#open-url', _url);
      log.info('app is ready:', app.isReady());

      if (app.isReady()) {
        this.handleDeepLinkURL(_url);
      }
    }.bind(this));
  },

  initIPCEvent: function () {
    var self = this;

    ipcMain.on('close-main-window', function () {
      app.quit();
    });

    ipcMain.on('load-url', function (eve, url) {
      mainWindow.loadURL(url);
    });

    ipcMain.on('start-hiproxy', function (eve, workspace) {
      log.info('在main中启动hiproxy', workspace);
      // Start a hiproxy server
      self.loadHiproxyPlugins()
        .then(function () {
          self.startHiproxyServer({
            workspace: workspace
          });
        })
        .then(function () {
          mainWindow.loadURL('http://127.0.0.1:6636/?from=start-up');
          mainWindow.setSize(1250, 750);
          mainWindow.center();
        });
    });
  },

  onready: function () {
    log.info('on ready event.', deeplinkingUrl);

    autoUpdater.on('checking-for-update', () => {
      log.info('checking-for-update');
    });
    autoUpdater.on('update-available', (info) => {
      log.info('update-available', info);
    });
    autoUpdater.on('update-not-available', (info) => {
      log.info('update-not-available');
    });
    autoUpdater.on('error', (err) => {
      log.info('error', err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
      log.info('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      // You could call autoUpdater.quitAndInstall(); immediately
      console.log('downloaded..');
    });

    autoUpdater.checkForUpdatesAndNotify();

    if (!deeplinkingUrl) {
      this.createWindow();
      return;
    }

    if (deeplinkingUrl) {
      this.handleDeepLinkURL(deeplinkingUrl);
    }
  },

  handleDeepLinkURL: function (deeplinkingUrl) {
    var obj = url.parse(deeplinkingUrl);
    var hostname = obj.hostname;

    switch (hostname) {
      case 'plugin':
        log.info('load plugin from deep linking url.');
        log.info('plugin url:' + 'http://127.0.0.1:6636' + obj.path);
        log.info('is hiproxy server null :', !hiproxyServer);
        if (!hiproxyServer) {
          this.loadHiproxyPlugins()
            .then(function () {
              log.info('hiproxy plugins load success.');
              this.startHiproxyServer();
            }.bind(this))
            .then(function () {
              log.info('hiproxy proxy server start success.');
              this.createWindow();
              mainWindow.setSize(1250, 750);
              mainWindow.loadURL('http://127.0.0.1:6636/?from=open-plugin');

              pluginWindow = new BrowserWindow({width: 840, height: 515});
              pluginWindow.on('closed', () => {
                pluginWindow = null;
              });

              // Load a remote URL
              pluginWindow.loadURL('http://127.0.0.1:6636' + obj.path);
            }.bind(this))
            .catch(function (err) {
              log.error('[error]', err);
              log.info('[error]', err);
            });
        } else if (pluginWindow) {
          pluginWindow.loadURL('http://127.0.0.1:6636' + obj.path);
        }
        break;
      default:
        log.info('unknow hostname: ' + hostname);
        break;
    }
  },

  createWindow: function () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 600,
      height: 380,
      center: true,
      resizable: false,
      maximizable: false
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
  },

  /**
   * Load hiproxy plugins
   */
  loadHiproxyPlugins: function () {
    return hiproxy.plugin.getInstalledPlugins(pluginRoot).then(function (plugins) {
      if (plugins && plugins.length > 0) {
        hiproxy.plugin.loadPlugins(plugins, {});
      }
    });
  },

  /**
   * Start hiproxy server
   *
   * @returns Promise
   */
  startHiproxyServer: function (options) {
    var Proxy = Server;
    var cliArgs = options || {};
    // var https = cliArgs.https;
    var port = cliArgs.port || 6636;
    var httpsPort = cliArgs.middleManPort || 10011;
    var workspace = cliArgs.workspace || app.getAppPath();

    var proxy = new Proxy(port, httpsPort, workspace);

    global.hiproxyServer = hiproxyServer = proxy;

    // log format
    proxy.logger.on('data', function (level) {
      log.info.call(log, ['[hiproxy]', '[' + level + ']', [].slice.call(arguments, 1)].join(' '));
    });

    return proxy.start(cliArgs).then(function (servers) {
      // proxy.showStartedMessage();

      // var open = cliArgs.open;
      // var browser = open === true ? 'chrome' : open;
      // browser && proxy.openBrowser(browser, proxy.localIP + ':' + port, cliArgs.pacProxy);

      // proxy.addRule('rewrite', ['test.abc.com => {', '  location / {', '    echo "it works";', '  }', '}'].join('\n'));
      // proxy.addRule('hosts', ['127.0.0.1:8000 eight.hiproxy.org', '127.0.0.1 hiproxy.org'].join('\n'));
      return servers;
    });
  }

};

App.initialize();

process.on('uncaughtException', function (error) {
  // Handle the error
  log.info('[uncaughtException]', error);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
