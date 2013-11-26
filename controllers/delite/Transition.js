define(["dcl/dcl", "dojo/Deferred", "dojo/when", "dojo/promise/all", "dojo/_base/lang", "../../Controller"],
	function (dcl, Deferred, when, all, lang, Controller) {

	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-display", lang.hitch(this, "_displayHandler"), true);
		},
		_displayHandler: function (event) {
			if (event.target === document) {
				var views = event.dest.split("+");
				for (var i = 0; i < views.length; i++) {
					// display the view
					this._displayView(views[i], event);
				}
			}
		},
		_displayView: function (viewTarget, event) {
			var deferred = new Deferred(), subEvent;
			// wait for parents to be displayed first
			when(this._displayParents(viewTarget, event), function (parent) {
				// event.stopPropagation();
				// parent is the view, the container is only child of the view
				// TODO make sure one can in the config of the view specificy a different container
				// "myview": { container: "a query string" }
				// and when specified use the query string here to get the container instead of the only child
				subEvent = Object.create(event);
				subEvent.transitionDeferred = deferred;
				if (parent !== null) {
					parent.children[0].emit("delite-display", subEvent);
				} else {
					// TODO: we are a top level view?
				}
			});
			return deferred.promise;
		},
		_displayParents: function (viewTarget, event) {
			// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
			// TODO: we might improve that later to avoid users have to specify this?
			var parts = viewTarget.split(",");
			if (parts.length > 1) {
				parts.pop();
				return this._displayView(parts.join(","), event);
			}
			return null;
		}
	});
});
