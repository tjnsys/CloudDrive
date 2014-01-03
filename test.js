var BoxAuth = require("./BoxAuth.js").BoxAuth;
var BoxFS = require("./BoxFileSystem.js").BoxFileSystem;
var config = require("./Config.js").config;

// get configurations
var sites = config.storage;
var siteName = sites[0].name;
var clientID = sites[0].client_id;
var clientSecret = sites[0].client_secret;
var user = sites[0].user;
//var password = sites[0].pass;
var password = getPassword(siteName, user);

var box = new BoxAuth(clientID, clientSecret);
box.verbose = true;
box.auth(user, password, onAuthFinished);

function onAuthFinished() {
	console.log("Access Token: " + box.token);
}

function getPassword(site, user) {
	console.log("password for " + user + "@" + site + "> ");
	return require('fs').readFileSync('/dev/stdin', 'utf8').trim();
}

//var token = "pMdBQGZSQwYcGHT4C5JSJFFJtIxSktBD";
//var boxfs = new BoxFS(token);
//boxfs.getFiles(boxfs.getRoot(), showFiles);

function showFiles(data) {
	var files = JSON.parse(data);
	var entries = files.item_collection.entries;
	for (var i in entries) {
		var file = entries[i]; 
		console.log(file.name + ": " + file.type);
	}
}
