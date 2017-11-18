const express = require('express');
const app = express();
var query = require('./queryRouter');
var pug = require('pug');
var bodyParser = require('body-parser');



app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(query)

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public', {redirect: false}));



app.listen(3000, () => console.log('Example app listening on port 3000!'));
