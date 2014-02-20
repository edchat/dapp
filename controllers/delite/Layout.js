define(["dcl/dcl", "dojo/_base/lang", "../../Controller", "dojo/dom-attr", "../../utils/constraints", "dojo/dom-class"],
	function (dcl, lang, Controller, domAttr, constraints, domClass) {
		// module:
		//		dapp/controllers/delite/Layout
		// summary:
		//		binds "app-initLayout", "app-layoutView" and "app-resize" events on
		// 		application instance.
		return dcl(Controller, {
			constructor: function () {
				this.app.on("app-initLayout", lang.hitch(this, "initLayout"));
			},
			initLayout: function (event) {
				// summary:
				//		Response to dapp "app-initLayout" event.
				//
				// example:
				//		Use emit to trigger "app-initLayout" event, and this function will respond to the event.
				// 		For example:
				//		|	this.app.emit("app-initLayout", view);
				//
				// event: Object
				// |		{"view": view, "callback": function(){}};
				this.app.log("in app/controllers/Layout.initLayout event=", event);
				this.app.log("in app/controllers/Layout.initLayout event.view.parent.name=[",
					event.view.parent.name, "]");

				// TODO: we should have the correct parent and not need to try to find it here
				if (!event.view.domNode.parentNode) {
					//event.view.parent.domNode.appendChild(event.view.domNode);
					var p = document.getElementById(event.view.constraint);
					console.log("in Layout controller compare parent event.view.parent=",
						event.view.parent.containerNode ? event.view.parent.containerNode.id : "");
					if (p) {
						console.log("in Layout controller compare parent                 p=", p.id);
						p.addChild(event.view.domNode);
					} else {
						event.view.parent.containerNode.addChild(event.view.domNode);
					}
					// TODO: is this needed?
					event.view.containerNode = event.view.domNode.children[0];

					// set the id and class
					// TODO: is this needed?
					domAttr.set(event.view.domNode, "id", event.view.id); // Set the id for the domNode
					if (event.view.constraint) {
						domClass.add(event.view.domNode, event.view.constraint);
					}


				}

				domAttr.set(event.view.domNode, "data-app-constraint", event.view.constraint);

				domAttr.set(event.view.domNode, "id", event.view.id); // Set the id for the domNode
				if (event.callback) { // if the event has a callback, call it.
					event.callback();
				}

			}
		});
	});
