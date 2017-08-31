var today = new Date();
var day;
var dy = 0;
var notifyEnabled;

// Async HTTP GET Function
var HttpClient = function() { // Thanks http://stackoverflow.com/a/22076667/1709894!
  this.get = function(aUrl, aCallback) {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function() {
      if (anHttpRequest.readyState === 4 && anHttpRequest.status === 200) {
        aCallback(anHttpRequest.responseText);
      }
    };

    anHttpRequest.open( "GET", aUrl, true );
    anHttpRequest.send( null );
  };
}

function getLunchInfo(lunchMenu) { // Bypassing CORS using JSONP
  try {
    document.getElementById('lunch-body').innerHTML = (lunchMenu.days[today.getDay() - 1].menu_items[1].food.name);
  } catch (error){
    document.getElementById('lunch-body').innerHTML = "No Lunch Served";
  }
}

function getTimeOfDayMillis(date){
  return date.getHours()*(60*60*1000) + date.getMinutes()*(60* 1000) + date.getSeconds()*(1000) + date.getMilliseconds();
}

function clock(isHalfDay){
  // Thanks to http://stackoverflow.com/a/36524883/1709894 and https://www.w3schools.com/howto/howto_js_countdown.asp
  const start = new Date();
  start.setHours(7, 45, 0, 0);
  const startTime = start.getTime();
  var countDownDate = new Date();
  var time = +countDownDate;

  if (isHalfDay){
    countDownDate.setHours(12,11,10,0);
  } else {
    countDownDate.setHours(14,11,10,0);
  }
  if (countDownDate < time) {
    countDownDate.setDate(countDownDate.getDate() + 1);
  }

// Update the count down every 1 second
var timer = setInterval(function() {
  var currentDate = new Date();
  var now = currentDate.getTime();
  var distance = countDownDate - now;
  var fullDay = countDownDate - startTime;
  var percentThroughDay = (((now-startTime)/fullDay)*100);
  var hours, minutes, seconds;
  if (percentThroughDay > 100 || getTimeOfDayMillis(currentDate) > getTimeOfDayMillis(countDownDate)){
    percentThroughDay = 100;
    hours = 0;
    minutes = 0;
    seconds = 0;
    clearInterval(timer);
    document.getElementById("blockTime").innerHTML = "School Out";
    setStartTimeOut(start);
  }else if(getTimeOfDayMillis(start) > getTimeOfDayMillis(currentDate)){
    percentThroughDay = 0;
    hours = 0;
    minutes = 0;
    seconds = 0;
    clearInterval(timer);
    document.getElementById("blockTime").innerHTML = "School Out";
    setStartTimeOut(start);
  } else{
    hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    seconds = Math.floor((distance % (1000 * 60)) / 1000);

    updateEndBlock();
  }

  document.getElementById("dayTimer").innerHTML = hours + "h " + minutes + "m " + seconds + "s ";
  if (document.getElementById('dayProgress') !== null) {
    document.getElementById('dayProgress').setAttribute('style', 'width: ' + percentThroughDay + '%;');
    document.getElementById('dayProgress').innerHTML = Math.floor(percentThroughDay) + '%';
  }
}, 1000);
}

function setStartTimeOut(startDate){
  var currentDate = new Date();
  var timeUntilStart;
  if(getTimeOfDayMillis(currentDate) < getTimeOfDayMillis(startDate)){
    //If it is morning before school
    timeUntilStart = startDate-currentDate;
  }else{
    //If it is after school
    startDate.setDate(currentDate.getDate() + 1);
    timeUntilStart = startDate-currentDate;
  }
  setTimeout(function(){location.reload()}, timeUntilStart);
}

function postNewAnnouncement(announcements, index) {
    document.getElementById("announcements-index").innerHTML = (index+1) + "/" + (announcements.length);
    document.getElementById('announcements-list').innerHTML = "";
    var title = (announcements[index].title);
    var description = (announcements[index].description);

    var ann = document.createElement('li');
    ann.innerHTML = "<span class='announcement-title'>" + title + ": </span><span class='announcement-description'>" + description + "</span>";
    document.getElementById('announcements-list').appendChild(ann);
}

function main(){
  refreshPushNotfificationStatus();
  // Eww JSONP (Thanks, CORS!)
  var lunchtag = document.createElement("script");
  lunchtag.src = "https://melroseschools.nutrislice.com/menu/api/weeks/school/melrose/menu-type/lunch/" + today.getFullYear() + "/00/00/?format=json-p&callback=getLunchInfo";
  document.getElementsByTagName('head')[0].appendChild(lunchtag);

  // Aspen Stuff
  var loggedOutAspen = new HttpClient();
  loggedOutAspen.get('https://mhs-aspencheck-serve.herokuapp.com', function(response) {
    try {
      var aspenInfo = JSON.parse(response);
      var lastUpdated = new Date(aspenInfo.asOf*1000);
      var block = (aspenInfo.schedule.block);
      var blockSchedule = (aspenInfo.schedule.blockSchedule);
      day = (aspenInfo.schedule.day);
      var classInSession = (aspenInfo.schedule.isClassInSession);

      var events = (aspenInfo.calendar.events);
      var announcements = (aspenInfo.announcements.hs);
      var isHalfDay = (aspenInfo.calendar.isHalfDay);

      clock(isHalfDay);

      document.getElementById('dayNumber').innerHTML = day;

      if (classInSession) { document.getElementById('dayProgress').setAttribute('class', 'progress-bar progress-bar-striped progress-bar-danger active'); }
      document.getElementById('lastUpdated').innerHTML = (lastUpdated.getMonth() + 1) + "/" + (lastUpdated.getDate()) + " " + (lastUpdated.getHours()) + ":" + (lastUpdated.getMinutes()) + ":" + (lastUpdated.getSeconds());

      if (events.length > 0){
        document.getElementById('events-list').innerHTML = "";
        events.forEach(function(eventTitle){
          var event = document.createElement('li');
          event.innerHTML = eventTitle;
          document.getElementById('events-list').appendChild(event);
        });
      }

      if (announcements.length > 0) {
        //These function are inside this if so that I don't feel bad about making announcementIndex have a large scope
        //If they need to be used elsewhere, feel free to move them, but then announcementIndex will have to have an expanded scope
        var interval;
        var announcementIndex = 1;
        function startAnnouncementCycle(announcements){
          document.getElementById('pause-button').className = 'fa fa-pause';
          //Maybe change color or something to give an indication of what is happening
          const intervalId =  setInterval(function() {
            if (announcementIndex > (announcements.length-1)) announcementIndex = 0;
            postNewAnnouncement(announcements, announcementIndex);
            announcementIndex++;
          }, 5000); // Time each announcement is displayed
          interval = intervalId;
          return intervalId;
        }

        function stopAnnouncementCycle(intervalId){
          //Maybe change color or something to give an indication of what is happening
          clearInterval(intervalId);
          document.getElementById('pause-button').className = 'fa fa-play';
        }

        function setCurrentAnnouncement(index, announcements){
          //This uses accountIndex numbers which start at 1. Why do they start at 1? Arrays start at 0!
          if (index > (announcements.length)){
            index = 1;
          }
          if (index < 1){
            index = announcements.length;
          }
          announcementIndex = index;
          postNewAnnouncement(announcements, index-1);
        }

        const announcementsPanel = document.getElementById("announcements-body");
        announcementsPanel.addEventListener("mouseover", function(){
          stopAnnouncementCycle(interval);
        });
        announcementsPanel.addEventListener("mouseout", function(){
          interval = startAnnouncementCycle(announcements);
        });
        const announcementsButtons = document.getElementsByClassName("arrow-icon");
        announcementsButtons[0].addEventListener("mouseover", function(){
          stopAnnouncementCycle(interval);
        });
        announcementsButtons[0].addEventListener("mouseout", function(){
          interval = startAnnouncementCycle(announcements);
        });
        announcementsButtons[1].addEventListener("mouseover", function(){
          stopAnnouncementCycle(interval);
        });
        announcementsButtons[1].addEventListener("mouseout", function(){
          interval = startAnnouncementCycle(announcements);
        });
        const announcementButtons = document.getElementsByClassName("announcement-button");
        announcementButtons[0].addEventListener("click", function(){
          setCurrentAnnouncement(announcementIndex-1, announcements);
        });
        announcementButtons[1].addEventListener("click", function(){
          if(document.getElementById('pause-button').className == 'fa fa-pause'){
            interval = stopAnnouncementCycle(interval);
          }else{
            interval = startAnnouncementCycle(announcements);
          }
        });
        announcementButtons[2].addEventListener("click", function(){
          setCurrentAnnouncement(announcementIndex+1, announcements);
        });

        postNewAnnouncement(announcements, 0);
        interval = startAnnouncementCycle(announcements);
      }

      if (typeof blockSchedule !== "undefined" && blockSchedule.length > 0){
        var blocks = "";
        blockSchedule.forEach(function(b){
          if (b === block) {
            blocks += "<div class='blockContainer' style='font-weight:bolder; background-color: #fee9e9;'>"+b+"</div>";
          } else {
            blocks += "<div class='blockContainer'>"+b+"</div>";
          }
        });
        document.getElementById('schedule-body').innerHTML = blocks;
      } else {
        document.getElementById('schedule-panel').parentElement.innerHTML = "";
      }

      // Once loading is complete, render page
      document.getElementById('aspenLoadingSpinner').className += " fadeHidden";
    } catch (error) {
      document.getElementById('fetchIssue').setAttribute('style', 'display:inherit;');
      clock(false);
    }
  });
}

function tweakNotificationsToggleButton() {
  var isPushSupported = OneSignal.isPushNotificationsSupported();
  if (isPushSupported){
    document.getElementById('notificationsToggleButton').setAttribute('class', '');
    document.getElementById('notificationsToggleButton').setAttribute('onclick', 'toggleWebNotifications();');
  }

  if (notifyEnabled) {
    document.getElementById('notificationsToggleButton').setAttribute('style', 'color:green;')
  } else {
    document.getElementById('notificationsToggleButton').setAttribute('style', 'color:#b8101f;');
  }
}

function toggleWebNotifications() {
  try {
    if (!notifyEnabled) { // If notifications aren't enabled
      OneSignal.push(["registerForPushNotifications"]);
    OneSignal.push(["setSubscription", true]);
      ga('send', 'event', 'WebNotificationPreferenceChange', 'enabled'); // Log in Google Analytics
    } else {
      OneSignal.push(["setSubscription", false]); // Unreigister the user
      ga('send', 'event', 'WebNotificationPreferenceChange', 'disabled');
    }
  } finally { // So it still works if GoogleAnalytics isn't found
  document.getElementById('notificationsToggleButton').setAttribute('style', 'color:gray;');
  setTimeout(function(){
    refreshPushNotfificationStatus();
  }, 2500);
}
}

function refreshPushNotfificationStatus() {
  OneSignal.push(function() {
    OneSignal.isPushNotificationsEnabled(function(isEnabled) {
      notifyEnabled = isEnabled;
      tweakNotificationsToggleButton();
    });
  });
}
