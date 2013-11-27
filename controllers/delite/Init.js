define(["require", "dcl/dcl", "dojo/_base/lang", "dojo/on", "dojo/Deferred", "dui/ViewStack",
	"../../Controller"], function (require, dcl, lang, on, Deferred, ViewStack, Controller) {
	return dcl(Controller, {
		constructor: function () {
			this.app.on("app-init", lang.hitch(this, "_initHandler"));
		},
		_initHandler: function (event) {
			// create the dui main container or use it if already available in the HTML of the app

			if (this.app.domNode == null) {
				// the user has not notified us of a widget to use as the parent
				// build one
				this.app.containerNode = new ViewStack();
				this.app.containerNode.style.width = "100%";
				this.app.containerNode.style.height = "100%";
				this.app.containerNode.style.display = "block";
				// TODO: how to add it?
				document.body.appendChild(this.app.containerNode);
				this.app.containerNode.startup();
			}

			// fire the event on the container to load the main view

			var deferred = new Deferred();

			// let's display default view
			on.emit(document, "delite-display", {
				// TODO is that really defaultView a good name? Shouldn't it be defaultTarget or defaultView_s_?
				dest: this.app.defaultView,
				transitionDeferred: deferred
			});

			// TODO views in the hash MUST be handled by history controller?

			if (this.app.setStatus) {
				deferred.then(function () {
					this.setStatus(this.app.lifecycle.STARTED);
				});
			}
		}
	});
});
