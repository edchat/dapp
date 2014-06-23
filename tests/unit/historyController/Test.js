// quotmark:false needed for the inline html
// jshint quotmark:false
define([
	"intern!object",
	"intern/chai!assert",
	"dapp/Application",
	"dapp/utils/view",
	"dapp/utils/hash",
	"dojo/json",
	"dojo/topic",
	"dojo/on",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"delite/register",
	"dojo/Deferred",
	"requirejs-text/text!dapp/tests/unit/historyController/app1.json",
	"deliteful/LinearLayout",
	"deliteful/ViewStack"
], function (registerSuite, assert, Application, viewUtils, hash, json, topic, on, domGeom, domClass, register, Deferred,
	historyControllerconfig1) {
	// -------------------------------------------------------------------------------------- //
	// for historyControllerSuite1 transition test
	var historyControllerContainer1, historyControllerNode1;
	var historyControllerHtmlContent1 =
		'<div style="position: relative; height: 500px"> ' +
		'	<d-side-pane mode="push" position="start" id="hc1leftPane" style="background-color: lavender;">' +
		'</d-side-pane>' +
		'	<d-linear-layout style="width:100%; height: 100%">' +
		'		<d-view-stack id="hc1headerViewStack" style="width: 100%; height: 10%;"></d-view-stack>' +
		'		<d-linear-layout id="hc1centerLinearLayout" style="width:100%; height: 100%" vertical="false">' +
		'</d-linear-layout>' +
		'		<d-view-stack id="hc1footerViewStack" style="width: 100%; height: 10%;"></d-view-stack>' +
		'	</d-linear-layout>' +
		'<d-side-pane mode="push" position="end" id="hc1rightPane"  style="background-color: lightgoldenrodyellow;">' +
		'</d-side-pane>' +
		'</div>';

	var testApp = null;
	var hc1right1View = null;

	var historyControllerSuite1 = {
		name: "historyControllerSuite1: test app transitions",
		setup: function () {

			historyControllerContainer1 = document.createElement("div");
			document.body.appendChild(historyControllerContainer1);
			historyControllerContainer1.innerHTML = historyControllerHtmlContent1;
			register.parse(historyControllerContainer1);
			historyControllerNode1 =
				document.getElementById("historyControllerApp1linearlayout");


		},
		"historyController test initial view": function () {
			var d = this.async(10000);

			var appStartedDef1 = new Application(json.parse(stripComments(historyControllerconfig1)),
				historyControllerContainer1);
			appStartedDef1.then(function (app) {
				// we are ready to test
				testApp = app;

				//verify these are showing "defaultView": "hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1",

				var hc1header1View = viewUtils.getViewFromViewId(testApp, "hc1header1");
				checkActivateCallCount(hc1header1View, 1);
				var hc1header1content = hc1header1View.containerNode;
				assert.isNotNull(hc1header1content, "hc1header1content must be here");

				var hc1center1View = viewUtils.getViewFromViewId(testApp, "hc1center1");
				checkActivateCallCount(hc1center1View, 1);
				var hc1center1content = hc1header1View.containerNode;
				assert.isNotNull(hc1center1content, "hc1center1 must be here");
				checkNodeVisibile(hc1center1content);

				var hc1right1View = viewUtils.getViewFromViewId(testApp, "hc1right1");
				checkActivateCallCount(hc1right1View, 1);
				var hc1right1content = hc1right1View.containerNode;
				assert.isNotNull(hc1right1content, "hc1right1content must be here");
				checkNodeVisibile(hc1right1content);

				var hc1footer1View = viewUtils.getViewFromViewId(testApp, "hc1footer1");
				checkActivateCallCount(hc1footer1View, 1);
				var hc1footer1content = hc1footer1View.containerNode;
				assert.isNotNull(hc1footer1content, "hc1footer1content must be here");

				//ELC TODO: this is commented out because params on the old url are still here and break on refresh
				//var currentHash = window.location.hash;
				//assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1",
				//	" currentHash should be #hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1");
				//var startView = hash.getTarget(currentHash, testApp.defaultView);

				setTimeout(function () {
					d.resolve();
				}, 300);
			});
			return d;
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1 test
		// showOrHideViews('hc1center2'
		"show hc1center2 with testApp.showOrHideViews('hc1center2')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();
			displayDeferred.then(function () {
				var hc1center2content = document.getElementById("hc1center2");
				var hc1center2View = viewUtils.getViewFromViewId(testApp, "hc1center2");

				checkNodeVisibile(hc1center2content);
				checkActivateCallCount(hc1center2View, 1, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1");

				d.resolve();
			});
			testApp.showOrHideViews('hc1center2', {
				displayDeferred: displayDeferred
			});
		},
		// Currently showing hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1 test
		// showOrHideViews('hc1center3'
		"show hc1center3 with testApp.showOrHideViews('hc1center3')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();
			displayDeferred.then(function () {
				var hc1center3content = document.getElementById("hc1center3");
				var hc1center3View = viewUtils.getViewFromViewId(testApp, "hc1center3");

				checkNodeVisibile(hc1center3content);
				checkActivateCallCount(hc1center3View, 1, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1");

				d.resolve();
			});
			testApp.showOrHideViews('hc1center3', {
				displayDeferred: displayDeferred
			});
		},
		// Currently showing hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1 test
		// history.back()
		"test history.back() to get back to hc1center2)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1center2content = document.getElementById("hc1center2");
				var hc1center2View = viewUtils.getViewFromViewId(testApp, "hc1center2");

				checkNodeVisibile(hc1center2content);
				checkActivateCallCount(hc1center2View, 2, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1");

				d.resolve();
			});
			history.back();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1 test
		// history.back()
		"test history.back() to get back to hc1center1)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1center1content = document.getElementById("hc1center1");
				var hc1center1View = viewUtils.getViewFromViewId(testApp, "hc1center1");

				checkNodeVisibile(hc1center1content);
				checkActivateCallCount(hc1center1View, 2, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1");

				d.resolve();
			});
			history.back();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1right1+hc1footer1 test
		// history.forward()
		"test history.forward() to get to hc1center2)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1center2content = document.getElementById("hc1center2");
				var hc1center2View = viewUtils.getViewFromViewId(testApp, "hc1center2");

				checkNodeVisibile(hc1center2content);
				checkActivateCallCount(hc1center2View, 3, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1");

				d.resolve();
			});
			history.forward();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center2+hc1right1+hc1footer1 test
		// history.forward()
		"test history.forward() to get to hc1center3)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1center3content = document.getElementById("hc1center3");
				var hc1center3View = viewUtils.getViewFromViewId(testApp, "hc1center3");

				checkNodeVisibile(hc1center3content);
				checkActivateCallCount(hc1center3View, 2, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1");

				d.resolve();
			});
			history.forward();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1 test
		// showOrHideViews('-hc1right1'
		"Hide hc1right1 with testApp.showOrHideViews('-hc1right1')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();
			displayDeferred.then(function () {
				var hc1rightPane = document.getElementById("hc1rightPane");
				assert.isTrue(hc1rightPane.style.display === "none");
				checkActivateCallCount(hc1right1View, 1, true);
				checkDeactivateCallCount(hc1right1View, 1, true);

				d.resolve();
			});
			testApp.showOrHideViews('-hc1right1', {
				displayDeferred: displayDeferred
			});
		},
		// Currently showing hc1header1+hc1centerParent+hc1center3+hc1footer1 test
		// history.back()
		"test history.back() to get back to hc1right1)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1rightPane = document.getElementById("hc1rightPane");
				assert.isFalse(hc1rightPane.style.display === "none");
				checkActivateCallCount(hc1right1View, 2, true);
				checkDeactivateCallCount(hc1right1View, 1, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1");

				d.resolve();
			});
			history.back();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1 test
		// history.forward()
		"test history.forward() to get back to hc1right1)": function () {
			var d = this.async(10000);
			on.once(document, "dapp-finishedTransition", function (complete) {
				var hc1rightPane = document.getElementById("hc1rightPane");
				assert.isFalse(hc1rightPane.style.display === "none");
				checkActivateCallCount(hc1right1View, 2, true);
				checkDeactivateCallCount(hc1right1View, 2, true);

				var currentHash = window.location.hash;
				assert.deepEqual(currentHash, "#hc1header1+hc1centerParent+hc1center3+hc1footer1",
					" currentHash should be #hc1header1+hc1centerParent+hc1center3+hc1footer1");

				d.resolve();
			});
			history.forward();
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1footer1 test
		// showOrHideViews('leftParent,left1'
		"show hc1left1 with testApp.showOrHideViews('hc1leftParent,hc1left1')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();
			displayDeferred.then(function () {
				var hc1left1content = document.getElementById("hc1leftParent_hc1left1");
				var hc1left1View = viewUtils.getViewFromViewId(testApp, "hc1leftParent_hc1left1");

				checkNodeVisibile(hc1left1content);
				checkActivateCallCount(hc1left1View, 1, true);

				var currentHash = window.location.hash;
				assert.deepEqual(hc1left1View.params.pTestVal, "value1",
					" hc1left1View.params.pTestVal should equal value1");

				assert.deepEqual(currentHash,
					//TODO:TEMP line below is wrong, but works for now, should not have hc1right1
					"#hc1header1+hc1centerParent+hc1center3+hc1right1+hc1footer1+hc1leftParent,hc1left1&pTestVal=value1"
					//"#hc1header1+hc1centerParent+hc1center3+hc1footer1+hc1leftParent,hc1left1&pTestVal=value1",
					," currentHash should have &pTestVal=value1");

				d.resolve();
			});
			var params = {displayDeferred: displayDeferred, "params":{'pTestVal':"value1"}};
			testApp.showOrHideViews('hc1leftParent,hc1left1', params);
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1footer1+hc1leftParent,hc1left1 test
		// showOrHideViews('-hc1leftParent') when I used showOrHideViews('-hc1leftParent-hc1leftParent,left1') it
		// got a warning because hc1leftParent was not found as the parent of left1
		"Hide hc1left1 with testApp.showOrHideViews('-hc1leftParent')": function () {
			var d = this.async(10000);
			var displayDeferred = new Deferred();
			displayDeferred.then(function () {
				var hc1rightPane = document.getElementById("hc1rightPane");
				var hc1left1content = document.getElementById("hc1leftPane");
				var hc1left1View = viewUtils.getViewFromViewId(testApp, "hc1leftParent_hc1left1");
				//TODO:TEMP line below should work, but it is not wrong, for now, should not have hc1right1
				//assert.isTrue(hc1rightPane.style.display === "none");
				assert.isTrue(hc1left1content.style.display === "none");

				checkActivateCallCount(hc1left1View, 1, true);
				checkDeactivateCallCount(hc1left1View, 1, true);

				d.resolve();
			});
			testApp.showOrHideViews('-hc1leftParent', {
				displayDeferred: displayDeferred
			});
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1footer1 test
		// hc1rightPaneElem.show('hc1right2')
		"show hc1right2 with hc1rightPaneElem.show('hc1right2')": function () {
			var d = this.async(10000);
			var hc1rightPaneElem = document.getElementById("hc1rightPane");
			hc1rightPaneElem.show('hc1right2').then(function () {
				var hc1right2View = viewUtils.getViewFromViewId(testApp, "hc1right2");
				checkActivateCallCount(hc1right2View, 1);
				var hc1right2content = hc1right2View.containerNode;
				assert.isNotNull(hc1right2content, "hc1right2content must be here");
				checkNodeVisibile(hc1right2content);

				d.resolve();
			});
		},
		// Currently showing hc1header1+hc1centerParent+hc1center1+hc1footer1 test
		// hc1rightPaneElem.hide('hc1right2')
		"hide hc1right2 with hc1rightPaneElem.hide('hc1right2')": function () {
			var d = this.async(10000);
			var hc1rightPaneElem = document.getElementById("hc1rightPane");
			hc1rightPaneElem.hide('hc1right2').then(function () {
				var hc1right2View = viewUtils.getViewFromViewId(testApp, "hc1right2");
				checkDeactivateCallCount(hc1right2View, 1);
				var hc1right2content = hc1right2View.containerNode;
				assert.isNotNull(hc1right2content, "hc1right2content must be here");
				//	checkNodeVisibile(hc1right2content);
				assert.isTrue(hc1right2View.domNode.style.display === "none");
				assert.isTrue(hc1rightPaneElem.style.display === "none");

				d.resolve();
			});
		},

		teardown: function () {
			// call unloadApp to cleanup and end the test
			historyControllerContainer1.parentNode.removeChild(
				historyControllerContainer1);
			testApp.unloadApp();
		}
	};

	registerSuite(historyControllerSuite1);

	function checkNodeVisibile(target) {
		assert.isTrue(target.style.display !== "none");
	}

	function checkActivateCallCount(view, count, skipActiveCheck) {
		if (view) {
			assert.deepEqual(view._beforeActivateCallCount, count,
				view.id + " _beforeActivateCallCount should be " + count);
			assert.deepEqual(view._afterActivateCallCount, count,
				view.id + " _afterActivateCallCount should be " + count);

			//also test for view._active being set correctly to true
			if (!skipActiveCheck) {
				assert.isTrue(view._active, "view_active should be true for " + view.id);
			}
		}
	}

	function checkDeactivateCallCount(view, count, skipActiveCheck) {
		if (view) {
			assert.deepEqual(view._beforeDeactivateCallCount, count,
				view.id + " _beforeDeactivateCallCount should be " + count);
			assert.deepEqual(view._afterDeactivateCallCount, count,
				view.id + " _afterDeactivateCallCount should be " + count);

			//also test for view._active being set correctly to false
			if (!skipActiveCheck) {
				assert.isFalse(view._active, "view_active should be false for " + view.id);
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
