define(["require", "dcl/dcl", "dojo/_base/lang", "dojo/Deferred", "../../Controller"],
	function (require, dcl, lang, Deferred, Controller) {
	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-load", lang.hitch(this, "_loadHandler"), true);
		},
		_loadHandler: function (event) {
			// load the actual view
			// TODO: don't I have two cases here, when the parent is a delite display container and when not?
			var viewId = event.dest || "";
			var parts = viewId.split(",");
			var childId = parts.shift();
			var params = event.params || "";
			this._createView(event.loadDeferred, name, params, parent.views[childId].type);
		},

		_createView: function (deferred, name, params, type) {
			var app = this.app;
			require([type ? type : "../View"], function (View) {
				var newView = new View(dcl.mixin({
					"app": app,
					"id": name
					// "parent": parent
				}, { "params": params }));
				deferred.resolve(newView);
			});
		}
	});
});
