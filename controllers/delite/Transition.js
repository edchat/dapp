define(["dcl/dcl", "dojo/on", "dojo/when", "dojo/Deferred", "dojo/promise/all", "dojo/_base/lang", "../../Controller",
        "../../utils/constraints"
    ],
    function (dcl, on, when, Deferred, all, lang, Controller, constraints) {

        return dcl(Controller, {
            constructor: function () {
                document.addEventListener("delite-display", lang.hitch(this, "_displayHandler"));
            },
            _displayHandler: function (event) {
                console.log("dapp/delite/controller/Transition:_displayHandler called for " + event.dest);
                // TODO be more generic here instead of picking a few props
                this._displayViews({
                    dest: event.dest
                    // other props
                });
            },
            _displayViews: function (event, skipParents) {
                console.log("dapp/delite/controller/Transition:_displayViews called for " + event.dest);
                var views = event.dest && event.dest.split("+");
                if (views) {
                    for (var i = 0; i < views.length; i++) {
                        // display the view
                        this._displayView(views[i], event, true, false, skipParents);
                    }
                } else {
                    // this is the root
                    this._displayView(null, event, true, false, skipParents);
                }
            },
            _displayView: function (viewTarget, event, displayDefaultView, isParent, skipParents) {
                console.log("dapp/delite/controller/Transition:_displayView called for " + event.dest);
                var app = this.app;
                var deferred = new Deferred(),
                    self = this,
                    subEvent, parent, loadDeferred;
                event.isParent = isParent;
                if (displayDefaultView) {
                    event.fullViewTarget = viewTarget;
                }
                // wait for parents to be displayed first
                when(skipParents || this._displayParents(viewTarget, event, isParent, displayDefaultView),
                    function (value) {
                        subEvent = Object.create(event);
                        subEvent.dest = viewTarget.split(",").pop();
                        // parent is the view, the container is only child of the view
                        // TODO make sure one can in the config of the view specify a different container
                        // "myview": { container: "a query string" }
                        // and when specified use the query string here to get the container instead of the only child
                        // TODO: fix this to get the parent properly THIS IS TEST CODE HERE
                        subEvent.parent = parent = value.dapp.nextView;
                        // TODO: fix this to get the constraint properly THIS IS TEST CODE HERE
                        //	var constraint = parent.views[subEvent.dest].constraint || "main";
                        var constraint = constraints.getConstraintForViewTarget(viewTarget, app);
                        var p = document.getElementById(constraint); // || document.body;
                        //	loadDeferred = parent.containerNode.show(subEvent.dest, subEvent).then(function (value) {
                        if (!p || !p.show) {
                            return;
                        }
                        loadDeferred = p.show(subEvent.dest, subEvent).then(function (value) {
                            console.log("dapp/delite/controller/Transition:_displayView back from " +
                                "parent.containerNode.show for subEvent.viewTarget=" + subEvent.viewTarget);
                            event.isParent = false;
                            deferred.resolve(value);
                            return value;
                        });
                        // if we are at the init view, check if we have defaultView children to display in addition
                        if (displayDefaultView) {
                            loadDeferred.then(function (value) {
                                if (value.dapp.nextView.defaultView) {
                                    // TODO: here we re-use the same transition as was initially setup
                                    // do we want to use it for defaultView as well?
                                    var newEvent = Object.create(subEvent);
                                    newEvent.dest = value.dapp.nextView.defaultView;
                                    self._displayViews(newEvent, value);
                                }
                                return value;
                            });
                        }
                    });
                return deferred.promise;
            },
            _displayParents: function (viewTarget, event, displayDefaultView) {
                console.log("dapp/delite/controller/Transition:_displayParents called for viewTarget=" + viewTarget);
                // for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
                // TODO: we might improve that later to avoid users have to specify this?
                var parts = viewTarget && viewTarget.split(",");
                if (parts && parts.length > 1) {
                    parts.pop();
                    event.isParent = true;
                    return this._displayView(parts.join(","), event, displayDefaultView, true);
                } else {
                    //	event.isParent = false;
                }
                return {
                    dapp: {
                        nextView: this.app
                    },
                    isParent: false
                };
            }
        });
    });
