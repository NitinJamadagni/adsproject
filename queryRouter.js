var express = require('express');
var router = express.Router()
var inputQueryController = require('./controllers/inputQueryParser');


//define the routes.
router.get('/', function (request, response){
	response.render('index');
});


router.get('/database', function (request, response){
	inputQueryController.databases(request,response, function(databases){
		response.json(JSON.parse(databases));
	});
});

router.post('/submitQuery', function (request, response){
	console.log ('the request', request.body);
	inputQueryController.parseQueryGraph(request,response, function (database_response){
		console.log ('the database_response', database_response);
		response.json(JSON.parse(database_response));
	});
});

// to get all the labels,
router.get('/queryMetadata', function (request, response){
	inputQueryController.queryMetadata(request,response);
});


module.exports = router