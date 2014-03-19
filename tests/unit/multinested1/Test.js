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
	"dojo/text!dapp/tests/unit/multinested1/app1.json",
	"deliteful/LinearLayout",
	"deliteful/ViewStack"
], function (registerSuite, assert, main, json, topic, on, domGeom, domClass, register, Deferred,
	multinested1config1) {
	// -------------------------------------------------------------------------------------- //
	// for multinested1Suite1 transition test
	var multinested1Container1, multinested1Node1;
	var multinested1HtmlContent1 =
		"<d-linear-layout id='multinested1App1linearlayout' style='height:500px'>" +
		"</d-linear-layout>";

//		"<d-view-stack id='multinested1App1dviewStack' style='width: 100%; height: 100%; position: absolute !important'>" +
//		"</d-view-stack>";

	var multinested1Suite1 = {
		name: "multinested1Suite1: test app transitions",
		setup: function () {
			appName = "multinested1App1"; // this is from the config
			multinested1Container1 = document.createElement("div");
			document.body.appendChild(multinested1Container1);
			multinested1Container1.innerHTML = multinested1HtmlContent1;
			register.parse(multinested1Container1);
			multinested1Node1 = document.getElementById("multinested1App1linearlayout");
			testApp = null;
			multinested1App1P1View = null;
			multinested1App1S1View = null;
			multinested1App1V1View = null;
			multinested1App1V7View = null;
			multinested1App1Content = null;
			multinested1App1P2V1View = null;

		},
		"test initial view": function () {
			var d = this.async(10000);
			var _self = this;

			var appStartedDef1 = main(json.parse(stripComments(multinested1config1)), multinested1Container1);
			appStartedDef1.then(function (app) {
				// we are ready to test
				testApp = app;
				console.log("appStartedDef1.then called ");

			//	var onHandle = on(testApp, "afterActivateCalled", function (complete) {
			//		console.log("afterActivateCalled for complete.view.id="+complete.view.id);
			//		if(complete.view.id === "P1_S1_V1") {
			//			onHandle.remove();
						var multinested1App1P1 = document.getElementById("content_P1");
						multinested1App1ContentView = testApp.getViewFromViewId("content");
						multinested1App1Content = multinested1App1ContentView.containerNode;

						// Here multinested1App1Home1View should be displayed

						multinested1App1P1View = testApp.getViewFromViewId("content_P1");
						// check the DOM state to see if we are in the expected state
						assert.isNotNull(multinested1Node1, "root multinested1Node1 must be here");
						assert.isNotNull(multinested1App1P1, "multinested1App1Home1 view must be here");
					//	assert.deepEqual(multinested1App1P1View.beforeActivateCallCount, 1,
					//		"multinested1App1P1View.beforeActivateCallCount should be 1");

					//	checkNodeVisibility(multinested1Node1, multinested1App1P1);
						setTimeout(function () { // try timeout to wait for afterAcivate...
							d.resolve();
						}, 300);
			//		}
			//	});
			});
			return d;
		},

		// Currently showing P1_S1_V1 test transition to V7
		".show(V7)": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_V7") {
					onHandle.remove();
					var multinested1App1V7 = document.getElementById("content_V7");
				//	checkNodeVisibility(multinested1App1Content, multinested1App1V7);

					multinested1App1V7View = testApp.getViewFromViewId("content_V7");
					multinested1App1S1View = testApp.getViewFromViewId("content_P1_S1");
					multinested1App1V1View = testApp.getViewFromViewId("content_P1_S1_V1");

					// Now multinested1App1V2View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1V7View, 1);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V1View, 1);
					checkDeactivateCallCount(multinested1App1S1View, 1);
					checkDeactivateCallCount(multinested1App1P1View, 1);

					d.resolve();
				}
			});
			multinested1App1Content.show("V7");
		//	multinested1App1Content.show("content_V7");
		//	testApp.displayView('content,V7');
		},

		// Currently showing V7 test transition to P1_S1_V1
		".show(P1)": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_P1") { // wait on P1 because afterActivate calls go from "P1_S1_V1", "P1_S1", "P1"
					onHandle.remove();
					var multinested1App1V1 = document.getElementById("content_P1_S1_V1");
					checkNestedNodeVisibility(multinested1App1Content, multinested1App1V1);

					// Now multinested1App1V1View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1S1View, 2);
					checkActivateCallCount(multinested1App1V1View, 2);
					checkActivateCallCount(multinested1App1P1View, 2);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V7View, 1);

					d.resolve();
				}
			});
			//multinested1Node1.show("P1");
			testApp.displayView('content,P1,S1,V1');
			//testApp.displayView('P1');
		},

		// Currently showing P1,S1,V1 test transition to P1_S1_V2
		"multinested1App1S1View.containerNode.show('V2')": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_P1") { // wait on P1 because afterActivate calls go from "P1_S1_V1", "P1_S1", "P1"
					onHandle.remove();
					var multinested1App1V2 = document.getElementById("content_P1_S1_V2");
					checkNestedNodeVisibility(multinested1App1Content, multinested1App1V2);

					multinested1App1V2View = testApp.getViewFromViewId("content_P1_S1_V2");

					// Now multinested1App1V1View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1V2View, 1);
					checkActivateCallCount(multinested1App1V1View, 2, true);
					checkActivateCallCount(multinested1App1S1View, 3);
					checkActivateCallCount(multinested1App1P1View, 3);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V7View, 1);
					checkDeactivateCallCount(multinested1App1V1View, 2);
					checkDeactivateCallCount(multinested1App1S1View, 2,true);
					checkDeactivateCallCount(multinested1App1P1View, 2,true);

					d.resolve();
				}
			});
			//multinested1Node1.show("P1.S1,V2");
			testApp.displayView('content,P1,S1,V2');
			//multinested1App1S1View.containerNode.show('V2');

		},

		// Currently showing P1_S1_V2 test transition to V7
		"testApp.displayView('V7') actually show 2": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_V7") {
					onHandle.remove();
					var multinested1App1V7 = document.getElementById("content_V7");
//					checkNodeVisibility(multinested1Node1, multinested1App1V7);

					// Now multinested1App1V2View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1V7View, 2);

					// Now multinested1App1V1View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1V2View, 1, true);
					checkActivateCallCount(multinested1App1V1View, 2, true);
					checkActivateCallCount(multinested1App1S1View, 3, true);
					checkActivateCallCount(multinested1App1P1View, 3, true);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V7View, 1, true);
					checkDeactivateCallCount(multinested1App1V1View, 2);
					checkDeactivateCallCount(multinested1App1V2View, 1);
					checkDeactivateCallCount(multinested1App1S1View, 3);
					checkDeactivateCallCount(multinested1App1P1View, 3);

					d.resolve();
				}
			});
			multinested1App1ContentView.containerNode.show("V7");
		//	multinested1App1Content.show("V7");
		//	testApp.displayView('content,V7');
		},

		// Currently showing V7 test transition to P1_S1_V1
		"testApp.displayView('content,P1')": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_P1") { // wait on P1 because afterActivate calls go from "P1_S1_V1", "P1_S1", "P1"
					onHandle.remove();
					var multinested1App1V1 = document.getElementById("content_P1_S1_V1");
					checkNestedNodeVisibility(multinested1App1Content, multinested1App1V1);

					// Now multinested1App1V2View ActivateCallCounts as follows
					checkActivateCallCount(multinested1App1V7View, 2, true);
					checkActivateCallCount(multinested1App1V2View, 1, true);
					checkActivateCallCount(multinested1App1V1View, 3);
					checkActivateCallCount(multinested1App1S1View, 4);
					checkActivateCallCount(multinested1App1P1View, 4);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V7View, 2);
					checkDeactivateCallCount(multinested1App1V1View, 2, true);
					checkDeactivateCallCount(multinested1App1V2View, 1, true);
					checkDeactivateCallCount(multinested1App1S1View, 3, true);
					checkDeactivateCallCount(multinested1App1P1View, 3, true);


					d.resolve();
				}
			});
			//multinested1Node1.show("P1,S1,V1");
			//testApp.displayView('P1,S1,V1');
		//	multinested1App1Content.show('P1');
			testApp.displayView('content,P1');
		},

		// Currently showing P1,S1,V1 test transition to P1_S1_V2
		"multinested1App1Content.show('P2')": function () {
			var d = this.async(10000);
			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "content_P2_P2S1_P2V1") { // wait on P1 because afterActivate calls go from "P2_S2_V1", "P2_S1", "P2"
					onHandle.remove();
					var multinested1App1P2V1 = document.getElementById("content_P2_P2S1_P2V1");
					checkNestedNodeVisibility(multinested1App1Content, multinested1App1P2V1);

					multinested1App1P2V1View = testApp.getViewFromViewId("content_P2_P2S1_P2V1");

					// Now multinested1App1V1View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1P2V1View, 1);
					checkActivateCallCount(multinested1App1V7View, 2, true);
					checkActivateCallCount(multinested1App1V2View, 1, true);
					checkActivateCallCount(multinested1App1V1View, 3, true);
					checkActivateCallCount(multinested1App1S1View, 4, true);
					checkActivateCallCount(multinested1App1P1View, 4, true);

					// Now multinested1App1V1View DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1V7View, 2, true);
					checkDeactivateCallCount(multinested1App1V1View, 3);
					checkDeactivateCallCount(multinested1App1V2View, 1, true);
					checkDeactivateCallCount(multinested1App1S1View, 4, true);
					checkDeactivateCallCount(multinested1App1P1View, 4, true);

					d.resolve();
				}
			});
			//testApp.displayView('content,P2,P2S1,P2V1');
			multinested1App1Content.show('P2');
			//multinested1App1Content.show('P2');

		},

/*
		// Currently showing multinested1App1Home1NoController test transition back to multinested1App1Home1
		"testApp.displayView('multinested1App1Home1')": function () {
			var d = this.async(10000);

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "multinested1App1Home1") {
					onHandle.remove();
					var multinested1App1Home1 = document.getElementById("multinested1App1Home1");
					checkNodeVisibility(multinested1Node1, multinested1App1Home1);

					// Now multinested1App1Home1View ActivateCallCounts should be 2
					checkActivateCallCount(multinested1App1Home1View, 2);

					// Now multinested1App1Home1NoControllerView DeactivateCallCounts should be 1
					checkDeactivateCallCount(multinested1App1Home1NoControllerView, 1);

					d.resolve();
				}
			});
		//	multinested1Node1.show("multinested1App1Home1");
			testApp.displayView('multinested1App1Home1');

		},

		// Currently showing multinested1App1Home1 test transition back to multinested1App1Home1NoController
		".show('multinested1App1Home1NoController')": function () {
			var d = this.async(10000);

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "multinested1App1Home1NoController") {
					onHandle.remove();
					var multinested1App1Home1NoController = document.getElementById("multinested1App1Home1NoController");
					checkNodeVisibility(multinested1Node1, multinested1App1Home1NoController);

					// Now multinested1App1Home1NoControllerView ActivateCallCounts should be 2
					checkActivateCallCount(multinested1App1Home1NoControllerView, 2);

					// Now multinested1App1Home1View DeactivateCallCounts should be 2
					checkDeactivateCallCount(multinested1App1Home1View, 2);

					d.resolve();
				}
			});

			multinested1Node1.show('multinested1App1Home1NoController');
		},

		// Currently showing multinested1App1Home1NoController test transition back to multinested1App1Home2
		"testApp.displayView('multinested1App1Home2')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();

			var onHandle = on(testApp, "afterActivateCalled", function (complete) {
				if(complete.view.id === "multinested1App1Home2") {
					onHandle.remove();
					var multinested1App1Home2 = document.getElementById("multinested1App1Home2");
					multinested1App1Home2View = testApp.getViewFromViewId("multinested1App1Home2");
					checkNodeVisibility(multinested1Node1, multinested1App1Home2);

					// Now multinested1App1Home2View ActivateCallCounts should be 1
					checkActivateCallCount(multinested1App1Home2View, 1);

					// Now multinested1App1Home1NoControllerView DeactivateCallCounts should be 2
					checkDeactivateCallCount(multinested1App1Home1NoControllerView, 2);
					// Now multinested1App1Home1View DeactivateCallCounts should be 2
					checkDeactivateCallCount(multinested1App1Home1View, 2);

					d.resolve();
				}
			});
			testApp.displayView('multinested1App1Home2');
		},
*/
		teardown: function () {
			// call unloadApp to cleanup and end the test
			multinested1Container1.parentNode.removeChild(multinested1Container1);
			testApp.unloadApp();
		}
	};

	registerSuite(multinested1Suite1);

	function checkNodeVisibility(vs, target) {
		for (var i = 0; i < vs.children.length; i++) {
			assert.isTrue(
				((vs.children[i] === target && vs.children[i].style.display !== "none") ||
					(vs.children[i] !== target && vs.children[i].style.display === "none")),
				"checkNodeVisibility FAILED for target.id=" + (target ? target.id : "")
			);
		}
	}

	function checkNestedNodeVisibility(vs, target) {
		for (var i = 0; i < vs.children.length; i++) {
			assert.isTrue(
				(target.style.display !== "none"),
				"checkNestedNodeVisibility FAILED for target.id=" + (target ? target.id : "")
			);
		}
	}

	function checkActivateCallCount(view, count, skipActiveCheck) {
		if(view) {
			assert.deepEqual(view.beforeActivateCallCount, count,
				view.id+ " beforeActivateCallCount should be "+ count);
			assert.deepEqual(view.afterActivateCallCount, count,
				view.id+ " afterActivateCallCount should be "+count);

			//also test for selectedChildren being set correctly with constraint main
		//	var selectedChildId = testApp.selectedChildren.main.id;
		//	assert.deepEqual(view.id, selectedChildId, view.id+ " should be in testApp.selectedChildren.main. ");

			//also test for view._active being set correctly to true
			if(!skipActiveCheck){
				assert.isTrue(view._active, "view_active should be true for "+view.id);
			}
		}
	}
	function checkDeactivateCallCount(view, count, skipActiveCheck) {
		if(view) {
			assert.deepEqual(view.beforeDeactivateCallCount, count,
				view.id+ " beforeDeactivateCallCount should be "+ count);
			assert.deepEqual(view.afterDeactivateCallCount, count,
				view.id+ " afterDeactivateCallCount should be "+count);

			//also test for view._active being set correctly to false
			if(!skipActiveCheck){
				assert.isFalse(view._active, "view_active should be false for "+view.id);
			}
		}
	}

	// strip out single line comments from the json config
	function stripComments(jsonData) {
		jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
		jsonData = jsonData.replace(/\/\/.*/g, "");
		return jsonData;
	}

});
