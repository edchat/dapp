define([
	"intern!object",
	"intern/chai!assert",
	"dapp/main",
	"dojo/json",
	"dojo/topic",
	"dojo/on",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"delite/register",
	"dojo/Deferred",
	"dojo/text!dapp/tests/unit/simple1/simple1.json",
	"dojo/text!dapp/tests/unit/simple1/simple2.json",
	"dojo/text!dapp/tests/unit/simple1/simple3.json",
	"deliteful/LinearLayout",
	"deliteful/ViewStack"
], function (registerSuite, assert, main, json, topic, on, domGeom, domClass, register, Deferred,
	simple1config, simple2config, simple3config) {
	// for suite1
	var container1, node1;
	var htmlContent1 =
		"<d-linear-layout id='dlayout1' style='height:500px'>" +
		"</d-linear-layout>";

	var suite1 = {
		name: "suite1 dapp Simple1: test app status",
		setup: function () {
			container1 = document.createElement("div");
			document.body.appendChild(container1);
			container1.innerHTML = htmlContent1;
			register.parse(container1);
			node1 = document.getElementById("dlayout1");
			testApp = null;
			previousStatus = 0;
			appName = "simple1App";
		},
		"suite1 dapp simple1 test app status": function () {
			var d = this.async(20000);

			var handle;
			// check the app status as it updates when the app is started and stopped
			handle = topic.subscribe("/app/status", function (status, appId) {
				if (appId = appName) {
					console.log(appId, ":simple1/Simple test in topic.subscribe for /app/status for [" +
						appName + "] status =[" + status + "] previousStatus=[" + previousStatus + "] appId=[" + appId + "]");
					assert.deepEqual(status, previousStatus + 1, "app status should progress from Starting to Stopped");
					previousStatus = status;
					if (previousStatus === 4) { // STOPPED
						handle.remove();
					}
				}
			});

			// create the app from the config and wait for the deferred
			var appStartedDef = main(json.parse(stripComments(simple1config)), container1);
			appStartedDef.then(function (app) {
				// we are ready to test
				testApp = app;

				// check the app status it should be STARTED
				testApp.log("testApp:", 'simple1/Simple test testApp.getStatus()=' + testApp.getStatus());
				assert.deepEqual(testApp.getStatus(), testApp.lifecycle.STARTED);

				// This section would normally go in teardown, but do it here to test status
				container1.parentNode.removeChild(container1);

				var appStoppedDef = testApp.unloadApp(); // unload and stop the app
				appStoppedDef.then(function () { // when the app is unloaded verify status and call resolve
					testApp.log("testApp:", 'simple1/Simple test testApp.getStatus()=' + testApp.getStatus());
					assert.deepEqual(testApp.getStatus(), testApp.lifecycle.STOPPED);

					// test is finished resolved the deferred
					d.resolve();
				});
			});
			return d;
		},
		teardown: function () {
			//	console.log('simple1/Simple test teardown testApp.getStatus()='+testApp.getStatus());
		}
	};
	registerSuite(suite1);

	// -------------------------------------------------------------------------------------- //
	// for suite2
	var container2, node2;
	var htmlContent2 =
		"<d-linear-layout id='dlayout2' style='height:500px'>" +
		"</d-linear-layout>";

	var suite2 = {
		name: "suite2 dapp Simple2: test app initial layout",
		setup: function () {
			appName = "simple1App2"; // this is from the config
			container2 = document.createElement("div");
			document.body.appendChild(container2);
			container2.innerHTML = htmlContent2;
			register.parse(container2);
			node2 = document.getElementById("dlayout2");
			testApp = null;

		},
		"suite2 dapp simple2 test initial layout": function () {
			var d = this.async(10000);

			// create the app from the config and wait for the deferred
			var appStartedDef = main(json.parse(stripComments(simple2config)), container2);
			appStartedDef.then(function (app) {
				// we are ready to test
				testApp = app;

				// check the DOM state to see if we are in the expected state
				assert.isNotNull(document.getElementById("dlayout2"), "root dlayout2 must be here");
				assert.isNotNull(document.getElementById("simp2Home1"), "simp2Home1 view must be here");
				assert.isNotNull(document.getElementById("simp2Home2"), "simp2Home2 view must be here");
				assert.isNotNull(document.getElementById("simp2Home3NoController"), "simp2Home3NoController view must be here");

				var children = node2.getChildren();
				node2.style.height = "600px";
				children[1].style.height = "";
				//	domClass.add(children[1], "fill");
				var box1 = domGeom.getMarginBox(children[0]);
				var box2 = domGeom.getMarginBox(children[1]);
				var box3 = domGeom.getMarginBox(children[2]);
				//testApp.log("testApp:",'simple1/Simple suite2 dapp simple test with deferred simp1Home1 height =['+box1.h+']');
				//testApp.log("testApp:",'simple1/Simple suite2 dapp simple test with deferred simp1Home2 height =['+box2.h+']');
				//testApp.log("testApp:",'simple1/Simple suite2 dapp simple test with deferred simp1Home3NoController height =['+box3.h+']');
				assert.deepEqual(box1.h, 200);
				assert.deepEqual(box3.h, 200);
				assert.deepEqual(box1.h, box2.h);

				// test is finished resolved the deferred
				d.resolve();
			});
			return d;
		},
		teardown: function () {
			// call unloadApp to cleanup and end the test
			container2.parentNode.removeChild(container2);
			testApp.unloadApp();
		}
	};
	registerSuite(suite2);


	// -------------------------------------------------------------------------------------- //
	// for suite3
	var container3, node3;
	var htmlContent3 =
		"<d-view-stack id='dviewStack3' style='width: 100%; height: 100%; position: absolute !important'>" +
		"</d-view-stack>";

	var suite3 = {
		name: "suite3 dapp Simple3: test app transitions",
		setup: function () {
			appName = "simple1App3"; // this is from the config
			container3 = document.createElement("div");
			document.body.appendChild(container3);
			container3.innerHTML = htmlContent3;
			register.parse(container3);
			node3 = document.getElementById("dviewStack3");
			testApp = null;

		},
		"suite3 dapp simple3 test initial layout": function () {
			var d = this.async(10000);
			var _self = this;

			var appStartedDef = main(json.parse(stripComments(simple3config)), container3);
			// TODO App construction method should probably return a promise which would make all of this a bit simpler
			appStartedDef.then(function (app) {
				// we are ready to test
				testApp = app;

				var simp3Home1 = document.getElementById("simp3Home1");
				// check the DOM state to see if we are in the expected state
				assert.isNotNull(node3, "root node3 must be here");
				assert.isNotNull(simp3Home1, "simp3Home1 view must be here");

				checkNodeVisibility(node3, simp3Home1);

				// test is finished resolved the deferred
				d.resolve();
			});
			return d;
		},
		"Show (by widget.show with id) test on delite-display-complete": function () {
			var d = this.async(10000);

			on.once(node3, "delite-display-complete", function (complete) {
				var simp3Home3NoController = document.getElementById("simp3Home3NoController");
				checkNodeVisibility(node3, simp3Home3NoController);
				d.resolve();
			});
			node3.show("simp3Home3NoController");
		},
		"Show (by widget.show with id) test with deferred": function () {
			var d = this.async(10000);

			var showDeferred = node3.show("simp3Home1");
			showDeferred.then(function () {
				setTimeout(function () {
					var simp3Home1 = document.getElementById("simp3Home1");
					checkNodeVisibility(node3, simp3Home1);
					d.resolve();
				}, 0);

			});
		},
		"Show (by widget.show with id) test with node3.on(delite-display-complete": function () {
			var d = this.async(10000);

			var handle = node3.on("delite-display-complete", d.callback(function () {
				var simp3Home3NoController = document.getElementById("simp3Home3NoController");
				checkNodeVisibility(node3, simp3Home3NoController);
				handle.remove(); // avoid second calls from other tests
			}));

			var showDeferred = node3.show("simp3Home3NoController");
		},
		"Test Show (by App.displayView)": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();

			testApp.displayView('simp3Home2', {
				displayDeferred: displayDeferred
			});
			displayDeferred.then(function () {
				console.log("inside displayDeferred !!!!! ");
				setTimeout(function () {
					var simp3Home2 = document.getElementById("simp3Home2");
					checkNodeVisibility(node3, simp3Home2);
					d.resolve();
				}, 0);

			});
		},
		teardown: function () {
			// call unloadApp to cleanup and end the test
			container3.parentNode.removeChild(container3);
			testApp.unloadApp();
		}
	};

	registerSuite(suite3);

	function checkNodeVisibility(vs, target) {
		for (var i = 0; i < vs.children.length; i++) {
			assert.isTrue(
				((vs.children[i] === target && vs.children[i].style.display !== "none") ||
					(vs.children[i] !== target && vs.children[i].style.display === "none")),
				"checkNodeVisibility FAILED for target.id=" + (target ? target.id : "")
			);
		}
	}

	// strip out single line comments from the json config
	function stripComments(jsonData) {
		jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
		jsonData = jsonData.replace(/\/\/.*/g, "");
		return jsonData;
	}

});
