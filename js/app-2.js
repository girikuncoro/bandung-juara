var parseDate = d3.timeParse("%m/%d/%y %H:%M"),
    formatCount = d3.format(",.0f"),
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

var margin = {top: 10, right: 30, bottom: 30, left: 40};

var width = parseInt(d3.select("#panic-histo").style("width"), 10),
    width = width - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

var width1 = parseInt(d3.select("#panic-24hr").style("width"), 10),
    width1 = width1 - margin.left - margin.right,
    height1 = 200 - margin.top - margin.bottom;

var width2 = parseInt(d3.select("#panic-weekly").style("width"), 10),
    width2 = width2 - margin.left - margin.right,
    height2 = 200 - margin.top - margin.bottom;

var x = d3.scaleTime()
    .domain([new Date(2015, 0, 1), new Date(2015, 11, 31)])
    .rangeRound([0, width]);

var y = d3.scaleLinear()
    .rangeRound([height, 0]);

var x1 = d3.scaleTime()
    .domain([(new Date()).setHours(0, 0, 0, 0), (new Date()).setHours(23, 59, 59, 0)])
    .rangeRound([0, width1]);

var y1 = d3.scaleLinear()
    .range([height1, 0]);

var x2 = d3.scaleBand()
    .domain(days)
    .rangeRound([0, width2])
    .padding(.05);

var y2 = d3.scaleLinear()
    .range([height2, 0]);

var histogram = d3.histogram()
    .value(function(d) { return d.start_time; })
    .domain(x.domain())
    .thresholds(x.ticks(d3.timeWeek));

var histogram1 = d3.histogram()
    .value(function(d) { return d.time; })
    .domain(x1.domain())
    .thresholds(x1.ticks(d3.timeHour))

var tooltip = d3.select("#panic-histo").append("div")
    .attr("id", "panic-tooltip")
    .style("position", "absolute")
    .style("z-index", "9999")
    .style("visibility", "hidden")
    .html("<span class='time'></span><span class='value'></span>");

var tooltip1 = d3.select("#panic-24hr").append("div")
    .attr("id", "panic-tooltip-24hr")
    .style("position", "absolute")
    .style("z-index", "9999")
    .style("visibility", "hidden")
    .html("<span class='time'></span><span class='value'></span>");

var tooltip2 = d3.select("#panic-weekly").append("div")
    .attr("id", "panic-tooltip-weekly")
    .style("position", "absolute")
    .style("z-index", "9999")
    .style("visibility", "hidden")
    .html("<span class='time'></span><span class='value'></span>");

var svg = d3.select("#panic-histo").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var svg1 = d3.select("#panic-24hr").append("svg")
    .attr("width", width1 + margin.left + margin.right)
    .attr("height", height1 + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var svg2 = d3.select("#panic-weekly").append("svg")
    .attr("width", width2 + margin.left + margin.right)
    .attr("height", height2 + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var stats = { lifetime: { totalDuration: 0 } },
    earliestDate = Date.now(),
    latestDate = 0,
    users = { lifetime: {} },
    countDistricts = {};

var oneDay = 24*60*60*1000,
    today = new Date();

    today.setHours(0, 0, 0, 0);
var todayMillis = today.getTime();

d3.csv('data/panic.csv', processData, function(error, data) {
  if (error) throw error;

  // stats calculation and summary
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

  var bins = histogram(data),
      bins1 = histogram1(data);  // 24 hours bins

  y.domain([0, 1.2 * d3.max(bins, function(d) { return d.length; })]);
  y1.domain([0, 1.2 * d3.max(bins1, function(d) { return d.length; })]);
  y2.domain([0, 1.2 * d3.max(stats[stats.lifetime.latestYear].weeklyClicks, function(d) { return d; })]);

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
      .attr("class", "bar-year")
      .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });

  bar.append("rect")
      .attr("x", 1)
      .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
      .attr("height", function(d) { return height - y(d.length); })
      .on("mouseover", displayTip)
      .on("mousemove", function(d){ return tooltip.style("top", (y(d.length)+10) + "px").style("left",(event.pageX-margin.left-margin.right-width/3)+"px"); })
      .on("mouseout", function(){ return tooltip.style("visibility", "hidden"); });

  // histogram for 24 hours trend
  svg1.append("g")
    .attr("class", "axis axis1-x")
    .attr("transform", "translate(0," + (height1 + 5) + ")")
    .call(d3.axisBottom(x1).tickSizeInner(0).tickFormat(d3.timeFormat("%H")));

  svg1.append("g")
    .attr("class", "axis axis1-y")
    .call(d3.axisLeft(y1).tickSizeInner(-width1).tickSizeOuter(0).tickValues([0,20,40,60,80]));

  var bar1 = svg1.selectAll(".bar")
      .data(bins1)
    .enter().append("g")
      .attr("class", "bar-24hr")
      .attr("transform", function(d) { return "translate(" + x1(d.x0) + "," + y1(d.length) + ")"; });

  bar1.append("rect")
      .attr("x", 1)
      .attr("width", function(d) { return x1(d.x1) - x1(d.x0) - 1; })
      .attr("height", function(d) { return height1 - y1(d.length); })
      .on("mouseover", displayTip24Hours)
      .on("mousemove", function(d){ return tooltip1.style("top", (y1(d.length)+10) + "px").style("left",(event.pageX-width1-margin.right-margin.left)+"px"); })
      .on("mouseout", function(){ return tooltip1.style("visibility", "hidden"); });

  // bar chart for one week trend
  svg2.append("g")
    .attr("class", "axis axis2-x")
    .attr("transform", "translate(0," + (height2 + 5) + ")")
    .call(d3.axisBottom(x2).tickSizeInner(0));

  svg2.append("g")
    .attr("class", "axis axis2-y")
    .call(d3.axisLeft(y2).tickSizeInner(-width2).tickSizeOuter(0).tickValues([0,40,80,120,160]));

  svg2.selectAll(".bar")
      .data(stats[stats.lifetime.latestYear].weeklyClicks)
    .enter().append("rect")
      .attr("class", "bar-weekly")
      .attr("x", function(d,i) { return x2(days[i]); })
      .attr("y", function(d,i) { return y2(d); })
      .attr("height", function(d) { return height2 - y2(d) })
      .attr("width", x2.bandwidth())
      .on("mouseover", displayTipWeekly)
      .on("mousemove", function(d){ return tooltip2.style("top", (y2(d)+10) + "px").style("left",(event.pageX-width2-margin.right-margin.left)+"px"); })
      .on("mouseout", function(){ return tooltip2.style("visibility", "hidden"); });

  // table init for bootgrid
  initTable();

  // summary init for sparkline cards
  populateSummary(stats);

  // top locations gathering
  var sortedDistricts = sortDistricts(countDistricts);
  populateLocation(sortedDistricts);
});

d3.select(window).on('resize', resize);

function processData(d) {
  d.start_time = parseDate(d.start_time);
  d.end_time = parseDate(d.end_time);
  d.year = d.start_time.getFullYear();
  d.month = d.start_time.getMonth();
  d.day = d.start_time.getDay();  // 0 for Sunday, 1 for Monday

  // standardized time in one day
  d.time = new Date();
  d.time.setTime(todayMillis + d.start_time.getHours() * 60 * 60 * 1000 + d.start_time.getMinutes() * 60 * 1000);

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
    stats[d.year].weeklyClicks = [];

    for(var i = 0; i < 12; i++) {
      stats[d.year].totalClicks.push(0);
      stats[d.year].avgPerDay.push(0);
      stats[d.year].uniqueUsers.push(0);
      stats[d.year].totalDuration.push(0);
      stats[d.year].avgTimeCompletion.push(0);
    }
    for(var i = 0; i < 7; i++) {
      stats[d.year].weeklyClicks.push(0);
    }
  }
  stats[d.year].totalClicks[d.month]++;
  stats.lifetime.totalDuration += d.end_time - d.start_time;
  stats[d.year].totalDuration[d.month] += d.end_time - d.start_time;
  stats[d.year].weeklyClicks[d.day]++;

  // aggregate unique users
  if(!users.hasOwnProperty(d.year)) {
    users[d.year] = [];
    for(var i = 0; i < 12; i++) users[d.year].push({});
  }
  users.lifetime[d.name] = true;
  users[d.year][d.month][d.name] = true;

  // parse address data
  var addr = d.address.split(",");
  if(addr[0] !== "") {
    d.district = addr[1].trim();
    d.city = addr[2].toLowerCase().trim();
    d.zipcode = addr[3].replace(/\D/g, '');

    d.inBandung = d.city === "kota bandung" ? true : false;

    if(d.inBandung)
      countDistricts[d.district] = countDistricts[d.district] ? countDistricts[d.district] + 1 : 1;
  }

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
  d3.select("#panic-tooltip > span.value").html("<b>" + d.length + "</b> times pressed");
  return tooltip.style("visibility", "visible");
}

function displayTip24Hours(d) {
  d3.select("#panic-tooltip-24hr > span.time").text(function() {
    return d.x0.getHours() + ":00 - " + d.x0.getHours() + ":59";
  });
  d3.select("#panic-tooltip-24hr > span.value").html("<b>" + d.length + "</b> times pressed");
  return tooltip1.style("visibility", "visible");
}

function displayTipWeekly(d, i) {
  d3.select("#panic-tooltip-weekly > span.time").text(function() {
    return days[i];
  });
  d3.select("#panic-tooltip-weekly > span.value").html("<b>" + d + "</b> times pressed");
  return tooltip2.style("visibility", "visible");
}

function resize() {
  resizeYearlyChart();
  resize24hrChart();
  resizeWeeklyChart();
}

function resizeYearlyChart() {
  // update width
  width = parseInt(d3.select('#panic-histo').style('width'), 10);
  width = width - margin.left - margin.right;

  // resize the chart
  x.rangeRound([0, width]);
  d3.select("#panic-histo svg")
      .attr('width', (width + margin.left + margin.right) + 'px');

  svg.selectAll('.bar-year')
      .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; });
  svg.selectAll('rect')
      .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
      .on("mousemove", function(d) { return tooltip.style("top", (y(d.length)+10) + "px").style("left",(event.pageX-width/3)+"px"); });

  // update axes
  svg.select('.axis.axis-x').call(d3.axisBottom(x).tickSizeInner(0).tickFormat(d3.timeFormat("%b")));
  svg.select('.axis.axis-y').call(d3.axisLeft(y).tickSizeInner(-width).tickSizeOuter(0).tickValues([0,50,100,150]));
}

function resize24hrChart() {
  // update width
  width1 = parseInt(d3.select('#panic-24hr').style('width'), 10);
  width1 = width1 - margin.left - margin.right;

  // resize the chart
  x1.rangeRound([0, width1]);
  d3.select("#panic-24hr svg")
      .attr('width', (width1 + margin.left + margin.right) + 'px');

  svg1.selectAll('.bar-24hr')
      .attr("transform", function(d) { return "translate(" + x1(d.x0) + "," + y1(d.length) + ")"; });
  svg1.selectAll('rect')
      .attr("width", function(d) { return x1(d.x1) - x1(d.x0) - 1; })
      .on("mousemove", function(d){ return tooltip1.style("top", (y1(d.length)+10) + "px").style("left",(event.pageX-width1-2*margin.right-2*margin.left)+"px"); })

  // update axes
  svg1.select('.axis.axis1-x').call(d3.axisBottom(x1).tickSizeInner(0).tickFormat(d3.timeFormat("%H")));
  svg1.select('.axis.axis1-y').call(d3.axisLeft(y1).tickSizeInner(-width1).tickSizeOuter(0).tickValues([0,20,40,60,80]));
}

function resizeWeeklyChart() {
  // update width
  width2 = parseInt(d3.select('#panic-weekly').style('width'), 10);
  width2 = width2 - margin.left - margin.right;

  // resize the chart
  x2.rangeRound([0, width2])
  d3.select("#panic-weekly svg")
      .attr('width', (width2 + margin.left + margin.right) + 'px');

  svg2.selectAll('rect')
      .attr("x", function(d,i) { return x2(days[i]); })
      .attr("width", x2.bandwidth())
      .on("mousemove", function(d){ return tooltip2.style("top", (y2(d)+10) + "px").style("left",(event.pageX-width2-2*margin.right-2*margin.left)+"px"); });

  // update axes
  svg2.select('.axis.axis2-x').call(d3.axisBottom(x2).tickSizeInner(0));
  svg2.select('.axis.axis2-y').call(d3.axisLeft(y2).tickSizeInner(-width2).tickSizeOuter(0));
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

function sortDistricts(districts) {
  var res = [];
  for(var dis in districts) {
    res.push({ district: dis, count: districts[dis] });
  }
  res.sort(function(a,b) { return b.count - a.count; });
  return res;
}

function populateLocation(sortedDistricts, total=6) {
  // default top 6 locations
  var maxShow = 10;

  for(var i = 0; i < total; i++) {
    appendDistrict(sortedDistricts[i], i);
  }

  $('.show-more').on('click', function() {
    if($(this).hasClass('show-less')) {
      for(var i = total; i < maxShow; i++) {
        $("#top-locations div.list-group-item").last().remove();
      }
      $(this).removeClass('show-less').html('View More');
      return;
    }

    for(var i = total; i < maxShow; i++) {
      appendDistrict(sortedDistricts[i], i);
    }
    $('.view-more.locations').addClass('show-less').html('View Less');
  });

  function appendDistrict(data, idx) {
    $("#top-locations").append('\
        <div class="list-group-item media">\
          <div class="pull-left">\
            ' + (idx+1) + '\
          </div>\
          <div class="lgi-heading m-l-5">' + data.district + '</div>\
            <div class="pull-right">' + data.count + ' clicks</div>\
              <div class="media-body">\
                <div class="progress">\
                  <div class="progress-bar" role="progressbar" aria-valuenow="' + sortedDistricts[i].count + '" aria-valuemin="0" aria-valuemax="100" style="width: ' + sortedDistricts[i].count + '%">\
                  </div>\
                </div>\
              </div>\
          </div>');
  }
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
