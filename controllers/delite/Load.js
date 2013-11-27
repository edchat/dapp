define(["require", "dcl/dcl", "dojo/_base/lang", "dojo/Deferred", "../../Controller"],
	function (require, dcl, lang, Deferred, Controller) {
	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-load", lang.hitch(this, "_loadHandler"), true);
		},
		_loadHandler: function (event) {
			// load the actual view
			// TODO: don't I have two cases here, when the parent is a delite display container and when not?
			// probably to be solved by having all dui containers support the eventing mechanism
			var viewId = event.dest || "";
			var params = event.params || "";
			// TOD
			this._createView(event.loadDeferred, viewId, params, event.parent, event.parent.views[viewId].type);
		},

		_createView: function (deferred, name, params, parent, type) {
			var app = this.app;
			require([type ? type : "../../View"], function (View) {
				var params = {
					"app": app,
					"id": name,
					"parent": parent
				};
				dcl.mix(params, { "params": params });
				new View(params).start().then(function (newView) {
					deferred.resolve(newView.domNode);
				});
			});
		}
	});
});
