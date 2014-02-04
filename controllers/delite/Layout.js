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

                if (!event.view.domNode.parentNode) {
                    //						event.view.parent.domNode.appendChild(event.view.domNode);
                    var p = document.getElementById(event.view.constraint);
                    //	p.appendChild(event.view.domNode);
                    //	p.parentNode.addChild(event.view.domNode);
                    if (p) {
                        p.addChild(event.view.domNode);
                    } else {
                        //	event.view.parent.domNode.appendChild(event.view.domNode);
                        event.view.parent.containerNode.addChild(event.view.domNode);
                    }
                    event.view.containerNode = event.view.domNode.children[0];
                    //	register.parse();

                    // set the id and class
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
