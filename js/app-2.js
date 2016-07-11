var parseDate = d3.timeParse("%m/%d/%y %H:%M"),
    formatCount = d3.format(",.0f"),
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var margin = {top: 10, right: 30, bottom: 30, left: 40},
    width = parseInt(d3.select("#panic-histo").style("width"), 10),
    width = width - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

var x = d3.scaleTime()
    .domain([new Date(2015, 0, 1), new Date(2015, 11, 31)])
    .rangeRound([0, width]);

var y = d3.scaleLinear()
    .range([height, 0]);

var histogram = d3.histogram()
    .value(function(d) { return d.start_time; })
    .domain(x.domain())
    .thresholds(x.ticks(d3.timeWeek));

var tooltip = d3.select("#panic-histo").append("div")
    .attr("id", "panic-tooltip")
    .style("position", "absolute")
    .style("z-index", "9999")
    .style("visibility", "hidden")
    .html("<span class='time'></span><span class='value'></span>");

var svg = d3.select("#panic-histo").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var stats = { lifetime: { totalDuration: 0 } },
    earliestDate = Date.now(),
    latestDate = 0,
    users = { lifetime: {} };

var oneDay = 24*60*60*1000;

d3.csv('data/panic.csv', processData, function(error, data) {
  if (error) throw error;

  var bins = histogram(data);

  y.domain([0, 1.2 * d3.max(bins, function(d) { return d.length; })]);

  svg.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", "translate(0," + (height + 5) + ")")
    .call(d3.axisBottom(x).tickSizeInner(0).tickFormat(d3.timeFormat("%b")));

  svg.append("g")
    .attr("class", "axis axis-y")
    .call(d3.axisLeft(y).tickSizeInner(-width).tickSizeOuter(0).tickValues([0,50,100,150]));

  var bar = svg.selectAll(".bar")
      .data(bins)
    .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });

  bar.append("rect")
      .attr("x", 1)
      .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
      .attr("height", function(d) { return height - y(d.length); })
      .on("mouseover", displayTip)
      .on("mousemove", function(d){ return tooltip.style("top", (y(d.length)+10) + "px").style("left",(event.pageX-width/3)+"px"); })
      .on("mouseout", function(){ return tooltip.style("visibility", "hidden"); });

  initTable();

  stats.lifetime.totalClicks = data.length;
  stats.lifetime.totalDays = Math.round(Math.abs((latestDate - earliestDate)/(oneDay)));
  stats.lifetime.avgPerDay = (stats.lifetime.totalClicks / stats.lifetime.totalDays).toFixed(3);
  stats.lifetime.uniqueUsers = Object.keys(users.lifetime).length;
  stats.lifetime.avgTimeCompletion = Math.round(stats.lifetime.totalDuration / stats.lifetime.totalClicks / 60 / 1000); // in minutes

  stats.lifetime.earliestYear = (new Date(earliestDate)).getFullYear();
  stats.lifetime.latestYear = (new Date(latestDate)).getFullYear();

  for(var year in stats) {
    if(isNaN(year)) continue;

    stats[year].totalClicks.forEach(function(d,i) {
      stats[year].avgPerDay[i] = (d / daysInMonth(i+1, year)).toFixed(2);
      stats[year].uniqueUsers[i] = Object.keys(users[year][i]).length;
      stats[year].avgTimeCompletion[i] = Math.round(stats[year].totalDuration[i] / d / 60 / 1000) || 0;  // in minutes
    });
  }

  populateSummary(stats);
});

d3.select(window).on('resize', resize);

function processData(d) {
  d.start_time = parseDate(d.start_time);
  d.end_time = parseDate(d.end_time);
  d.year = d.start_time.getFullYear();
  d.month = d.start_time.getMonth();

  // preprocess for stats calculation
  earliestDate = d.start_time.getTime() < earliestDate ? d.start_time.getTime() : earliestDate;
  latestDate = d.start_time.getTime() > latestDate ? d.start_time.getTime() : latestDate;

  // aggregate the stats
  if(!stats.hasOwnProperty(d.year)) {
    stats[d.year] = {};
    stats[d.year].totalClicks = [];
    stats[d.year].avgPerDay = [];
    stats[d.year].uniqueUsers = [];
    stats[d.year].totalDuration = [];
    stats[d.year].avgTimeCompletion= [];

    for(var i = 0; i < 12; i++) {
      stats[d.year].totalClicks.push(0);
      stats[d.year].avgPerDay.push(0);
      stats[d.year].uniqueUsers.push(0);
      stats[d.year].totalDuration.push(0);
      stats[d.year].avgTimeCompletion.push(0);
    }
  }
  stats[d.year].totalClicks[d.month]++;
  stats.lifetime.totalDuration += d.end_time - d.start_time;
  stats[d.year].totalDuration[d.month] += d.end_time - d.start_time;

  // aggregate unique users
  if(!users.hasOwnProperty(d.year)) {
    users[d.year] = [];
    for(var i = 0; i < 12; i++) users[d.year].push({});
  }
  users.lifetime[d.name] = true;
  users[d.year][d.month][d.name] = true;

  // populate data table
  $("#panic-table").append("<tr><td>" + formatDate(d.start_time) + "</td><td>" + d.name + "</td><td>" + d.address + "</td></tr>");
  return d;
}

function displayTip(d) {
  d3.select("#panic-tooltip > span.time").text(function() {
      if(d.x0.getMonth() === d.x1.getMonth()) {
        return d.x0.getDate() + " - " + d.x1.getDate() + " " + months[d.x1.getMonth()] + " " + d.x0.getFullYear();
      } else {
        return d.x0.getDate() + " " + months[d.x0.getMonth()] + " - " + d.x1.getDate() + " " + months[d.x1.getMonth()] + " " + d.x0.getFullYear();
      }
    });
  d3.select("#panic-tooltip > span.value").html("pressed <b>" + d.length + "</b> times");
  return tooltip.style("visibility", "visible");
}

function resize() {
  // update width
  width = parseInt(d3.select('#panic-histo').style('width'), 10);
  width = width - margin.left - margin.right;

  // resize the chart
  x.rangeRound([0, width]);
  d3.select("#panic-histo svg")
      .attr('width', (width + margin.left + margin.right) + 'px');

  svg.selectAll('.bar')
      .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });
  svg.selectAll('rect')
      .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
      .on("mousemove", function(d){ return tooltip.style("top", (y(d.length)+10) + "px").style("left",(event.pageX-width/3)+"px"); });

  // update axes
  svg.select('.axis.axis-x').call(d3.axisBottom(x).tickSizeInner(0).tickFormat(d3.timeFormat("%b")));
  svg.select('.axis.axis-y').call(d3.axisLeft(y).tickSizeInner(-width).tickSizeOuter(0).tickValues([0,50,100,150]));
}

function initTable() {
  // Bootgrid config for data table
  $("#data-table-basic").bootgrid({
      css: {
          icon: 'zmdi icon',
          iconColumns: 'zmdi-view-module',
          iconDown: 'zmdi-sort-amount-desc',
          iconRefresh: 'zmdi-refresh',
          iconUp: 'zmdi-sort-amount-asc'
      },
      caseSensitive: false,
      rowCount: [5,20,100],
      templates: {
        header: "<div id=\"{{ctx.id}}\" class=\"{{css.header}}\"><div class=\"row\"><div class=\"col-sm-12 actionBar\"><p class=\"{{css.search}}\"></p></div></div></div>"
    }
  });
}

function formatDate(date) {
  var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  return date.getFullYear() + "." + (date.getMonth()+1) + "." + day;
}

function daysInMonth(month, year) {
  // month is 1 based
  return new Date(year, month, 0).getDate();
}

function populateSummary(stats) {
  $("#sum-clicks").html(stats.lifetime.totalClicks);
  $("#sum-avg-clicks").html(stats.lifetime.avgPerDay);
  $("#sum-unique-users").html(stats.lifetime.uniqueUsers);
  $("#sum-avg-time").html(stats.lifetime.avgTimeCompletion + " mins");

  sparklineBar('stats-bar-clicks', stats[stats.lifetime.latestYear].totalClicks, '35px', 4, '#fff', 2);
  sparklineBar('stats-bar-avg-clicks', stats[stats.lifetime.latestYear].avgPerDay, '35px', 4, '#fff', 2);
  sparklineLine('stats-line-unique-users', stats[stats.lifetime.latestYear].uniqueUsers, 68, 35, '#fff', 'rgba(0,0,0,0)', 1.25, 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.4)', 3, '#fff', 'rgba(255,255,255,0.4)');
  sparklineLine('stats-line-avg-time', stats[stats.lifetime.latestYear].avgTimeCompletion, 68, 35, '#fff', 'rgba(0,0,0,0)', 1.25, 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.4)', 3, '#fff', 'rgba(255,255,255,0.4)');
}


/*-------------------------------------------
    Sparkline
---------------------------------------------*/
function sparklineBar(id, values, height, barWidth, barColor, barSpacing) {
    $('.'+id).sparkline(values, {
        type: 'bar',
        height: height,
        barWidth: barWidth,
        barColor: barColor,
        barSpacing: barSpacing
    });
}

function sparklineLine(id, values, width, height, lineColor, fillColor, lineWidth, maxSpotColor, minSpotColor, spotColor, spotRadius, hSpotColor, hLineColor) {
    $('.'+id).sparkline(values, {
        type: 'line',
        width: width,
        height: height,
        lineColor: lineColor,
        fillColor: fillColor,
        lineWidth: lineWidth,
        maxSpotColor: maxSpotColor,
        minSpotColor: minSpotColor,
        spotColor: spotColor,
        spotRadius: spotRadius,
        highlightSpotColor: hSpotColor,
        highlightLineColor: hLineColor
    });
}

function sparklinePie(id, values, width, height, sliceColors) {
    $('.'+id).sparkline(values, {
        type: 'pie',
        width: width,
        height: height,
        sliceColors: sliceColors,
        offset: 0,
        borderWidth: 0
    });
}
