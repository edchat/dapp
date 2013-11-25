define(["dcl/dcl", "dojo/_base/lang", "../../Controller"], function (dcl, lang, Controller) {

	return dcl(Controller, {
		constructor: function () {
			document.addEventListener("delite-load", lang.hitch(this, "_loadHandler"), true);
		},
		_loadHandler: function (event) {
			// load the actual view
			// where do I put it?? the target is the container?
			// two use-cases: if the container is a transition container, he is the one that fired the load event,
			// he will manage the addition for us?
			// if the container is a regular container?
			event.loadDeferred.resolve();
		}
	});
});



