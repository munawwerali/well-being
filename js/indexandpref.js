const notifier = require("electron-notifications"); //allow for notifications
const path = require("path"); //allow for use of path
const os = require("os");
const exec = require("child_process").exec; //allows the shutdown of the host machine
const schedule = require("node-schedule"); //allows for jobs scheduled at certain times
const { shell } = require("electron"); // remote removed; quit handled via preload IPC
const settings = require("electron-settings");
const fs = require("fs");
const iconPath = path.join(__dirname, "../assets/", "sleep.png"); //grabs the icon for notifications
const audio = new Audio(path.join(__dirname, "../assets/", "alert.mp3")); //set up notification sound
const filePath = path.join(__dirname, "../assets/", "settings.txt");

var i = null;
var restNotification = false;
var upTimeNotification = false;
var seenRelease = false; //checks if user has already seen update exists and ignored
var jobs = []; //array of node schedule jobs to be ran
jobs.fill(null);
var latestRelease = null;
var upTimeJob = null;
var resetTime = null;

function quit() {
  // Use secure preload-exposed API instead of remote
  if (window.wellbeing && typeof window.wellbeing.quit === 'function') {
    window.wellbeing.quit();
  }
}
function militaryToStandard(hours) {
  /* make sure add radix*/
  var hours = ((hours + 11) % 12) + 1; //determine standard version of military time
  return hours; //return the hours in this new formatting
}


function ampm(hours24) {
  hours24 = parseInt(hours24, 10); //grab hours in military time version
  if (hours24 > 11) //determine meridian
  {
    return "pm"; //return meridian string
  } else {
    return "am"; //return meridian string
  }
}

function nodeJobs(sleepTimes) {

  //for (i = 0; i < 6; i++) {
    try {
      if (jobs[0] != null) {
        jobs[0].cancel(); //try to cancel respective job
      }
    } catch (e) {
      console.log(e);
    }
    var notiTime = sleepTimes;
    jobs[0] = schedule.scheduleJob(notiTime+" * * * * *", function () {
      checkToShowNotification(notiTime);
    }); //scheduling notification jobs
 // }
  try {
    if (jobs[1] != null) {
      jobs[1].cancel();
    }
    if (upTimeJob != null) {
      upTimeJob.cancel();
    }
  } catch (e) {
    console.log(e);
  }
  jobs[1] = schedule.scheduleJob(resetTime, setTime);
  if (settings.get("upTime") === "true") {
    upTimeJob = schedule.scheduleJob("0 0 * * * *", function () {
      upTimeJobs();

    });
  }


  return;
}

function checkToShowNotification(notiTime) {
    showNotification();
}



function generateEyeBreakTimes() {
  var time = document.getElementById("alarmTime").value;
  var splitTime = time.split(":"); //split time into hours and minutes
 // var wakeUpDate = new Date(); //set a new date object
  var breakTime = [];
  breakTime = Number(splitTime[0])*60+Number(splitTime[1]);
  return breakTime;
}


function setTime() { //called when set wakeup time button is pressed
  settings.set("Version", "v1.0.0");
  var sleepTimes = generateEyeBreakTimes(); //determine sleepTimes based off of wakeuptime
  nodeJobs(sleepTimes); //set up node-schedule jobs
  return;
}

function writeFile(settingsData) {
  fs.writeFile(filePath, settingsData, (err) => { //write the settings file that will contain the settingsData parameter
    if (err) {
      console.log(err);
    }
  });
  try //for error catching
  {
    fs.chmodSync(filePath, "777"); //set up permissions (seems to fix issue of linux reading settings after install)
  } catch (e) {
    console.log(e); //log this error to the console (basically occurs everytime after the first run)
  }
  return;
}

function readPreferences() {
  document.getElementById("alarmTime").value = settings.get("defaultTime", "00:30"); //set the time on the DOM
  setTime(); //run the main function to generate and show sleep time
  return;
}

function loadPreferences() {
  
  if (settings.get("closeOnX", "true") === "true") {
    document.getElementById("closeOnXcheck").checked = true; //set checkbox
  } else {
    document.getElementById("closeOnXcheck").checked = false; //set check box
  }

 
  document.getElementById("defaultTime").value = settings.get("defaultTime", "00:20"); //set time to preference time
  document.getElementById("waterMinutes").value = settings.get("waterMinutes", "00:30");
  return;
}



function setPreferences() {
  document.getElementById("restartDiv").style.visibility = "visible";
  settings.set("defaultTime", document.getElementById("defaultTime").value);
  settings.set("closeOnX", (document.getElementById("closeOnXcheck").checked).toString());
  settings.set("waterMinutes", document.getElementById("waterMinutes").value);
  var tempstring = settings.get("closeOnX") + " Well-being";
  writeFile(tempstring);
  return;
  //console.log(settings.getAll());
}






function showNotification() {
  if (!restNotification) {
    restNotification = true;
    try {
      audio.play(); //play notifiation sound
    } catch (e) {
      console.log(e);
    }
    const notification = notifier.notify("Well-being", { //Notification
      message: "Time to rest",
      icon: iconPath,
      buttons: ["Dismiss"],//, "Shutdown"
      vetical: true,
      duration: 99999999999999, //max number this would take
    });

    notification.on("clicked", () => { //how to behave when notification is clicked
      notification.close();
      restNotification = false;
    });

    notification.on("swipedRight", () => { //how to behave when notification is swipedRight
      notification.close();
      restNotification = false;
    });

    notification.on("buttonClicked", (text, buttonIndex, options) => { //how to behave if one of the buttons was pressed
      if (text === "Dismiss") {
        notification.close(); //close the notification
        restNotification = false;
      } else if ("Shutdown Computer") {
        confirmShutdownNotification(); //check to confirm computer shutdown
        notification.close();
        restNotification = false;
      }

    });
  }
  return;
}

function getLatestReleaseInfo() {
  if (!seenRelease) //if they havent seen the notification before
  {
    $.getJSON("https://api.github.com/repos/alexanderepstein/Sandman/tags").done(function (json) { //grab the latest release information
      var release = json[0].name; //get the newest app version
      latestRelease = release;
      release = release.split("");
      var myversion = settings.get("Version", "v1.9.2").split("");

      if (release[1] > myversion[1]) //check if it matches current app version
      {
        showLatestUpdateNotification("Major Update"); //show the notification
      } else if (release[1] === myversion[1] && release[3] > myversion[3]) {
        showLatestUpdateNotification("Minor Update"); //show the notification
        //console.log(release[3] + " " + myversion[3]);
      } else if (release[1] === myversion[1] && release[3] === myversion[3] && release[5] > myversion[5]) {
        showLatestUpdateNotification("Bugfixes"); //show the notification
        //console.log(release[5] + " " + myversion[5]);
      } else {
        //console.log("Running the latest release of Sandman"); //log it
      }
    });
  }
  seenRelease = true; //we checked or they saw the notification already
  return;
}

function showUpTimeNotification() {
  if (!upTimeNotification) {

    upTimeNotification = true;
    try {
      audio.play(); //play notifiation sound
    } catch (e) {
      console.log(e);
    }
    const notification = notifier.notify("Sandman", { //Notification
      message: "Stay productive, take a short break",
      icon: iconPath,
      buttons: ["Dismiss", "Restart"],
      vetical: true,
      duration: 99999999999999,
    });

    notification.on("clicked", () => { //how to behave when notification is clicked
      upTimeNotification = false;
      notification.close();
    });

    notification.on("swipedRight", () => { //how to behave when notification is swipedRight
      upTimeNotification = false;
      notification.close();
    });

    notification.on("buttonClicked", (text, buttonIndex, options) => { //how to behave if one of the buttons was pressed
      if (text === "Dismiss") {
        upTimeNotification = false;
        notification.close(); //close the notification
      } else if ("Restart") {
        confirmRestartNotification();
        notification.close();
        upTimeNotification = false;

      }

    });
  }
  return;
}

function confirmShutdownNotification() {
  try {
    audio.play(); //play notifiation sound
  } catch (e) {
    console.log(e);
  }
  const notification = notifier.notify("Sandman", { //Notification
    message: "Confirm Shutdown",
    icon: iconPath,
    buttons: ["Cancel", "Confirm"],
    vetical: true,
    duration: 20000,
  });

  notification.on("clicked", () => { //how to behave when notification is clicked
    notification.close();
  });

  notification.on("swipedRight", () => { //how to behave when notification is swipedRight
    notification.close();
  });

  notification.on("buttonClicked", (text, buttonIndex, options) => { //how to behave if one of the buttons was pressed
    if (text === "Cancel") {
      notification.close(); //close the notification
    } else if ("Confirm") {
      shutdown(); //shutdown the computer
    }

  });
  return;
}

function confirmRestartNotification() {
  try {
    audio.play(); //play notifiation sound
  } catch (e) {
    console.log(e);
  }
  const notification = notifier.notify("Sandman", { //Notification
    message: "Confirm Restart",
    icon: iconPath,
    buttons: ["Cancel", "Confirm"],
    vetical: true,
    duration: 20000,
  });

  notification.on("clicked", () => { //how to behave when notification is clicked
    notification.close();
  });

  notification.on("swipedRight", () => { //how to behave when notification is swipedRight
    notification.close();
  });

  notification.on("buttonClicked", (text, buttonIndex, options) => { //how to behave if one of the buttons was pressed
    if (text === "Cancel") {
      notification.close(); //close the notification
    } else if ("Confirm") {
      restart(); //shutdown the computer
    }

  });
  return;
}

function showLatestUpdateNotification(updateType) {
  try {
    audio.play(); //play notifiation sound
  } catch (e) {
    console.log(e);
  }
  const notification = notifier.notify("Sandman", { //Notification
    message: updateType + " Available",
    icon: iconPath,
    buttons: ["Dismiss", "Update Page"],
    vetical: true,
    duration: 20000,
  });

  notification.on("clicked", () => { //how to behave when notification is clicked
    notification.close();
  });

  notification.on("swipedRight", () => { //how to behave when notification is swipedRight
    notification.close();
  });

  notification.on("buttonClicked", (text, buttonIndex, options) => { //how to behave if one of the buttons was pressed
    if (text === "Dismiss") {
      notification.close(); //close the notification
    } else if ("Update Page") {
      shell.openExternal("https://github.com/alexanderepstein/Sandman/releases/tag/" + latestRelease);
    }

  });
  return;
}


function shutdown(callback) {
  exec("shutdown now", function (error, stdout, stderr) {
    callback(stdout);
  }); //shutsdown the computer
  return;
}

function restart(callback) {
  exec("shutdown now -r", function (error, stdout, stderr) {
    callback(stdout);
  }); //restarts the computer
  return;
}

function upTimeJobs() {
  var uptime = os.uptime(); // uptime of computer in seconds
  uptime = (uptime / 60) / 60; //turn it into hours
  var mins = parseFloat(settings.get("upTimeMinutes"));
  mins = mins / 60;
  var hours = parseFloat(settings.get("upTimeHours"));
  var time = hours + mins;
  if (uptime >= time) //if computer has been on longer then 12 hours reccomend a restart
  {
    showUpTimeNotification(); //show the notification
  }
  return;
}
