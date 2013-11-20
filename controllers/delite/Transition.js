define(["dcl/dcl", "dojo/_base/lang", "../../Controller"], function (dcl, lang, Controller) {

	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-display", lang.hitch(this, "_displayHandler"), true);
		},
		_displayHandler: function (event) {
			var views = event.dest.split("+");
			for (var i = 0; i < views.length; i++) {
				var parentView = this.getParentViewFromTarget(views[i]);

			}
			if (destContainer !== event.target) {
				event.stopPropagation();
				destContainer.emit("delite-display", event);
			}
		},
		getParentFromViewTarget: function (viewTarget) {
			var p = this.app.views;
			var parts = viewTarget.split(",");
			if (parts.length > 1) {
				for (var i = 0; i < parts.length - 1; i++) {
					var toId = parts[i];
					var v = p[toId];
					if (v) {
						p = v;
					} else {
						console.log("Parent view has not been created yet for " + viewTarget);
						return null;
					}
				}
			}
			console.log("in getParentFromViewTarget for viewTarget [" + viewTarget + "] parent [" + p.id + "]");
			return p;
		}
	});
});



