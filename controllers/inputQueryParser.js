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

//"(1,2),(30,40),(5,6)"
function constructMatchingPairs(result_set){
	
	var pairs = {};
	var number = "";
	var first_number, second_number;
	
	for (var index = 1; index < result_set.length - 1; index++){
		
		var previous_character = result_set[index - 1];
		var character = result_set[index];
		var next_character = result_set[index + 1];

		console.log ('the pre ', previous_character , ' character ', character , ' next_character ', next_character);
		
		if (character == ',' && isNumber(previous_character) && isNumber(next_character)){	
			console.log ('the first _ number ', number);
			first_number = number;
			number = "";
		}
		else if ( character == ')'){
			console.log ('the second _ number ', number);
			second_number = number;
			number = "";
			
			pairs[first_number] = second_number;
			
		}else if (isNumber(character)){
			number += character;
			console.log ('the number added.', number);
		}
	}
	
	return pairs;
}

function isNumber (character){
	console.log ("the isNumber for ", character, " is " , Number.isInteger(character));
	return character == '0' || character == '1' || character == '2' || character == '3' || character == '4' || character == '5' || character == '6' || character == '7' || character == '8' || character == '9';
}



module.exports = {

	parseQueryGraph : function (request, response , callback){
		
		var graph_data = request.body.graph_data;
		var database_config = {
			host : request.body.database_host,
			port : request.body.database_port,
			name : request.body.database_name
		}
			
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

		// fileSystem.writeFile("queries/" + fileName, parsed_data, function(err){
		// 	if (err)
		// 		console.log ("something went wrong with parsing file creations.");

		// 	// call the model to send the input file.
		// 	queryDatabase.queryWithFile(fileName, response ,extractQueryResult);
		// });
		
		
		console.log ("the pairs are ", constructMatchingPairs("{(1,2),(30,40),(5,6)}"));
		callback();
		
	},

	queryMetadata : function (request, response){


		var database_host = request.query.database_host;
		var database_port = request.query.database_port;
		var database_name = request.query.database_name;

		var database_config = {
			host : database_host,
			port : database_port,
			name : database_name
		}

		queryDatabase.queryMetadata(database_config, function (data){
			response.json(data);
		});
	}



}