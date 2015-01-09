define(["require", "lie/dist/lie"], function (require, Promise) {
	/* jshint unused: vars */
	return function ( /*Object*/ config, /*Object*/ parent) {
		// summary:
		//		nsl is called to create to load the nls all for the app, or for a view.
		// config: Object
		//		The section of the config for this view or for the app.
		// parent: Object
		//		The parent of this view or the app itself, so that nls from the parent will be
		//		available to the view.
		var path = config.nls;
		if (path) {
			var nlsPromise = Promise(function (resolve) {
				require(["requirejs-dplugins/i18n!" + path], function (nls) {
					resolve(nls);
				});
			}.bind(this));
			return nlsPromise;
		} else {
			return Promise.resolve(true);
		}
	};
});
