var express = require('express');
var router = express.Router()
var inputQueryController = require('./controllers/inputQueryParser');


//define the routes.
router.get('/', function (request, response){
	response.render('index');
});

router.post('/submitQuery', function (request, response){
	console.log ('the request', request.body);
	inputQueryController.parseQueryGraph(request,response, function (database_response){
		response.json(database_response);
	});
});

// to get all the labels,
router.get('/queryMetadata', function (request, response){
	inputQueryController.queryMetadata(request,response);
});


module.exports = router