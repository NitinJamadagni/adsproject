var sys = require('sys');
var exec = require('child_process').exec;
const axios =  require('axios'); 

module.exports = {

	queryWithFile : function (queryString, response, callback){

		var query = 'http://' + database_config.host + ':' + database_config.port +'/getLabels/' + database_config.name;
		console.log ('query', query);
		axios.get(query)
  			 .then(response => {
				 callback(response);
		      })
		     .catch(error => {
				    console.log(error);
			  });
		

	},

	queryMetadata : function (database_config, callback){

		var query = 'http://' + database_config.host + ':' + database_config.port +'/getLabels/' + database_config.name;
		console.log ('query', query);
		axios.get(query)
  			 .then(response => {
				 callback(response);
		      })
		     .catch(error => {
				    console.log(error);
			  });
	}
}