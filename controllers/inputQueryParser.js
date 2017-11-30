var fileSystem = require('fs');
var queryDatabase = require('../models/queryDatabase');

var current_query_filename = "";


function getNodeIndex(nodeId, nodes){
	for (var index = 0; index < nodes.length; index++){
		if (nodes[index].id == nodeId)
			return index;
	}
	return -1;
}


module.exports = {

	parseQueryGraph : function (request, response , callback){
		
		var graph_data = request.body.graph_data;
		var database_config = {
			host : request.body.database_host,
			port : request.body.database_port,
			name : request.body.database_name
		}
			
		console.log(database_config);

		var parsed_data = ""
		var query_id = Math.random();

		parsed_data += "#query_" + query_id +  "\n";
		fileName = "#query_" + query_id;
		current_query_filename = fileName;

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
			queryDatabase.queryWithFile(database_config, "queries/" + fileName,function extractQueryResult(database_response){
					callback(database_response);
				});
			});
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
	},

	databases : function (request ,response){


		var database_host = request.query.database_host;
		var database_port = request.query.database_port;
		

		var database_config = {
			host : database_host,
			port : database_port,
		}

		queryDatabase.databases(database_config, function (data){
			response.json(data);
		});
	},

	paginationQuery : function (request, response, callback){

		
		var database_config = {
			host : request.body.database_host,
			port : request.body.database_port,
			name : request.body.database_name,
			pagination_index: request.body.result_pagination_id
		}

		// call the model to send the input file.
		queryDatabase.paginationQuery(database_config, "queries/" + current_query_filename, 
			function paginationResult(database_response){
				callback(database_response);
			}
		);
	}

}