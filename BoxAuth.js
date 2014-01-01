var https = require("https");
var jsdom = require("jsdom");
var querystring = require("querystring");

exports.BoxAuth = BoxAuth;

function BoxAuth(clientID, clientSecret) {
	this.clientID = clientID;
	this.clientSecret = clientSecret;
	this.verbose = false;
	this.headers = {};
	this.defineHandler1();
	this.defineHandler2();
	this.defineHandler3();
	this.accessCode = "unknown";
	this.next = function(){};
}

BoxAuth.prototype.defineHandler1 = function() {
	var myself = this;
	this.authorizeHandler1 = function(res) {
		if (myself.verbose) {
			console.log("Response status1: " + res.statusCode);
			console.log("Response headers1: " + JSON.stringify(res.headers));
		}
		var cookies = [];
		var resCookies = res.headers["set-cookie"];
		for (var i = 0; i < resCookies.length; i++) {
			var cookie = resCookies[i];
			var fields = cookie.split(";");
			cookies.push(fields[0]);
		}
		myself.headers["Cookie"] = cookies.join("; ");
		myself.headers["Content-Type"] = "application/x-www-form-urlencoded";
		res.setEncoding("utf8");
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			if (myself.verbose) {
				console.log(data);
			}
			var doc = jsdom.jsdom(data);
			var window = doc.createWindow();
			var form = window.document.getElementsByName("login_form")[0];
			var inputs = window.document.getElementsByTagName("input");
			var params = {};
			for (var i = 0; i < inputs.length; i++) {
				if (inputs[i].name == "login") {
					params[inputs[i].name] = myself.login;
				} else if (inputs[i].name == "password") {
					params[inputs[i].name] = myself.password;
				} else {
					params[inputs[i].name] = inputs[i].value;
				}
			}
			var	elements = form.action.match(/^[httpsfile]+:\/{2,3}([0-9a-zA-Z\.\-:]+?):?[0-9]*?(\/.*)/i);
			var options = {
				host: elements[1],
				path: elements[2],
				method: form.method.toUpperCase(),
				headers: myself.headers
			};
			if (myself.verbose) {
				console.log(options);
				console.log(querystring.stringify(params));
			}
			var req = https.request(options, myself.authorizeHandler2);
			req.write(querystring.stringify(params));
			req.on("error", function(err) {
				console.log("HTTP request error: " + err.message);
			});
			req.end();
		});
	}
}

BoxAuth.prototype.defineHandler2 = function() {
	var myself = this;
	this.authorizeHandler2 = function(res) {
		if (myself.verbose) {
			console.log("Response status2: " + res.statusCode);
			console.log("Response headers2: " + JSON.stringify(res.headers));
		}
		res.setEncoding("utf8");
		var cookies = [];
		var resCookies = res.headers["set-cookie"];
		for (var i = 0; i < resCookies.length; i++) {
			var cookie = resCookies[i];
			var fields = cookie.split(";");
			cookies.push(fields[0]);
		}
		myself.headers["Cookie"] += "; " + cookies.join("; ");
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			if (myself.verbose) {
				console.log(data);
			}
			myself.headers["Content-Type"] = "application/x-www-form-urlencoded";
			var doc = jsdom.jsdom(data);
			var window = doc.createWindow();
			var form = window.document.getElementsByName("consent_form")[0];
			var inputs = window.document.getElementsByTagName("input");
			var params = {};
			for (var i = 0; i < inputs.length; i++) {
				if (inputs[i].type == "hidden") {
					params[inputs[i].name] = inputs[i].value;
				}
			}
			var	elements = form.action.match(/^[httpsfile]+:\/{2,3}([0-9a-zA-Z\.\-:]+?):?[0-9]*?(\/.*)/i);
			var options = {
				host: elements[1],
				path: elements[2],
				method: form.method.toUpperCase(),
				headers: myself.headers
			};
			if (myself.verbose) {
				console.log(options);
				console.log(querystring.stringify(params));
			}
			var req = https.request(options, myself.authorizeHandler3);
			req.write(querystring.stringify(params));
			req.on("error", function(err) {
				console.log("HTTP request error: " + err.message);
			});
			req.end();
		});
	}
}

BoxAuth.prototype.defineHandler3 = function() {
	var myself = this;
	this.authorizeHandler3 = function(res) {
		if (myself.verbose) {
			console.log("Response status3: " + res.statusCode);
			console.log("Response headers3: " + JSON.stringify(res.headers));
		}
		res.setEncoding("utf8");
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			if (myself.verbose) {
				console.log(data);
			}
		});
		myself.accessCode = res.headers["location"].match(/.*&code=(.*)/)[1];
		myself.next();
	}
}

BoxAuth.prototype.auth = function(login, password, listener) {
	this.login = login;
	this.password = password;
	this.next = listener;
	var options = {
		host: "app.box.com",
		path: "/api/oauth2/authorize?response_type=code&client_id=" + this.clientID,
		method: "GET"
	};
	if (this.verbose) {
		console.log(options);
	}
	var req = https.request(options, this.authorizeHandler1);
	req.on("error", function(err) {
		console.log("HTTP request error: " + err.message);
	});
	req.end();
}
