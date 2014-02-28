require(["dapp/main", "dojo/json", "dojo/text!./config.json", "dojo/sniff"],
	function (Application, json, config, has) {
		has.add("requirejs", window.requirejs);
		/* jshint nonew: false */
		var m = new Application(json.parse(config));
		console.log("back from call to new Application");
	});
