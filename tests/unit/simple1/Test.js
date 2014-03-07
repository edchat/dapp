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
	"dojo/text!dapp/tests/unit/simple1/app3.json",
	"deliteful/LinearLayout",
	"deliteful/ViewStack"
], function (registerSuite, assert, main, json, topic, on, domGeom, domClass, register, Deferred,
	simple1config3) {
	// -------------------------------------------------------------------------------------- //
	// for simple1Suite3 transition test
	var simple1Container3, simple1Node3;
	var simple1HtmlContent3 =
		"<d-view-stack id='simple1App3dviewStack' style='width: 100%; height: 100%; position: absolute !important'>" +
		"</d-view-stack>";

	var simple1Suite3 = {
		name: "simple1Suite3: test app transitions",
		setup: function () {
			appName = "simple1App3"; // this is from the config
			simple1Container3 = document.createElement("div");
			document.body.appendChild(simple1Container3);
			simple1Container3.innerHTML = simple1HtmlContent3;
			register.parse(simple1Container3);
			simple1Node3 = document.getElementById("simple1App3dviewStack");
			testApp = null;
			simple1App3Home1View = null;
			simple1App3Home2View = null;
			simple1App3Home3NoControllerView = null;

		},
		"test initial view": function () {
			var d = this.async(10000);
			var _self = this;

			var appStartedDef3 = main(json.parse(stripComments(simple1config3)), simple1Container3);
			appStartedDef3.then(function (app) {
				// we are ready to test
				testApp = app;

				var simple1App3Home1 = document.getElementById("simple1App3Home1");

				// Here simple1App3Home1View should be displayed

				simple1App3Home1View = testApp.getViewFromViewId("simple1App3Home1");
				// check the DOM state to see if we are in the expected state
				assert.isNotNull(simple1Node3, "root simple1Node3 must be here");
				assert.isNotNull(simple1App3Home1, "simple1App3Home1 view must be here");
				assert.deepEqual(simple1App3Home1View.beforeActivateCallCount, 1,
					"simple1App3Home1View.beforeActivateCallCount should be 1");

				checkNodeVisibility(simple1Node3, simple1App3Home1);
				setTimeout(function () { // try timeout to wait for afterAcivate...
					d.resolve();
				}, 100);

			});
			return d;
		},

		// Currently showing simple1App3Home1View test transition to simple1App3Home3NoControllerView
		".show(simple1App3Home3NoController)": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "simple1App3Home3NoController") {
					onHandle.remove();
					var simple1App3Home3NoController = document.getElementById("simple1App3Home3NoController");
					checkNodeVisibility(simple1Node3, simple1App3Home3NoController);

					// Now simple1App3Home3NoController ActivateCallCounts should be 1

					simple1App3Home3NoControllerView = testApp.getViewFromViewId("simple1App3Home3NoController");
					assert.deepEqual(simple1App3Home3NoControllerView.beforeActivateCallCount, 1,
						"simple1App3Home3NoControllerView.beforeActivateCallCount should be 1");
					assert.deepEqual(simple1App3Home3NoControllerView.afterActivateCallCount, 1,
						"simple1App3Home3NoControllerView.afterActivateCallCount should be 1");

					// Now simple1App3Home1View DeactivateCallCounts should be 1
					assert.deepEqual(simple1App3Home1View.beforeDeactivateCallCount, 1,
						"simple1App3Home1View.beforeDeactivateCallCount should be 1");
					assert.deepEqual(simple1App3Home1View.afterDeactivateCallCount, 1,
						"simple1App3Home1View.afterDeactivateCallCount should be 1");
					d.resolve();
				}
			});
			simple1Node3.show("simple1App3Home3NoController");
		},

		// Currently showing simple1App3Home3NoController test transition back to simple1App3Home1
		"testApp.displayView('simple1App3Home1')": function () {
			var d = this.async(10000);

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "simple1App3Home1") {
					onHandle.remove();
					var simple1App3Home1 = document.getElementById("simple1App3Home1");
					checkNodeVisibility(simple1Node3, simple1App3Home1);

					// Now simple1App3Home1View ActivateCallCounts should be 2
					assert.deepEqual(simple1App3Home1View.beforeActivateCallCount, 2,
						"simple1App3Home1View.beforeActivateCallCount should be 2");
					assert.deepEqual(simple1App3Home1View.afterActivateCallCount, 2,
						"simple1App3Home1View.afterActivateCallCount should be 2");

					// Now simple1App3Home3NoControllerView DeactivateCallCounts should be 1
					assert.deepEqual(simple1App3Home3NoControllerView.beforeDeactivateCallCount, 1,
						"simple1App3Home3NoControllerView.beforeDeactivateCallCount should be 1");
					assert.deepEqual(simple1App3Home3NoControllerView.afterDeactivateCallCount, 1,
						"simple1App3Home3NoControllerView.afterDeactivateCallCount should be 1");

					d.resolve();
				}
			});
		//	simple1Node3.show("simple1App3Home1");
			testApp.displayView('simple1App3Home1');

		},

		// Currently showing simple1App3Home1 test transition back to simple1App3Home3NoController
		".show('simple1App3Home3NoController')": function () {
			var d = this.async(10000);

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "simple1App3Home3NoController") {
					onHandle.remove();
					var simple1App3Home3NoController = document.getElementById("simple1App3Home3NoController");
					checkNodeVisibility(simple1Node3, simple1App3Home3NoController);

					// Now simple1App3Home1View ActivateCallCounts should be 2
					assert.deepEqual(simple1App3Home3NoControllerView.beforeActivateCallCount, 2,
						"simple1App3Home3NoControllerView.beforeActivateCallCount should be 2");
					assert.deepEqual(simple1App3Home3NoControllerView.afterActivateCallCount, 2,
						"simple1App3Home3NoControllerView.afterActivateCallCount should be 2");

					// Now simple1App3Home3NoControllerView DeactivateCallCounts should be 2
					assert.deepEqual(simple1App3Home1View.beforeDeactivateCallCount, 2,
						"simple1App3Home1View.beforeDeactivateCallCount should be 2");
					assert.deepEqual(simple1App3Home1View.afterDeactivateCallCount, 2,
						"simple1App3Home1View.afterDeactivateCallCount should be 2");

					d.resolve();
				}
			});

			simple1Node3.show('simple1App3Home3NoController');
		},

		// Currently showing simple1App3Home3NoController test transition back to simple1App3Home2
		"testApp.displayView('simple1App3Home2')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "simple1App3Home2") {
					onHandle.remove();
					var simple1App3Home2 = document.getElementById("simple1App3Home2");
					simple1App3Home2View = testApp.getViewFromViewId("simple1App3Home2");
					checkNodeVisibility(simple1Node3, simple1App3Home2);

					// Now simple1App3Home2View ActivateCallCounts should be 1
					assert.deepEqual(simple1App3Home2View.beforeActivateCallCount, 1,
						"simple1App3Home2View.beforeActivateCallCount should be 1");
					assert.deepEqual(simple1App3Home2View.afterActivateCallCount, 1,
						"simple1App3Home2View.afterActivateCallCount should be 1");

					// Now simple1App3Home3NoControllerView DeactivateCallCounts should be 2
					assert.deepEqual(simple1App3Home1View.beforeDeactivateCallCount, 2,
						"simple1App3Home1View.beforeDeactivateCallCount should be 2");
					assert.deepEqual(simple1App3Home1View.afterDeactivateCallCount, 2,
						"simple1App3Home1View.afterDeactivateCallCount should be 2");

					// And simple1App3Home1View DeactivateCallCounts should still be 2
					assert.deepEqual(simple1App3Home1View.beforeDeactivateCallCount, 2,
						"simple1App3Home1View.beforeDeactivateCallCount should be 2");

					d.resolve();
				}
			});
			testApp.displayView('simple1App3Home2');
		},
		teardown: function () {
			// call unloadApp to cleanup and end the test
			simple1Container3.parentNode.removeChild(simple1Container3);
			testApp.unloadApp();
		}
	};

	registerSuite(simple1Suite3);

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
