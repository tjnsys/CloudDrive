var CONFIG_FILE = "config.json";

var fs = require('fs');

var configText = "";

try {
	configText = fs.readFileSync(CONFIG_FILE);
} catch (error) {
	console.log(error);
}

exports.config = JSON.parse(configText);

//for (var i in sites) {
//	console.log(sites[i].user + "/" + sites[i].pass + "@" + sites[i].name);
//}
