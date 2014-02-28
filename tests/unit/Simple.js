define([
	"intern!object",
	"intern/chai!assert",
	"dapp/main",
	"dojo/json",
	"dojo/topic",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"delite/register",
	"dojo/text!dapp/tests/unit/simple.json",
	"deliteful/LinearLayout"
], function (registerSuite, assert, main, json, topic, domGeom, domClass, register, config) {
	var container, node;
	var htmlContent =
		"<d-linear-layout id='dlayout' style='height:500px'><div id='divA' class='fill'>A</div>" +
			"<div id='divB' style='height:30px'>B</div></d-linear-layout>";

	registerSuite({
		name: "init",
		setup: function () {
		//	container = document.createElement("div");
		//	document.body.appendChild(container);
			container = document.createElement("div");
			document.body.appendChild(container);
			container.innerHTML = htmlContent;
			register.parse(container);
			node = document.getElementById("dlayout");
		},
		"Vertical LinearLayout Children Equal Size" : function () {
			var children = node.getChildren();
			node.style.height = "500px";
			children[1].style.height = "";
			domClass.add(children[1], "fill");
			var box1 = domGeom.getMarginBox(children[0]);
			var box2 = domGeom.getMarginBox(children[1]);
			assert.deepEqual(box1.h, 250);
			assert.deepEqual(box1.h, box2.h);
		},
		"use deferred basic tests getChildren": function () {
			var d = this.async(200000);

			// strip out comments from config
			var jsonData = config;
			jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
			jsonData = jsonData.replace(/\/\/.*/g, "");

			var appStartedDef = main(json.parse(jsonData), container);
			// TODO App construction method should probably return a promise which would make all of this a bit simpler
			appStartedDef.then(function () {
					// we are ready to test
					// check the DOM state to see if we are in the expected state
					console.log('document.getElementById("dlayout")='+document.getElementById("dlayout"));
					console.log('document.getElementById("divA")='+document.getElementById("divA"));
					console.log('document.getElementById("divB")='+document.getElementById("divB"));
					console.log('document.getElementById("home")='+document.getElementById("home"));
					assert.isNotNull(document.getElementById("dlayout"), "root must be here");
					assert.isNotNull(document.getElementById("divA"), "home view must be here");
					assert.isNotNull(document.getElementById("divB"), "home view must be here");
					assert.isNotNull(document.getElementById("home"), "home view must be here");
					assert.equal(document.getElementById("home").parentNode,
						document.getElementById("dlayout"));
					// we could also check the view controller state etc... send further events to navigate ...
					// test is finished resolved the deferred
					d.resolve();
			});
			return d;
		},

	//	"basic tests getChildren": function () {
	//		var d = this.async(200000);
//
//			// strip out comments from config
//			var jsonData = config;
//			jsonData = jsonData.replace(/\/\*.*?\*\//g, "");
	//		jsonData = jsonData.replace(/\/\/.*/g, "");
/*
			main(json.parse(jsonData), container);
			// TODO App construction method should probably return a promise which would make all of this a bit simpler
			topic.subscribe("/app/status", function (status) {
				if (status === 2) {
					// we are ready to test
					// check the DOM state to see if we are in the expected state
					console.log('document.getElementById("dlayout")='+document.getElementById("dlayout"));
					console.log('document.getElementById("divA")='+document.getElementById("divA"));
					console.log('document.getElementById("divB")='+document.getElementById("divB"));
					console.log('document.getElementById("home")='+document.getElementById("home"));
					assert.isNotNull(document.getElementById("dlayout"), "root must be here");
					assert.isNotNull(document.getElementById("divA"), "home view must be here");
					assert.isNotNull(document.getElementById("divB"), "home view must be here");
					assert.isNotNull(document.getElementById("home"), "home view must be here");
					assert.equal(document.getElementById("home").parentNode,
						document.getElementById("dlayout"));
					// we could also check the view controller state etc... send further events to navigate ...
					// test is finished resolved the deferred
					d.resolve();
				}
			});
			return d;
		},
	*/
		teardown: function () {
			container.parentNode.removeChild(container);
		}
	});
});
