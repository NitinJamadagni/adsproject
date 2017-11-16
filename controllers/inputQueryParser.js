var fileSystem = require('fs');
var queryDatabase = require('../models/queryDatabase');


function getNodeIndex(nodeId, nodes){
	for (var index = 0; index < nodes.length; index++){
		if (nodes[index].id == nodeId)
			return index;
	}
	return -1;
}


function extractQueryResult(fileName, response){

	fileSystem.readFile("./output/" + fileName, function (err,data){

		var lines = data.split("\n");

		for (line in lines){
			var tokens = line.split(":");
			var query_id = tokens[0];
			var graph_id = tokens[1];
			var result_set = tokens[2];

			//TODO: write a function to parse the output string.
			var pairs_matching = constructMatchingPairs(result_set);

			response.json(JSON.stringify(pairs_matching));
		}
	});
}


function constructMatchingPairs(result_set){

	return {};
}


module.exports = {

	parseQueryGraph : function (request, response){
		
		var graph_data = request.body;
			
		var parsed_data = ""
		var query_id = Math.random();

		parsed_data += "#query_" + query_id +  "\n";
		fileName = "#query_" + query_id;

		var nodes = graph_data.nodes;
		var edges = graph_data.edges;

		// write the number od nodes to the file
		var nodes_length = nodes.length;
		parsed_data += nodes_length + "\n";


		for (var index = 0; index < nodes_length; index++){
			var node = nodes[index];
			var node_name = node.title;

			parsed_data += node_name + "\n";

		}

		// write number of edges to the file
		var edges_length = edges.length;
		parsed_data += edges_length + "\n";

		for (var index = 0; index < edges_length; index++){
			var edge  = edges[index];
			var from_edge = getNodeIndex(edge.source, nodes);
			var to_edge = getNodeIndex(edge.target, nodes);

			// write the from_edge and to_edge to the file.
			parsed_data += from_edge + ' ' + to_edge + '\n';

		}

		fileSystem.writeFile("queries/" + fileName, parsed_data, function(err){
			if (err)
				console.log ("something went wrong with parsing file creations.");

			// call the model to send the input file.
			queryDatabase.queryWithFile(fileName, response ,extractQueryResult);
		});
	}
}