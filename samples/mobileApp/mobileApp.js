require(["dapp/main", //"dojo/json",
		"dojo/text!./config.json",
		/*"dojo/text!./dapp/samples/mobileApp/config.json",*/
		"dojo/sniff"
	],
	function (Application, /*json,*/ config, has) {
		/* jshint nonew: false */
		has.add("requirejs", window.requirejs);

		// remove single line comments from the config json
		var jsonData = config;
		jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
		jsonData = jsonData.replace(/\/\/.*/g, "");
		var appDeferred = new Application(JSON.parse(jsonData));
		appDeferred.then(function (app) {
			console.log("deferred resolved for new App [" + app.id + "] it should be started and default views shown");
		})
	});
