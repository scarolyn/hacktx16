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

function processData(data) {
  var newDataSet = [];
  for(var key in data) {
  //  console.log(key + ", " + data[key]);
    newDataSet.push({name: key, value: data[key]});
  }
  return {children: newDataSet};
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  var diameter = 900;

  var svg = d3.select('#svgVisualize').append('svg')
    .style('width', window.innerWidth)
    .style('height', window.innerHeight);

  var bubble = d3.layout.pack()
    .size([diameter, diameter])
    .padding(3) // padding between adjacent circles
    .value(function(d) {return d.value;}); // new data will be loaded to bubble layout

  var nodes = bubble.nodes(processData(data))
    .filter(function(d) { console.log(!d.children); return !d.children; }); // filter out the outer bubble

  var vis = svg.selectAll('circle')
    .data(nodes, function(d) { return d.name; });
 
  vis.enter().append('circle')
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
    .attr('r', function(d) { return d.r; })
    .attr("stroke", "black")
    .attr("fill", "white");

  vis.append("text")
    .attr({
      "text-anchor": "middle",
      "font-size": function(d) {
        return d.r / ((d.r * 10) / 100);
      },
      "dy": function(d) {
        return d.r / ((d.r * 25) / 100);
      }
    })
    .attr("stroke", "black")
    .attr("fill", "black")
    .text(function(d){ return d.name; });
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
      'startTime': oneWeekAgo,
      'maxResults': 10000  // that was accessed less than one week ago.
    },
    function(historyItems) {
      // For each history item, get details on all visits.
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        //console.log(url);
        var processVisitsWithUrl = function(url) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            //console.log(visitItems);
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
    buildPopupDom(divName, urlToCount);
  };
}

document.addEventListener('DOMContentLoaded', function () {
  buildTypedUrlList("svgVisualize");  
});

