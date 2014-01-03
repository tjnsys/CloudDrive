var https = require("https");
var jsdom = require("jsdom");
var querystring = require("querystring");

exports.BoxAuth = BoxAuth;

function BoxAuth(clientID, clientSecret, refreshAuto) {
	this.clientID = clientID;
	this.clientSecret = clientSecret;
	this.verbose = false;
	this.headers = {};
	this.defineAuthHandler();
	this.defineLoginHandler();
	this.defineGrantHandler();
	this.defineTokenHandler();
	this.defineRefreshTokenHandler();
	this.token = "unknown";
	this.refreshToken = "unknown";
	this.tokenListener = undefined;
	this.refreshAuto = refreshAuto;
}

BoxAuth.prototype.defineAuthHandler = function() {
	var myself = this;
	this.authHandler = function(res) {
		if (myself.verbose) {
			console.log("Auth response: " + res.statusCode);
			console.log("Auth response headers: " + JSON.stringify(res.headers));
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
				console.log("Auth response body: " + data);
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
				console.log("Login request with:", options);
				console.log("Login request params: " + querystring.stringify(params));
			}
			var req = https.request(options, myself.loginHandler);
			req.write(querystring.stringify(params));
			req.on("error", function(err) {
				console.log("HTTP request error: " + err.message);
			});
			req.end();
		});
	}
}

BoxAuth.prototype.defineLoginHandler = function() {
	var myself = this;
	this.loginHandler = function(res) {
		if (myself.verbose) {
			console.log("Login response status: " + res.statusCode);
			console.log("Login response headers: " + JSON.stringify(res.headers));
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
				console.log("Login response body: " + data);
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
				console.log("Grant request with:", options);
				console.log("Grant request params: " + querystring.stringify(params));
			}
			var req = https.request(options, myself.grantHandler);
			req.write(querystring.stringify(params));
			req.on("error", function(err) {
				console.log("HTTP request error: " + err.message);
			});
			req.end();
		});
	}
}

BoxAuth.prototype.defineGrantHandler = function() {
	var myself = this;
	this.grantHandler = function(res) {
		if (myself.verbose) {
			console.log("Grant response status: " + res.statusCode);
			console.log("Grant response headers: " + JSON.stringify(res.headers));
		}
		res.setEncoding("utf8");
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			if (myself.verbose) {
				console.log("Grant response body: " + data);
			}
			var accessCode = res.headers["location"].match(/.*&code=(.*)/)[1];
			if (myself.verbose) {
				console.log("Access code: " + accessCode);
			}
			myself.getAccessToken(accessCode);
		});
	}
}

BoxAuth.prototype.defineTokenHandler = function() {
	var myself = this;
	this.tokenHandler = function(res) {
		if (myself.verbose) {
			console.log("Token response status: " + res.statusCode);
			console.log("Token response headers: " + JSON.stringify(res.headers));
		}
		res.setEncoding("utf8");
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			if (myself.verbose) {
				console.log("Token response body: " + data);
			}
			var items = JSON.parse(data);
			myself.token = items["access_token"];
			myself.refreshToken = items["refresh_token"];
			// auto refresh token
			if (myself.refreshAuto) {
				var limit = items["expires_in"] * 1000;
				setTimeout(myself.refreshTokenHandler, limit * 8 / 10);
			}
			// call token listener if exists
			var tokenListener = myself.tokenListener;
			myself.tokenListener = undefined;
			if (tokenListener != undefined) {
				tokenListener();
			}
		});
	}
}

BoxAuth.prototype.defineRefreshTokenHandler = function() {
	var myself = this;
	this.refreshTokenHandler = function(res) {
		var options = {
			host: "app.box.com",
			path: "/api/oauth2/token",
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" }
		};
		var params = {
			grant_type: "refresh_token",
			refresh_token: myself.refreshToken,
			client_id: myself.clientID,
			client_secret: myself.clientSecret
		};
		if (myself.verbose) {
			console.log("Refresh-Token request with:", options);
			console.log("Refresh-Token request params: " + querystring.stringify(params));
		}
		var req = https.request(options, myself.tokenHandler);
		req.write(querystring.stringify(params));
		req.on("error", function(err) {
			console.log("HTTP request error: " + err.message);
		});
		req.end();
	}
}

BoxAuth.prototype.auth = function(login, password, tokenListener) {
	this.login = login;
	this.password = password;
	this.tokenListener = tokenListener;
	var params = {
		response_type: "code",
		client_id: this.clientID
	};
	var options = {
		host: "app.box.com",
		path: "/api/oauth2/authorize",
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	};
	if (this.verbose) {
		console.log("Auth request with:", options);
		console.log("Auth request params: " + querystring.stringify(params));
	}
	var req = https.request(options, this.authHandler);
	req.write(querystring.stringify(params));
	req.on("error", function(err) {
		console.log("HTTP request error: " + err.message);
	});
	req.end();
}

BoxAuth.prototype.getAccessToken = function(accessCode) {
	var options = {
		host: "app.box.com",
		path: "/api/oauth2/token",
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" }
	};
	var params = {
		grant_type: "authorization_code",
		code: accessCode,
		client_id: this.clientID,
		client_secret: this.clientSecret
	};
	if (this.verbose) {
		console.log("Token request with:", options);
		console.log("Token request params: " + querystring.stringify(params));
	}
	var req = https.request(options, this.tokenHandler);
	req.write(querystring.stringify(params));
	req.on("error", function(err) {
		console.log("HTTP request error: " + err.message);
	});
	req.end();
}

