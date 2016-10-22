// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Event listner for clicks on links in a browser action popup.
// Open the link in a new tab of the current window.
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

var makeLegit = function(url) {
    if (!url.startsWith("http")) {
        url = "http://" + url;
    }

    return url;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  var barWidth = 120;
  var width = (barWidth + 10) * data.length;
  var height = 200;

  var x = d3.scaleLinear().domain([0, data.length]).range([0, width]);
  var y = d3.scaleLinear().domain([0, d3.max(data, function(datum) { return datum.freq; })]).
            rangeRound([0, height]);

  var display = d3.select("#most_visited_sites").
                   append("svg:svg").
                   attr("width", width).
                   attr("height", height + 50);

  display.selectAll("rect").
     data(data).
     enter().
     append("svg:rect").
     attr("x", function(datum, index) { return x(index); }).
     attr("y", function(datum) { return height - y(datum.freq); }).
     attr("height", function(datum) { return y(datum.freq); }).
     attr("width", barWidth).
     attr("fill", "#2d578b");

  display.selectAll("text").
    data(data).
    enter().
    append("svg:text").
    attr("x", function(datum, index) { return x(index) + barWidth; }).
    attr("y", function(datum) { return height - y(datum.freq); }).
    attr("dx", -barWidth/2).
    attr("dy", "1.2em").
    attr("text-anchor", "middle").
    text(function(datum) { return datum.freq;}).
    attr("fill", "black");

  display.selectAll("text.yAxis").
    data(data).
    enter().append("svg:text").
    attr("x", function(datum, index) { return x(index) + barWidth; }).
    attr("y", height).
    attr("dx", -barWidth/2).
    attr("text-anchor", "middle").
    attr("style", "font-size: 12; font-family: Helvetica, sans-serif").
    text(function(datum) { return datum.url;}).
    attr("transform", "translate(0, 18)").
    attr("class", "yAxis").
    attr("fill", "black");
}

// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  // To look for history items visited in the last week,
  // subtract a week of microseconds from the current time.
  var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;

  chrome.history.search({
      'text': '',              // Return every history item....
      'startTime': oneWeekAgo, // that was accessed less than one week ago.
      'maxResults': 10000
    },
    function(historyItems) {
      // For each history item, get details on all visits.
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        var processVisitsWithUrl = function(url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            processVisits(url, visitItems);
          };
        };
        chrome.history.getVisits({url: url}, processVisitsWithUrl(url));
        numRequestsOutstanding++;
      }
      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    });

  var filterUrl = function(urlFilter) {
      if (typeof urlFilter !== 'undefined') {
          var urlParts = urlFilter.split('/', 4);
          return urlParts[2];
      }
  };


  // Maps URLs to a count of the number of times the user typed that URL into
  // the omnibox.
  var urlToCount = {};

  // Callback for chrome.history.getVisits().  Counts the number of
  // times a user visited a URL by typing the address.
  var processVisits = function(url, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {
      // Ignore items unless the user typed the URL.
      url = filterUrl(url);
      if (typeof url === 'string') {
          if (!urlToCount[url]) {
            urlToCount[url] = 0;
          }

          urlToCount[url]++;
      }
    }

    // If this is the final outstanding call to processVisits(),
    // then we have the final results.  Use them to build the list
    // of URLs to show in the popup.
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };

  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    // Get the top scorring urls.
    urlFreq = [];
    for (var url in urlToCount) {
      urlFreq.push(
          {
              url: url,
              freq: urlToCount[url]
          }
      );
    }

    buildPopupDom(divName, urlFreq);
  };
}

document.addEventListener('DOMContentLoaded', function () {
  buildTypedUrlList("typedUrl_div");
});
