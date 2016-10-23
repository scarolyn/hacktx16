// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function buildChart(divname, data) {
  var color = d3.scale.category20b();
  var svg = d3.select('#' + divname);
  svg.attr("width", window.innerWidth);
  svg.attr("height", window.innerHeight);

  var bubble = d3.layout.pack()
    .size([window.innerWidth, window.innerHeight])
    .padding(10) // padding between adjacent circles
    .value(function(d) {return d.value;}); // new data will be loaded to bubble layout

  var nodes = bubble.nodes({children: data})
    .filter(function(d) { console.log(!d.children); return !d.children; }); // filter out the outer bubble

  var vis = svg.selectAll('circle')
    .data(nodes, function(d) { return d.name; })
    .enter();
 
  vis.append('circle')
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
    .attr('r', function(d) { return d.r; })
    .style("fill", function(d) { return color(d.value); });

  vis.append("text")
    .attr({
      "text-anchor": "middle",
      "font-size": function(d) {
        return d.value / ((d.value * 9) / 100);
      },

      "dy": function(d) {
        return d.r / ((d.r * 25) / 100);
      }
    })
    .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
    .text(function(d){ return d.name; });
}

function getUrls(divname) {
  var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  var numRequestsOutstanding = 0;

  chrome.history.search({
      'text': '',
      'startTime': oneWeekAgo,
      'maxResults': 5000
    }, function(historyItems) {
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;

        var processVisitsWithUrl = function(url) {
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

  var urlToCount = {};

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

    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };

  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    var keys = Object.keys(urlToCount);
    keys.sort(function(a, b){return urlToCount[b]-urlToCount[a]});
    var sortedUrls = [];
    for(var i = 0; i < 20; i++) {
      key = keys[i]
      if(key.includes("www")) {
        key = key.substring(4);
      }
      if(key.includes(".com")) {
        key = key.substring(0, key.length - 4);
      }
      sortedUrls.push({'name': key, 'value': urlToCount[keys[i]]});
    }
    buildChart(divname, sortedUrls);
  };
}

document.addEventListener('DOMContentLoaded', function () {
  getUrls("svgVisualize");  
});

