define(["dcl/dcl", "dojo/on", "dojo/when", "dojo/Deferred", "dojo/promise/all", "dojo/_base/lang", "../../Controller"],
	function (dcl, on, when, Deferred, all, lang, Controller) {

	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-display", lang.hitch(this, "_displayHandler"), true);
		},
		_displayHandler: function (event) {
			if (event.target === document) {
				var views = event.dest && event.dest.split("+");
				if (views) {
					for (var i = 0; i < views.length; i++) {
						// display the view
						this._displayView(views[i], event, true);
					}
				} else {
					// this is the root
					this._displayView(null, event, true);
				}
			}
		},
		_displayView: function (viewTarget, event, displayDefaultView, skipParents) {
			var deferred = new Deferred(), self = this, subEvent;
			// wait for parents to be displayed first
			when(skipParents || this._displayParents(viewTarget, event), function (parent) {
				subEvent = Object.create(event);
				subEvent.dest = viewTarget;
				subEvent.transitionDeferred = deferred;
				// parent is the view, the container is only child of the view
				// TODO make sure one can in the config of the view specify a different container
				// "myview": { container: "a query string" }
				// and when specified use the query string here to get the container instead of the only child
				subEvent.parent = parent;
				parent.containerNode.emit("delite-display", subEvent);
				// if we are at the init view, check if we have defaultView children to display in addition
				if (displayDefaultView) {
					on(parent.containerNode, "delite-display-load", function (loadEvent) {
						loadEvent.loadDeferred.then(function () {
							if (loadEvent.nextView.defaultView) {
								self._displayView(loadEvent.nextView.defaultView, loadEvent, true, loadEvent.nextView);
							}
						});
					});
				}
			});
			return deferred.promise;
		},
		_displayParents: function (viewTarget, event) {
			// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
			// TODO: we might improve that later to avoid users have to specify this?
			var parts = viewTarget && viewTarget.split(",");
			if (parts && parts.length > 1) {
				parts.pop();
				return this._displayView(parts.join(","), event);
			}
			return this.app;
		}
	});
});
