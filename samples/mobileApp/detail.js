define(["dojo/dom", "dojo/on"], function (dom, on) {
	return {
		init: function (previousView, data) {
			console.log("in detail.js init called");
			on(document.getElementById("detaillabel2"), "click",
				function () {
					console.log("in on click");
					deliteApp.displayView("content,home");
				}
			);
		},
		beforeActivate: function (previousView, data) {
			if (previousView && previousView.id) {
				//	dom.byId("label").innerHTML = this.nls[previousView.id] + (data ? ("-" + data) : "");
				dom.byId("label").innerHTML = " - from - " + previousView.id + (data ? ("-" + data) : "");
			}
		}
	};
});
