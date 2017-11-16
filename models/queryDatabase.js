var sys = require('sys');
var exec = require('child_process').exec;

module.exports = {

	queryWithFile : function (fileName, response, callback){

		var linux_command = "./GraphGrepSX/ggsx -f ./queries/" + fileName + " --file-match-output output_file ./output/matches_"+ fileName;
		exec( linux_command, function (error, stdout, stderr){
			//if error.

			callback("matches_" + fileName, response);
		});

	}
}