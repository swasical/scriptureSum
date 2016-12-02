var express = require('express');
var bodyParser = require('body-parser');
var nodeApp = express();

nodeApp.use(bodyParser.json());
nodeApp.use(express.static('C:\\Users\\daniel86\\Documents\\GitHub\\scriptureSum'));
nodeApp.listen(process.env.PORT || 3000);

var fs = require('fs');
nodeApp.post('/saveSettings', function(req, res) {
	// todo - if there were more than one user, you could save a settings file for each user
	console.log(req.body);
	
	if (req.body && req.body.data) {
		fs.writeFile('./settings.json', JSON.stringify(req.body.data, null, 4), 'utf-8');
		res.send('Saved');
	} else {
		res.send('Error saving');
	}
});
