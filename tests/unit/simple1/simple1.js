define(["dojo/dom", "dojo/on", "delite/register"], function (dom, on, register) {
	return {
		attributes: {
			name: ""
		},
		constructor: function (params) { // jshint unused:false
			//TODO: why is this not being hit?
			this.app.log("app-view:", " in [" + this.viewName + "] constructor called for [" + this.id + "]");
			var tempName = "";
			if (this.id === "simp1Home2") {
				setTimeout(function () {
					for (var i = 0; i < 500; i++) {
						tempName = this.id + i;
					}
				}, 500);
			}
		},
		init: function () {
			this.domNode.name = this.id;
			if (this.id === "simp1Home2") {
				setTimeout(function () {
					for (var i = 0; i < 500; i++) {
						tempName = this.id + i;
					}
				}, 500);
				//	simple1App.displayView('simp1Home3', {});
			}
		},
		//		beforeActivate: function (previousView, viewData) {
		//		},
		//		beforeDeactivate: function (nextView, viewData) {
		//		},
		//		afterActivate: function (previousView, viewData) {
		//		},
		//		afterDeactivate: function (nextView, viewData) {
		destroy: function () {
			this.app.log("app-view:", " in [" + this.viewName + "] destroy called for [" + this.id + "]");
		}
	};
});
