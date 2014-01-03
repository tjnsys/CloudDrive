var https = require("https");
var jsdom = require("jsdom");
var querystring = require("querystring");

BoxFileSystem = function(token) {
	this.setToken(token);
}
exports.BoxFileSystem = BoxFileSystem;

BoxFileSystem.prototype.setToken = function(token) {
	this.token = token;
}

BoxFileSystem.prototype.getRoot = function() {
	return 0;
}

BoxFileSystem.prototype.getFiles = function(folderID, listener) {
	var options = {
		host: "api.box.com",
		path: "/2.0/folders/" + folderID,
		method: "GET",
		headers: { "Authorization": "Bearer " + this.token }
	};
	var req = https.request(options, function(res) {
		var data = "";
		res.on("data", function(chunk) {
			data += chunk;
		});
		res.on("end", function() {
			listener(data);
		});
	});
	req.on("error", function(err) {
		console.log("HTTP request error: " + err.message);
	});
	req.end();
}

BoxFileSystem.prototype.upload = function(folderID, fileName, listener) {
curl https://upload.box.com/api/2.0/files/content \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-F filename=@FILE_NAME \
-F folder_id=FOLDER_ID
assert(response.total_count == 1);
assert(response.entries[0].size == fileSize);
}

BoxFileSystem.prototype.download = function(fileID, listener) {
curl https://api.box.com/2.0/files/FILE_ID/content?version=10849 \
-H "Authorization: Bearer ACCESS_TOKEN"
}
