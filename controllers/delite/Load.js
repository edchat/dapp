define(["require", "dcl/dcl", "dojo/_base/lang", "dojo/Deferred", "../../Controller"],
	function (require, dcl, lang, Deferred, Controller) {

	var resolveView = function (event, newView) {
		event.nextView = newView;
		event.previousView = event.parent._activeView;
		event.loadDeferred.resolve(newView.domNode);
	};

	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-load", lang.hitch(this, "_loadHandler"), true);
		},
		_loadHandler: function (event) {
			// load the actual view
			// TODO: don't I have two cases here, when the parent is a delite display container and when not?
			// probably to be solved by having all dui containers support the eventing mechanism
			var viewId = event.dest || "";
			// TODO: deal with defaultParams?
			var params = event.params || "";
			var view = event.parent.children[viewId];
			// once loaded we will be ready to call beforeActivate
			event.loadDeferred.then(function () {
				if (event.previousView) {
					event.previousView.beforeDeactivate(event.nextView);
				}
				if (event.nextView) {
					event.nextView.beforeActivate(event.previousView);
				}
			});
			// once transition we will be ready to call afterActivate
			event.transitionDeferred.then(function () {
				event.parent._activeView = event.nextView;
				if (event.nextView) {
					event.nextView.afterActivate(event.previousView);
				}
				if (event.previousView) {
					event.previousView.afterDeactivate(event.nextView);
				}
			});
			if (view) {
				// set params to new value before returning
				if (params) {
					view.params = params;
				}
				resolveView(event, null);
			} else {
				this._createView(event, viewId, params, event.parent, event.parent.views[viewId].type);
			}
		},

		_createView: function (event, name, params, parent, type) {
			var app = this.app;
			// TODO: in my prototype View names & ids are the same, so view names must be unique
			require([type ? type : "../../View"], function (View) {
				var params = {
					"app": app,
					"id": name,
					"parent": parent
				};
				dcl.mix(params, { "params": params });
				new View(params).start().then(function (newView) {
					resolveView(event, newView);
				});
			});
		}
	});
});
