var sys = require('sys');
var exec = require('child_process').exec;
const axios =  require('axios');
var FormData = require('form-data');
var fs =require('fs');
var request = require('request'); 

module.exports = {

	queryWithFile : function (database_config,filename, callback){

		var query = 'http://' + database_config.host + ':' + database_config.port +'/runQuery/' + database_config.name;
		console.log ('query', query);

		//var form = new FormData();
		//form.append('queryfile' , fs.createReadStream(filename))
		request.post({url : query,
			formData : {'queryfile' : fs.createReadStream(filename)}
		} , function(err, httpResponse, body){
			if (err) console.error("upload fialed : " ,err);
			console.log(body);
			callback(body);

		});

		// axios.post(query, JSON.parse({file : queryString}))
  // 			 .then(response => {
  // 			 	console.log('the response ', response);

		// 		 callback({ "0" : [ { "nodes" : [ "1" , "2" , "3"]}]});
		//       })
		//      .catch(error => {
		//      	console.log("the error");
		// 		    console.log(error);
		// 	  });
		

	},

	queryMetadata : function (database_config, callback){

		var query = 'http://' + database_config.host + ':' + database_config.port +'/getLabels/' + database_config.name;
		axios.get(query)
  			 .then(response => {
  			 		console.log(response);

				 callback(response.data);
		      })
		     .catch(error => {
				    console.log(error);
				    callback({ labels : ['1', '2', '3']});
			  });
	}
}