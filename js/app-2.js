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

var stats = {},
    earliestDate = Date.now(),
    latestDate = 0,
    totalDuration = 0,
    users = {};

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

  var oneDay = 24*60*60*1000;

  stats.totalClicks = data.length;
  stats.totalDays = Math.round(Math.abs((latestDate - earliestDate)/(oneDay)));
  stats.avgPerDay = (stats.totalClicks / stats.totalDays).toFixed(3);
  stats.uniqueUsers = Object.keys(users).length;
  stats.avgTimeCompletion = Math.round(totalDuration / stats.totalClicks / 60 / 1000); // in minutes

  console.log(stats);
});

d3.select(window).on('resize', resize);

function processData(d) {
  d.start_time = parseDate(d.start_time);
  d.end_time = parseDate(d.end_time);

  // preprocess for stats calculation
  earliestDate = d.start_time.getTime() < earliestDate ? d.start_time.getTime() : earliestDate;
  latestDate = d.start_time.getTime() > latestDate ? d.start_time.getTime() : latestDate;
  users[d.name] = true;
  totalDuration += d.end_time - d.start_time;

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
      rowCount: [10,25,100],
      templates: {
        header: "<div id=\"{{ctx.id}}\" class=\"{{css.header}}\"><div class=\"row\"><div class=\"col-sm-12 actionBar\"><p class=\"{{css.search}}\"></p></div></div></div>"
    }
  });
}

function formatDate(date) {
  var day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  return date.getFullYear() + "." + (date.getMonth()+1) + "." + day;
}
