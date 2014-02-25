require(["dapp/main", //"dojo/json",
		"dojo/text!./config.json",
		/*"dojo/text!./dapp/samples/mobileAppNested/config.json",*/
		"dojo/sniff"
	],
	function (Application, /*json,*/ config, has) {
		/* jshint nonew: false */
		has.add("requirejs", window.requirejs);
		var jsonData = config;
		jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
		jsonData = jsonData.replace(/\/\/.*/g, "");
		//jsonData = JSON.minify(jsonData);
		//new Application(json.parse(config));
		new Application(JSON.parse(jsonData));
	});
