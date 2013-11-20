define(["dcl/dcl", "../../Controller"], function (dcl, Controller) {
	var displayHandler = function (event) {
		var views = event.dest.split(",");
		for (var i = 0; i < views.length; i++) {
			var parentView = getParentView(view[i]);

		}
		if (destContainer !== event.target) {
			event.stopPropagation();
			destContainer.emit("delite-display", event);
		}
	};
	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-display", displayHandler, true);
		}
	});
});



