/**
 * @file welcome page script
 * @author zdying
 */
'use strict';

var electron = require('electron');
var ipcRenderer = electron.ipcRenderer;
var os = require('os');
var $ = require('./jquery-3.2.1.min');

module.exports = {
  initialize: function () {
    // var $button = document.getElementById('js-start');

    // $button.addEventListener('click', function (eve) {
    //   ipcRenderer.send('start-hiproxy', process.cwd());
    // });

    ipcRenderer.on('log', function (eve) {
      console.log.apply(console, [].slice.call(arguments, 1));
    });

    var $workspaceInput = $('#js-workspace-input');

    $('#js-workspace').on('click', 'a', function (eve) {
      var $target = $(eve.currentTarget);
      var data = $target.data();
      var dir = data.dir;

      if (dir === 'user-home') {
        ipcRenderer.send('start-hiproxy', os.homedir());
      } else if (dir === 'custom') {
        $workspaceInput.click();
      }
    });

    $workspaceInput.on('change', function (eve) {
      var choosedPath = $workspaceInput[0].files[0].path;
      ipcRenderer.send('start-hiproxy', choosedPath);
    });

    $('a.outer-link').on('click', function (eve) {
      var url = $(eve.currentTarget).prop('href');
      electron.shell.openExternal(url);
      return false;
    });
  }
};
