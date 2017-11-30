document.onload = (function(d3, saveAs, Blob, undefined){
  "use strict";

  var CSS_COLOR_NAMES = ["AliceBlue","AntiqueWhite","Aqua","Aquamarine","Azure","Beige","Bisque","Black","BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGrey","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","Darkorange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DarkSlateGrey","DarkTurquoise","DarkViolet","DeepPink","DeepSkyBlue","DimGray","DimGrey","DodgerBlue","FireBrick","FloralWhite","ForestGreen","Fuchsia","Gainsboro","GhostWhite","Gold","GoldenRod","Gray","Grey","Green","GreenYellow","HoneyDew","HotPink","IndianRed","Indigo","Ivory","Khaki","Lavender","LavenderBlush","LawnGreen","LemonChiffon","LightBlue","LightCoral","LightCyan","LightGoldenRodYellow","LightGray","LightGrey","LightGreen","LightPink","LightSalmon","LightSeaGreen","LightSkyBlue","LightSlateGray","LightSlateGrey","LightSteelBlue","LightYellow","Lime","LimeGreen","Linen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSeaGreen","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","MintCream","MistyRose","Moccasin","NavajoWhite","Navy","OldLace","Olive","OliveDrab","Orange","OrangeRed","Orchid","PaleGoldenRod","PaleGreen","PaleTurquoise","PaleVioletRed","PapayaWhip","PeachPuff","Peru","Pink","Plum","PowderBlue","Purple","Red","RosyBrown","RoyalBlue","SaddleBrown","Salmon","SandyBrown","SeaGreen","SeaShell","Sienna","Silver","SkyBlue","SlateBlue","SlateGray","SlateGrey","Snow","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","White","WhiteSmoke","Yellow","YellowGreen"];



  // define graphcreator object
  var GraphCreator = function(svg, nodes, edges){
    var thisGraph = this;
        thisGraph.idct = 0;
    
    thisGraph.nodes = nodes || [];
    thisGraph.edges = edges || [];
    
    thisGraph.state = {
      selectedNode: null,
      selectedEdge: null,
      mouseDownNode: null,
      mouseDownLink: null,
      justDragged: false,
      justScaleTransGraph: false,
      lastKeyDown: -1,
      shiftNodeDrag: false,
      selectedText: null,
      buttonIsDraw : false,
      labels : [],
      response: {},
      stats: {},
      database_name_select: "",
      databaseConnected : false,
    };


    // define arrow markers for graph links
    var defs = svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', "32")
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    // define arrow markers for leading arrow
    defs.append('svg:marker')
      .attr('id', 'mark-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 7)
      .attr('markerWidth', 3.5)
      .attr('markerHeight', 3.5)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    thisGraph.svg = svg;
    thisGraph.svgG = svg.append("g")
          .classed(thisGraph.consts.graphClass, true);
    var svgG = thisGraph.svgG;

    // displayed when dragging between nodes
    thisGraph.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');

    // svg nodes and edges 
    thisGraph.paths = svgG.append("g").selectAll("g");
    thisGraph.circles = svgG.append("g").selectAll("g");

    thisGraph.drag = d3.behavior.drag()
          .origin(function(d){
            return {x: d.x, y: d.y};
          })
          .on("drag", function(args){
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, args);
          })
          .on("dragend", function() {
            // todo check if edge-mode is selected
          });

    // listen for key events
    d3.select(window).on("keydown", function(){
      thisGraph.svgKeyDown.call(thisGraph);
    })
    .on("keyup", function(){
      thisGraph.svgKeyUp.call(thisGraph);
    });
    svg.on("mousedown", function(d){thisGraph.svgMouseDown.call(thisGraph, d);});
    svg.on("mouseup", function(d){thisGraph.svgMouseUp.call(thisGraph, d);});

    // listen for dragging
    var dragSvg = d3.behavior.zoom()
          .on("zoom", function(){
            if (d3.event.sourceEvent.shiftKey){
              // TODO  the internal d3 state is still changing
              return false;
            } else{
              thisGraph.zoomed.call(thisGraph);
            }
            return true;
          })
          .on("zoomstart", function(){
            var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
            if (ael){
              ael.blur();
            }
            if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
          })
          .on("zoomend", function(){
            d3.select('body').style("cursor", "auto");
          });
    
    svg.call(dragSvg).on("dblclick.zoom", null);

    // listen for resize
    window.onresize = function(){thisGraph.updateWindow(svg);};



    d3.select('#disconnect-database').on('click', function (){

         var alchemy_div = document.getElementById('alchemy');
         alchemy_div.innerHTML = "";

         d3.select ('#database-host-connected').attr("value", "");

         d3.select('#label-display').style('display', 'none');
         thisGraph.state.databaseConnected = false;

         thisGraph.state.labels = [];

         var myList = document.getElementById('result-list');
         myList.innerHTML = '';

         var alchemy_div = document.getElementById('alchemy');
         alchemy_div.innerHTML = "";

         var result_count = document.getElementById('result-count');
         result_count.innerHTML = "RESULT MATCHES";

         var highcharts_container = document.getElementById('chart-section');
         highcharts_container.innerHTML = '';

    });


    d3.select('#upload-file').on("click", function(){
       document.getElementById('file-hidden-upload').click();
    });




    d3.select('#delete-button').on("click", function () { 
    
        var selectedNode = thisGraph.state.selectedNode,
            selectedEdge = thisGraph.state.selectedEdge;

        if (selectedNode){
                   thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
                   thisGraph.spliceLinksForNode(selectedNode);
                   thisGraph.state.selectedNode = null;
                   thisGraph.updateGraph();
         } else if (selectedEdge){
           thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
           thisGraph.state.selectedEdge = null;
           thisGraph.updateGraph();
         }
      });




    // submit the query.
    d3.select("#submit-query").on("click", function(){

      var alchemy_div = document.getElementById('alchemy');
      alchemy_div.innerHTML = "";

      //verify at submission all the nodes have the appropriate labels.
      for (var index = 0; index < thisGraph.nodes.length; index++){
        var node = thisGraph.nodes[index];
        if (node.title == 'NEW NODE'){
          window.scrollBy(0,-1000);
          d3.select('#error').style('display', 'block');
          d3.select('#close_error').on('click', function(){
              d3.select('#error').style('display', 'none');
          });
          return;
        }
      }

      //notify
      window.scrollBy(0, -1000);
      d3.select('#loading').style('display', 'block');
      d3.select('#close_loading').on('click', function(){
        d3.select('#loading').style('display', 'none');
      });


      var saveEdges = [];
      thisGraph.edges.forEach(function(val, i){
        saveEdges.push({source: val.source.id, target: val.target.id});
      });

      
      var graph_data = window.JSON.stringify({"nodes": thisGraph.nodes, "edges": saveEdges})
      console.log (graph_data);

      var request_data = {
          graph_data : JSON.parse(graph_data),
          database_host : d3.select('#database-host').property("value"),
          database_port : d3.select('#database-port').property("value"),
          database_name : thisGraph.state.database_name_select
      }


      //TODO : ajax call to the backend /query/database with the graph_data
      $.ajax({
            url: '/submitQuery',
            type: 'post',
            dataType: 'json',
            success: function (data) {
                
                  //notify
                  d3.select('#loading_finished').style('display', 'block');
                  d3.select('#close_finished').on('click', function(){
                    d3.select('#loading_finished').style('display', 'none');
                    d3.select('#loading').style('display', 'none');
                  });


                  thisGraph.state.response = data.response.output;
                  console.log ('the response ', thisGraph.state.response);
                  thisGraph.state.stats = data.response.stats;


                  var result_count = document.getElementById('result-count');
                  result_count.innerHTML = 'RESULT MATCHES : ' + thisGraph.state.stats.Candidates_Count

                  //clear the list first
                  var myList = document.getElementById('result-list');
                  myList.innerHTML = '';


                  if (thisGraph.state.stats.Candidates_Count == '0'){
                    myList.innerHTML = '<li> No matching results found in the database </li>'; 
                  }


                  for (var graph_id in thisGraph.state.response){
                      var graphs = thisGraph.state.response[graph_id];

                      var count = 1;
                      for (var graph in graphs){
                        
                        var ul = document.getElementById("result-list");
                        var li = document.createElement("li");
                        var a = document.createElement("a");

                        a.setAttribute('id', graph_id + '_' + (count - 1));
                        a.setAttribute('href', '#');
                        a.addEventListener('click', function (){
                            console.log ('this ', this);
                            var ids = this.getAttribute('id').split('_');
                            var database_id_clicked = ids[0];
                            var graph_id_clicked = ids[1];

                            var alchemy_div = document.getElementById('alchemy');
                            alchemy_div.innerHTML = "";

                            var config = {
                                    dataSource: thisGraph.state.response[database_id_clicked][graph_id_clicked],
                                    zoomControls : false,
                                    forceLocked: false,

                                    graphHeight: function(){ return 400; },
                                    graphWidth: function(){ return 400; },
                                    backgroundColour : '#FFF',      
                                    linkDistance: function(){ return 40; },
                                    nodeTypes: {"node_type" : thisGraph.state.response[database_id_clicked][graph_id_clicked].types},
                                    nodeCaption: function(node){return "Label : " + node.label + " ID  : " + node.id;},
                                    nodeStyle: {
                                      "all": {
                                          "radius": 30,
                                          //"color"  : CSS_COLOR_NAMES[Math.floor(Math.random()*CSS_COLOR_NAMES.length)],
                                          "borderColor": "Black",
                                          "borderWidth": function (d, radius) { return radius / 7 },
                                          "captionColor": "#FFFFFF",
                                          "captionBackground": null,
                                          "captionSize": 20,
                                          "selected": {
                                              "color" : "#FFFFFF",
                                              "borderColor": "#349FE3"
                                          },
                                          "highlighted": {
                                              "color" : "#EEEEFF"
                                          },
                                          "hidden": {
                                              "color": "none", 
                                              "borderColor": "none"
                                          }
                                      }
                                    }

                            };
                            console.log (thisGraph.state.response[database_id_clicked][graph_id_clicked]);

                            thisGraph.state.response[database_id_clicked][graph_id_clicked].types.forEach( t => config.nodeStyle[t] = { "color" : CSS_COLOR_NAMES[Math.floor(Math.random()*CSS_COLOR_NAMES.length)] } );

                            alchemy = new Alchemy(config)  

                            // once  you get this id, use to extract the graph_id and the graph number from the response to update the data source of the alchemy.
                        });
                        a.appendChild(document.createTextNode("Graph " + graph_id));
                        
                        li.appendChild(a);
                        ul.appendChild(li);
                      }
                      //update the div.
                  }




                  // Build the chart
                        // TESGING 
                    var statistics = thisGraph.state.stats;


                    var load_time_percentage = (statistics.DB_Load_Time / statistics.Total_Time ) * 100;
                    var filtering_time_percentage = (statistics.Filtering_Time / statistics.Total_Time) * 100;
                    var matching_time_percentage = (statistics.Matching_Time / statistics.Total_Time) * 100;
                    var query_build_time_percentage  = (statistics.Query_Build_time / statistics.Total_Time) * 100;


                    Highcharts.chart('chart-section', {
                    chart: {
                        plotBackgroundColor: null,
                        plotBorderWidth: null,
                        plotShadow: false,
                        type: 'pie',
                        height: 500,
                        width: 500
                    },
                    title: {
                        text: 'Database Stats'
                    },
                    tooltip: {
                        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                    },
                    plotOptions: {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: false
                            },
                            showInLegend: true
                        }
                    },
                    series: [{
                        name: 'Database operation',
                        colorByPoint: true,
                        data: [{
                            name: 'Database Load Time',
                            y: parseFloat(load_time_percentage)
                        }, {
                            name: 'Filtering Time',
                            y: parseFloat(filtering_time_percentage),
                            sliced: true,
                            selected: true
                        }, {
                            name: 'Matching Time',
                            y: parseFloat(matching_time_percentage)
                        }, {
                            name: 'Query Build Time',
                            y: parseFloat(query_build_time_percentage)
                        }]
                    }]
                });

            },
            data: request_data
        });

    });


    // query the available database names
    d3.select('#find-database').on("click", function () {
      console.log ('the databsae find');
        $.get('/database', {database_host : d3.select('#database-host').property("value"), database_port : d3.select("#database-port").property("value")} , function (data){
            var names = data.response;
            console.log ('the response ', data.response);

            //clear the list.
            var datbase_names_select = document.getElementById('database-name-select');
            

            //add the new list.
            for (var name in names){
              console.log ("the name  is ", name);
              var opt = document.createElement('option');
              opt.value = names[name];
              opt.innerHTML = names[name];
              datbase_names_select.appendChild(opt);
            }
        });
    });



    // SEND The metadata information
    d3.select('#connect-database').on("click", function (){

        if (thisGraph.state.databaseConnected){
            d3.select('#warning').style('display', 'block');
        }

        $.get('/queryMetadata', {database_host : d3.select('#database-host').property("value"), database_port : d3.select("#database-port").property("value"), database_name : d3.select("#database-name-select").property("value")} , function (data) { 

            thisGraph.state.labels = data.response.sort();
            thisGraph.state.database_name_select = d3.select("#database-name-select").property("value");
            thisGraph.state.databaseConnected = true;

            d3.select ('#database-host-connected').attr("value", d3.select("#database-name-select").property("value"));

            document.getElementById('closeBtn').click();

            d3.select('#note').style('display', 'block');
            
            d3.select ("#close").on('click', function (){
              d3.select('#note').style('display', 'none');
            });

            d3.select ("#close_warning").on('click', function (){
              d3.select('#warning').style('display', 'none');
              d3.select('#note').style('display','none');
            });

            //clear the list first
            var myList = document.getElementById('labels');
            myList.innerHTML = '';

            //display labels 
            for (var label = 0; label  < thisGraph.state.labels.length; label++){
                    var ul = document.getElementById("labels");
                    var li = document.createElement("li");
                    li.setAttribute('id', label );
                    li.appendChild(document.createTextNode(thisGraph.state.labels[label]));
                    ul.appendChild(li);
            }

            d3.select('#label-display').style('display', 'block');
        });
    });


    d3.select("#upload-input").on("click", function(){
      document.getElementById("file-upload").click();
    });


    d3.select("#file-hidden-upload").on("change", function(){
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        var uploadFile = this.files[0];
        console.log ('the upload file ', uploadFile);

        var filereader = new window.FileReader();
        
        filereader.onload = function(){
          var txtRes = filereader.result;
          // TODO better error handling
          try{
            var jsonObj = JSON.parse(txtRes);
            thisGraph.deleteGraph(true);
            thisGraph.nodes = jsonObj.nodes;
            thisGraph.setIdCt(jsonObj.nodes.length + 1);
            var newEdges = jsonObj.edges;
            newEdges.forEach(function(e, i){
              newEdges[i] = {source: thisGraph.nodes.filter(function(n){return n.id == e.source;})[0],
                          target: thisGraph.nodes.filter(function(n){return n.id == e.target;})[0]};
            });
            thisGraph.edges = newEdges;
            thisGraph.updateGraph();
          }catch(err){
            window.alert("Error parsing uploaded file\nerror message: " + err.message);
            return;
          }
        };
        filereader.readAsText(uploadFile);
        
      } else {
        alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
      }

    });


    d3.select('#file-download').on('click', function (){

      var saveEdges = [];
      thisGraph.edges.forEach(function(val, i){
        saveEdges.push({source: val.source.id, target: val.target.id});
      });

      var blob = new Blob([window.JSON.stringify({"nodes": thisGraph.nodes, "edges": saveEdges})], {type: "text/plain;charset=utf-8"});
      saveAs(blob, "mydag.json");
    });


    d3.select("#pointer-drag").on("click", function (){
      thisGraph.state.buttonIsDraw  = true;
      console.log ('buttonIsDraw pointer-drag', thisGraph.state.buttonIsDraw);
    });


    d3.select("#query-drag").on("click", function() {

      thisGraph.state.buttonIsDraw = false;
      console.log ('buttonIsDraw query-drag', thisGraph.state.buttonIsDraw);
    });

    // handle delete graph
    d3.select("#delete-graph").on("click", function(){
      thisGraph.deleteGraph(false);
    });

  };



  GraphCreator.prototype.setIdCt = function(idct){
    this.idct = idct;
  };

  GraphCreator.prototype.consts =  {
    selectedClass: "selected",
    connectClass: "connect-node",
    circleGClass: "conceptG",
    graphClass: "graph",
    activeEditId: "active-editing",
    BACKSPACE_KEY: 8,
    DELETE_KEY: 46,
    ENTER_KEY: 13,
    nodeRadius: 50
  };

  /* PROTOTYPE FUNCTIONS */

  GraphCreator.prototype.dragmove = function(d) {
    var thisGraph = this;
    if (thisGraph.state.shiftNodeDrag){
      thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
    } else{
      d.x += d3.event.dx;
      d.y +=  d3.event.dy;
      thisGraph.updateGraph();
    }
  };

  GraphCreator.prototype.deleteGraph = function(skipPrompt){
    var thisGraph = this,
        doDelete = true;
    if (!skipPrompt){
      doDelete = window.confirm("Press OK to delete this graph");
    }
    if(doDelete){
      thisGraph.nodes = [];
      thisGraph.edges = [];
      thisGraph.updateGraph();
    }
  };

  /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
  GraphCreator.prototype.selectElementContents = function(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };


  /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
  GraphCreator.prototype.insertTitleLinebreaks = function (gEl, title) {
    var words = title.split(/\s+/g),
        nwords = words.length;
    var el = gEl.append("text")
          .attr("text-anchor","middle")
          .attr("dy", "-" + (nwords-1)*7.5);

    for (var i = 0; i < words.length; i++) {
      var tspan = el.append('tspan').text(words[i]);
      if (i > 0)
        tspan.attr('x', 0).attr('dy', '15');
    }
  };

  
  // remove edges associated with a node
  GraphCreator.prototype.spliceLinksForNode = function(node) {
    var thisGraph = this,
        toSplice = thisGraph.edges.filter(function(l) {
      return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
      thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
    });
  };

  GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
    var thisGraph = this;
    d3Path.classed(thisGraph.consts.selectedClass, true);
    if (thisGraph.state.selectedEdge){
      thisGraph.removeSelectFromEdge();
    }
    thisGraph.state.selectedEdge = edgeData;
  };

  GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData){
    var thisGraph = this;
    d3Node.classed(this.consts.selectedClass, true);
    if (thisGraph.state.selectedNode){
      thisGraph.removeSelectFromNode();
    }


    thisGraph.state.selectedNode = nodeData;
  };
  
  GraphCreator.prototype.removeSelectFromNode = function(){
    var thisGraph = this;
    thisGraph.circles.filter(function(cd){
      return cd.id === thisGraph.state.selectedNode.id;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedNode = null;
  };

  GraphCreator.prototype.removeSelectFromEdge = function(){
    var thisGraph = this;
    thisGraph.paths.filter(function(cd){
      return cd === thisGraph.state.selectedEdge;
    }).classed(thisGraph.consts.selectedClass, false);
    thisGraph.state.selectedEdge = null;
  };

  GraphCreator.prototype.pathMouseDown = function(d3path, d){
    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownLink = d;

    if (state.selectedNode){
      thisGraph.removeSelectFromNode();
    }
    
    var prevEdge = state.selectedEdge;  
    if (!prevEdge || prevEdge !== d){
      thisGraph.replaceSelectEdge(d3path, d);
    } else{
      thisGraph.removeSelectFromEdge();
    }
  };

  // mousedown on node
  GraphCreator.prototype.circleMouseDown = function(d3node, d){
    console.log ('circleMouseDown is called on clicking?');
    var thisGraph = this,
        state = thisGraph.state;
    d3.event.stopPropagation();
    state.mouseDownNode = d;
    if (thisGraph.state.buttonIsDraw){
      state.shiftNodeDrag = thisGraph.state.buttonIsDraw;
      // reposition dragged directed edge
      thisGraph.dragLine.classed('hidden', false)
        .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
      return;
    }
  };

  /* place editable text on node in place of svg text */
  GraphCreator.prototype.changeTextOfNode = function(d3node, d){
    console.log ('changeTextOfNode is called on clicking?');
    var thisGraph= this,
        consts = thisGraph.consts,
        htmlEl = d3node.node();
    d3node.selectAll("text").remove();
    var nodeBCR = htmlEl.getBoundingClientRect(),
        curScale = nodeBCR.width/consts.nodeRadius,
        placePad  =  5*curScale,
        useHW = curScale > 1 ? nodeBCR.width*0.71 : consts.nodeRadius*1.42;

        console.log("the d.title " + nodeBCR.width + " " + nodeBCR.height);



    // replace with editableconent text
    var d3txt = thisGraph.svg.selectAll("foreignObject")
          .data([d])
          .enter()
          .append("foreignObject")
          .attr("x", nodeBCR.left + placePad )
          .attr("y", nodeBCR.top + placePad)
          .attr("height", 2*useHW)
          .attr("width", useHW)
          .append("xhtml:p")
          .attr("id", consts.activeEditId)
          .attr("contentEditable", "true")
          .text(d.title)
          .on("mousedown", function(d){
            d3.event.stopPropagation();
          })
          .on("keydown", function(d){
            d3.event.stopPropagation();
            if (d3.event.keyCode == consts.ENTER_KEY && !thisGraph.state.buttonIsDraw){
              this.blur();
            }
          })
          .on("blur", function(d){


            //check if the label is part of the state.labels
            if (thisGraph.state.labels.includes(this.textContent)){
              d.title = this.textContent;
              
            }else{
              console.log ('the slected ', d3node);
            }

            thisGraph.insertTitleLinebreaks(d3node, d.title);
            d3.select(this.parentElement).remove();
          });
    return d3txt;
  };

  // mouseup on nodes
  GraphCreator.prototype.circleMouseUp = function(d3node, d){
    console.log ('circleMouseUp is called on clicking?');
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
    // reset the states
    state.shiftNodeDrag = false;    
    d3node.classed(consts.connectClass, false);
    
    var mouseDownNode = state.mouseDownNode;
    
    if (!mouseDownNode) return;

    thisGraph.dragLine.classed("hidden", true);

    if (mouseDownNode !== d){
      // we're in a different node: create new edge for mousedown edge and add to graph
      var newEdge = {source: mouseDownNode, target: d};
      var filtRes = thisGraph.paths.filter(function(d){
        if (d.source === newEdge.target && d.target === newEdge.source){
          thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
        }
        return d.source === newEdge.source && d.target === newEdge.target;
      });
      if (!filtRes[0].length){
        thisGraph.edges.push(newEdge);
        thisGraph.updateGraph();
      }
    } else{
      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{
        // clicked, not dragged
        if (thisGraph.state.buttonIsDraw){
          // shift-clicked node: edit text content
          var d3txt = thisGraph.changeTextOfNode(d3node, d);
          var txtNode = d3txt.node();
          thisGraph.selectElementContents(txtNode);
          txtNode.focus();
        } else{
          if (state.selectedEdge){
            thisGraph.removeSelectFromEdge();
          }
          var prevNode = state.selectedNode;            
          
          if (!prevNode || prevNode.id !== d.id){
            thisGraph.replaceSelectNode(d3node, d);
          } else{
            thisGraph.removeSelectFromNode();
          }
        }
      }
    }
    state.mouseDownNode = null;
    return;
    
  }; // end of circles mouseup

  // mousedown on main svg
  GraphCreator.prototype.svgMouseDown = function(){
    this.state.graphMouseDown = true;
    console.log ('svgMouseDown is called on clicking?');
  };

  // mouseup on main svg
  GraphCreator.prototype.svgMouseUp = function(){
    console.log ('svgMouseUp is called on clicking?');
    var thisGraph = this,
        state = thisGraph.state;
    if (state.justScaleTransGraph) {
      // dragged not clicked
      state.justScaleTransGraph = false;
    } else if (state.graphMouseDown && thisGraph.state.buttonIsDraw){
      // clicked not dragged from svg
      var xycoords = d3.mouse(thisGraph.svgG.node()),
          d = {id: thisGraph.idct++, title: "NEW NODE", x: xycoords[0], y: xycoords[1]};
      thisGraph.nodes.push(d);
      thisGraph.updateGraph();
      // make title of text immediently editable
      var d3txt = thisGraph.changeTextOfNode(thisGraph.circles.filter(function(dval){
        return dval.id === d.id;
      }), d),
          txtNode = d3txt.node();
      thisGraph.selectElementContents(txtNode);
      txtNode.focus();
    } else if (state.shiftNodeDrag){
      // dragged from node
      state.shiftNodeDrag = false;
      thisGraph.dragLine.classed("hidden", true);
    }
    state.graphMouseDown = false;
  };

  // keydown on main svg
  GraphCreator.prototype.svgKeyDown = function() {
    console.log ('svgKeyDown is called on clicking?');
    var thisGraph = this,
        state = thisGraph.state,
        consts = thisGraph.consts;
    // make sure repeated key presses don't register for each keydown
    if(state.lastKeyDown !== -1) return;

    state.lastKeyDown = d3.event.keyCode;
    var selectedNode = state.selectedNode,
        selectedEdge = state.selectedEdge;

    switch(d3.event.keyCode) {
    case consts.BACKSPACE_KEY:
    case consts.DELETE_KEY:
      d3.event.preventDefault();
      if (selectedNode){
        thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
        thisGraph.spliceLinksForNode(selectedNode);
        state.selectedNode = null;
        thisGraph.updateGraph();
      } else if (selectedEdge){
        thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
        state.selectedEdge = null;
        thisGraph.updateGraph();
      }
      break;
    }
  };

  GraphCreator.prototype.svgKeyUp = function() {
    console.log ('svgKeyUp is called on clicking?');
    this.state.lastKeyDown = -1;
  };

  // call to propagate changes to graph
  GraphCreator.prototype.updateGraph = function(){
    
    var thisGraph = this,
        consts = thisGraph.consts,
        state = thisGraph.state;
    
    thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
      return String(d.source.id) + "+" + String(d.target.id);
    });
    var paths = thisGraph.paths;
    // update existing paths
    paths.style('marker-end', 'url(#end-arrow)')
      .classed(consts.selectedClass, function(d){
        return d === state.selectedEdge;
      })
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      });

    // add new paths
    paths.enter()
      .append("path")
      .style('marker-end','url(#end-arrow)')
      .classed("link", true)
      .attr("d", function(d){
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
      })
      .on("mousedown", function(d){
        thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
        }
      )
      .on("mouseup", function(d){
        state.mouseDownLink = null;
      });

    // remove old links
    paths.exit().remove();
    
    // update existing nodes
    thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d){ return d.id;});
    thisGraph.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

    // add new nodes
    var newGs= thisGraph.circles.enter()
          .append("g");

    newGs.classed(consts.circleGClass, true)
      .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
      .on("mouseover", function(d){        
        if (state.shiftNodeDrag){
          d3.select(this).classed(consts.connectClass, true);
        }
      })
      .on("mouseout", function(d){
        d3.select(this).classed(consts.connectClass, false);
      })
      .on("mousedown", function(d){
        thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
      })
      .on("mouseup", function(d){
        thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
      })
      .call(thisGraph.drag);

    newGs.append("circle")
      .attr("r", String(consts.nodeRadius));

    newGs.each(function(d){
      thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
    });

    // remove old nodes
    thisGraph.circles.exit().remove();
  };

  GraphCreator.prototype.zoomed = function(){
    this.state.justScaleTransGraph = true;
    d3.select("." + this.consts.graphClass)
      .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")"); 
  };

  GraphCreator.prototype.updateWindow = function(svg){
    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];
    var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    var y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    svg.attr("width", "600").attr("height", "600");
  };




  /**** MAIN ****/

  // warn the user when leaving
  window.onbeforeunload = function(){
    return "Make sure to save your graph locally before leaving :-)";
  };      

  console.log ("this script is called");

  var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName('body')[0];
  
  var width = 600,
      height =  600;

  var xLoc = width/2 - 25,
      yLoc = 100;

  // initial node data
  var nodes = [{title: "NEW NODE", id: 0, x: xLoc, y: yLoc},
               {title: "NEW NODE", id: 1, x: xLoc, y: yLoc + 200}];
  var edges = [{source: nodes[1], target: nodes[0]}];

  d3.select("#label-display").style('display', 'none');


  // Testing
  /** MAIN SVG **/
  var svg = d3.select("#query-section").append("svg")
        .attr("width", "600")
        .attr("height", "600");


   // extract the database names
  var graph = new GraphCreator(svg, nodes, edges);
  graph.setIdCt(2);
  graph.updateGraph();

})(window.d3, window.saveAs, window.Blob);


// Side bar navigation.
function openNav() {
    document.getElementById("mySideNav").style.width = "250px";
}

function closeNav() {
    document.getElementById("mySideNav").style.width = "0";
}





