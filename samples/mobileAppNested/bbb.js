define(["dojo/dom", "dojo/on", "delite/register"], function (dom, on, register) {
	return {
		attributes: {
			testStringReplace: "xAZZZZed",
			"beforeActivateStatus": "none",
			"beforeDeactivateStatus": "none",
			"afterActivateStatus": "none",
			"afterDeactivateStatus": "none",
			"currentStatus": "test"
		},
		currentStatus: "testxxx",
		beforeActivateCallCount: 0,
		beforeDeactivateCallCount: 0,
		afterActivateCallCount: 0,
		afterDeactivateCallCount: 0,
		constructor: function (params) { // jshint unused:false
			console.log("dapp/View:constructor called for " + this.id);
		},
		MODULE: "bbb",
		init: function (previousView, data) {
			console.log(this.MODULE + " init called");
		},
		beforeActivate: function (previousView, data) {
			console.log(this.MODULE + " beforeActivate called");
		},
		beforeDeactivate: function (previousView, data) {
			console.log(this.MODULE + " beforeDeactivate called previousView=", previousView);
		},
		afterActivate: function (previousView) {
			console.log(this.MODULE + " afterActivate called");
		},
		afterDeactivate: function (previousView) {
			console.log(this.MODULE + " afterDeactivate called previousView=", previousView);
		}
	};
});
