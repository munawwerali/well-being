const {app,Tray,Menu,shell,BrowserWindow} = require("electron"); //electron application stuff
const path = require("path"); //allows for use of path
const url = require("url"); //allows for loadURL and url.format
const iconPath = path.join(__dirname, "/assets/icon.png"); //grab the icon
const fs = require("fs");
const filePath = path.join(__dirname, "/assets/settings.txt");
const electronLocalshortcut = require("electron-localshortcut");

let tray = null; //set the tray to null
let win = null; //set the main window to null
let pref = null;
let abt = null;
var dev = null;

if (process.argv.length === 3) {
  if (process.argv.slice(2).toString().toLowerCase() === "dev") {
    dev = true;
  } else {
    dev = false;
  }

}

function restart() {
  app.relaunch();
  app.isQuiting = true;
  app.quit();
}

function preferencesWindow() {
  pref = new BrowserWindow({
    width: 500,
    height: 730,
    resizable: false
  });
  pref.setMenu(null); //the about window has no menu
  pref.loadURL(url.format({ //loads the webpage for the about window
    pathname: path.join(__dirname, "/pages/preferences.html"),
    protocol: "file:",
    slashes: true
  }));
  if (dev) {
    pref.openDevTools();
  }
  electronLocalshortcut.register(pref, process.platform === "darwin" ? "Cmd+R" : "Ctrl+R", () => {
    restart();
  });
  electronLocalshortcut.register(pref, process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q", () => {
    app.isQuitting = true;
    app.quit();
  });
}

function readFile() {
  var mySettings = [];
  mySettings = fs.readFileSync(filePath, "utf8"); //read in the settings file
  mySettings = (mySettings).split(" "); //split up the settings into an array (each index contains a different setting)
  return mySettings;
}


app.on("ready", function() {






  win = new BrowserWindow({
    width: 800,
    height: 1075,
    resizable: false
  }); //create main window

  win.setMenu(null); //the main window had no menu
  win.loadURL(url.format({ //loads the webpage for the main window
    pathname: path.join(__dirname, "/pages/index.html"),
    protocol: "file:",
    slashes: true
  }));




  //console.log(settings.getAll());
  if (dev) {
    win.openDevTools(); //starts the application with developer tools open
  }



  var mySettings = readFile();

  win.on("minimize", function(event) { //prevents standard minimize function of a main window
    event.preventDefault();
    win.hide();
  });
  win.on("close", function(event) { //prevents the closing of the aplication when the window closes
    if (mySettings[0] === "true") {
      app.quit();
    } else {

      if (!app.isQuiting) {
        event.preventDefault();
        win.hide();
      }

    }
  });

  electronLocalshortcut.register(win, process.platform === "darwin" ? "Cmd+P" : "Ctrl+P", () => {
    preferencesWindow();
  });

  electronLocalshortcut.register(win, process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q", () => {
    app.isQuitting = true;
    app.quit();
  });

  electronLocalshortcut.register(win, process.platform === "darwin" ? "Cmd+R" : "Ctrl+R", () => {
    restart();
  });


  tray = new Tray(iconPath); //create a new tray
  var contextMenu = Menu.buildFromTemplate([ //start buliding out the menu for the tray

    {
      label: "Well-being",
      click: function() { //makes the main window reappear
        win.show();
      }
    },
    {
      label: "About",
      click: function() { //shows the about window
        abt = new BrowserWindow({
          width: 500,
          height: 625,
          resizable: false
        });
        abt.setMenu(null); //the about window has no menu
        abt.loadURL(url.format({ //loads the webpage for the about window
          pathname: path.join(__dirname, "/pages/about.html"),
          protocol: "file:",
          slashes: true
        }));
        if (dev) {
          abt.openDevTools();
        }

      }
    },
    {
      label: "Preferences",
      accelerator: "CommandOrControl+P",
      click: function() { //shows the about window
        preferencesWindow();

      }
    },
    {
      label: "Report a bug...",
      click: function() { //shows the about window
        shell.openExternal("https://github.com/munawwerali/Sandman/issues/new");
      }
    },
    {
      label: "Quit",
      accelerator: "CommandOrControl+Q",
      click: function() { //quit the application
        app.isQuiting = true;
        app.quit(); //quit called

      }
    }
  ]);
  tray.setToolTip("Well-being"); //Honestly no clue but itll make the tray say insomnia in some other place
  tray.setContextMenu(contextMenu); //attach the menu to the tray
});
