var BoxAuth = require("./BoxAuth.js").BoxAuth;
var config = require("./Config.js").config;

// get configurations
var sites = config.storage;
var siteName = sites[0].name;
var clientID = sites[0].client_id;
var clientSecret = sites[0].clientSecret;
var user = sites[0].user;
//var password = sites[0].pass;
var password = getPassword(siteName, user);

var box = new BoxAuth(clientID, clientSecret);
//box.verbose = true;
box.auth(user, password, onAuthFinished);

function onAuthFinished() {
	console.log(box.accessCode);
}

function getPassword(site, user) {
	console.log("password for " + user + "@" + site + "> ");
	return require('fs').readFileSync('/dev/stdin', 'utf8').trim();
}
