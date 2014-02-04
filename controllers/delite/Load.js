define(
    ["require", "dcl/dcl", "dojo/on", "dojo/_base/lang", "dojo/Deferred", "../../Controller",
        "../../utils/constraints"
    ],
    function (require, dcl, on, lang, Deferred, Controller, constraints) {
        var MODULE = "delite/Load";
        var resolveView = function (event, newView) {
            // in addition to arguments required by delite we pass our own needed arguments
            // to get them back in the transitionDeferred
            event.loadDeferred.resolve({
                child: newView.domNode || newView,
                viewTarget: event.viewTarget,
                fullViewTarget: event.fullViewTarget,
                isParent: event.isParent,
                parent: event.parent,
                dapp: {
                    nextView: newView,
                    previousView: event.parent._activeView
                }
            });
        };

        return dcl(Controller, {
            constructor: function () {
                document.addEventListener("delite-display-load", lang.hitch(this, "_loadHandler"));
            },
            /* jshint maxcomplexity: 13 */
            _loadHandler: function (event) {
                var F = "dapp/delite/controller/Load:_loadHandler";
                console.log("dapp/delite/controller/Load:_loadHandler called for " + event.dest);
                var self = this;
                event.preventDefault();
                // load the actual view
                // TODO: don't I have two cases here, when the parent is a delite display container and when not?
                // probably to be solved by having all delite containers support the eventing mechanism
                var viewId = event.dest || "";
                // TODO: deal with defaultParams?
                var params = event.params || "";

                // TODO: Need to find the parent
                //	var view = event.parent.children[viewId];
                //	var constraint = event.parent.views[viewId].constraint || "main";
                var constraint = constraints.getConstraintForViewTarget(event.fullViewTarget, this.app);
                //TODO: this is a hack need better way to get the parent
                if (!event.parent) {
                    if (!event.fullViewTarget) {
                        constraint = constraints.getConstraintForViewTarget(event.dest, this.app);
                    }
                    if (!constraint) { // problem, we dont have this view
                        event.loadDeferred.resolve({
                            child: typeof event.dest === "string" ? document.getElementById(event.dest) : event.dest
                        });
                        return;
                    }
					event.parent = document.getElementById(constraint);
                }
                var view = null;
                if (event.parent && event.parent.children) {
                    view = event.parent.children[viewId];
                }
                // once loaded we will be ready to call beforeActivate

                /* jshint maxcomplexity: 13 */
                event.loadDeferred.then(function (value) {
                    //TODO: ELC need to review this and see if fullViewTarget is really needed, and how best to
                    // get the parent
                    var parts, toId, subIds, next, parent;
                    if (value.fullViewTarget) { // need to call the before Activate/Deactivate for the view(s)
                        var viewTarget = value.fullViewTarget;
                        parent = value.parent;
                        if (viewTarget) {
                            parts = viewTarget.split(",");
                        } else {
                            // If parent.defaultView is like "main,main", we also need to split it and set the value to
                            // toId and subIds. Or cannot get the next view by "parent.children[parent.id + '_' + toId]"
                            parts = parent.defaultView.split(",");
                        }
                        toId = parts.shift();
                        subIds = parts.join(",");

                        // next is loaded and ready for transition
                        //	next = parent.children[parent.id + '_' + toId];
                        next = parent.children[toId];

                        //	if(!next){
                        //	if(removeView){
                        //		this.app.log(F+
                        // 				" called with removeView true, but that view is not available to remove");
                        //		return;	// trying to remove a view which is not showing
                        //	}
                        //	throw Error("child view must be loaded before transition.");
                        //	}
                        // if no subIds and next has default view,
                        // set the subIds to the default view and transition to default view.
                        if (!subIds && next.defaultView) {
                            subIds = next.defaultView;
                            constraints.setSelectedChild(parent, next.constraint || "center", next);
                            return; // do not call beforeActivate for the parent with defaultView wait for last child
                        }

                        var nextSubViewArray = [next || parent];
                        if (subIds) {
                            nextSubViewArray = self._getNextSubViewArray(subIds, next, parent);
                        }

                        var current = constraints.getSelectedChild(parent, next.constraint || "center");
                        var currentSubViewRet = self._getCurrentSubViewArray(parent, nextSubViewArray, /*removeView*/
                            false);
                        var currentSubViewArray = currentSubViewRet.currentSubViewArray;
                        self.currentLastSubChildMatch = currentSubViewRet.currentLastSubChildMatch;
                        self.nextLastSubChildMatch = currentSubViewRet.nextLastSubChildMatch;
                        //var currentSubNames = self._getCurrentSubViewNamesArray(currentSubViewArray);

                        var data = {};

                        if (!value.isParent && current) { // && current._active){
                            console.log(F + " calling _handleBeforeDeactivateCalls next id=[", next.id,
                                "], parent.id=[", next.parent.id, "]");
                            self._handleBeforeDeactivateCalls(currentSubViewArray, self.nextLastSubChildMatch || next,
                                current, data, subIds);
                            value.nextSubViewArray = nextSubViewArray;
                            value.currentSubViewArray = currentSubViewArray;
                            value.currentSubViewArray = currentSubViewArray;
                            value.nextLastSubChildMatch = self.nextLastSubChildMatch;
                            value.current = current;
                            value.next = next;
                            value.subIds = subIds;
                        }

                        if (!value.isParent && next) {
                        // console.log(F + " calling _handleBeforeActivateCalls next id=[", next.id, "], parent.id=[",
                        //        next.parent.id, "]");
                            self._handleBeforeActivateCalls(nextSubViewArray, self.currentLastSubChildMatch || current,
                                data, subIds);
                        }

                    }
                    /*  TODO: should remove the dapp.previousView code, it did not cut it
					 if (value.dapp.previousView) {
					 value.dapp.previousView.beforeDeactivate(value.dapp.nextView);
					 }
					 if (value.dapp.nextView) {
					 //		value.dapp.nextView.beforeActivate(value.dapp.previousView);
					 }
					 */
                    return value;
                });
                // once transition we will be ready to call afterActivate
                on.once(event.target, "delite-display-complete", function (complete) {
                    //	on(event.target, "delite-display-complete", function (complete) {
                    if (complete.dapp) {
                        console.log("dapp/delite/controller/Load:_loadHandler delite-display-complete fired for ",
                            complete.dapp.nextView.id);
                        // TODO works for StackView but what about containers with several views visible same time
                        complete.parent._activeView = complete.dapp.nextView;

                        // Add call to handleAfterDeactivate and handleAfterActivate here!
                        var data = {};
                        if (!complete.isParent && complete.next) {
                            console.log(F + " calling _handleAfterDeactivateCalls complete.next id=[", complete.next.id,
                                "], complete.next.parent.id=[", complete.next.parent.id, "]");
                            self._handleAfterDeactivateCalls(complete.currentSubViewArray,
                                complete.nextLastSubChildMatch || complete.next, complete.current, data,
                                complete.subIds);
                        }

                        if (complete.nextSubViewArray) {
                            self._handleAfterActivateCalls(complete.nextSubViewArray, /*removeView*/ false,
                                complete.currentLastSubChildMatch || complete.current, data, complete.subIds);
                        }

                        //	if (complete.dapp.nextView) {
                        //		complete.dapp.nextView.afterActivate(complete.dapp.previousView);
                        //	}
                        //	if (complete.dapp.previousView) {
                        //		complete.dapp.previousView.afterDeactivate(complete.dapp.nextView);
                        //	}
                    }
                });
                if (view) {
                    // set params to new value before returning
                    if (params) {
                        view.params = params;
                    }
                    resolveView(event, view);
                } else if (event.dest && event.dest.id && this.app.views[event.dest.id]) {
                    viewId = event.dest.id;
                    this._createView(event, viewId, params, event.parent || this.app,
                        this.app.views[event.dest.id].type);
                } else {
                    var type = null;
                    if (event.parent && event.parent.views && event.parent.views[viewId]) {
                        type = event.parent.views[viewId].type;
                    }
                    this._createView(event, viewId, params, event.parent, type);
                }
            },

            _createView: function (event, name, params, parent, type) {
                console.log("dapp/delite/controller/Load:_createView called for " + name);
                var app = this.app;
                // TODO: in my prototype View names & ids are the same, so view names must be unique
                require([type ? type : "../../View"], function (View) {
                    var params = {
                        "app": app,
                        "id": name,
                        "parent": parent
                    };
                    dcl.mix(params, {
                        "params": params
                    });
                    new View(params).start().then(function (newView) {
                        parent.children[name] = newView;
                        resolveView(event, newView);
                    });
                });
            },

            _handleBeforeDeactivateCalls: function (subs, next, current, /*parent,*/ data
                /*,removeView, doResize,
				 subIds, currentSubNames*/
            ) {
                // summary:
                //		Call beforeDeactivate for each of the current views which are about to be deactivated
                var F = MODULE + ":_handleBeforeDeactivateCalls";
                //	if(current._active){
                //now we need to loop backwards thru subs calling beforeDeactivate
                for (var i = subs.length - 1; i >= 0; i--) {
                    var v = subs[i];
                    if (v && v.beforeDeactivate) { //&& v._active){
                        this.app.log(F, "beforeDeactivate for v.id=" + v.id);
                        v.beforeDeactivate(next, data);
                    }
                }
            },

            _handleBeforeActivateCalls: function (subs, current, data /*, subIds*/ ) {
                // summary:
                //		Call beforeActivate for each of the next views about to be activated
                var F = MODULE + ":_handleBeforeActivateCalls";
                //now we need to loop backwards thru subs calling beforeActivate (ok since next matches current)
                for (var i = subs.length - 1; i >= 0; i--) {
                    var v = subs[i];
                    console.log(F, "beforeActivate for v.id=" + v.id);
                    v.beforeActivate(current, data);
                    // set this view as the selected child of the parent for this constraint
                    constraints.setSelectedChild(v.parent, v.constraint || "center", v);

                }
            },

            _handleAfterDeactivateCalls: function (subs, next, current, data /*, subIds*/ ) {
                // summary:
                //		Call afterDeactivate for each of the current views which have been deactivated
                var F = MODULE + ":_handleAfterDeactivateCalls";
                if (current) { // && current._active){
                    //now we need to loop forwards thru subs calling afterDeactivate
                    for (var i = 0; i < subs.length; i++) {
                        var v = subs[i];
                        if (v && v.beforeDeactivate) { // && v._active){
                            this.app.log(F, "afterDeactivate for v.id=" + v.id);
                            v.afterDeactivate(next, data);
                            v._active = false;
                        }
                    }

                }
            },

            _handleAfterActivateCalls: function (subs, removeView, current, data /*, subIds*/ ) {
                // summary:
                //		Call afterActivate for each of the next views which have been activated
                var F = MODULE + ":_handleAfterActivateCalls";
                //now we need to loop backwards thru subs calling beforeActivate (ok since next matches current)
                var startInt = 0;
                if (removeView && subs.length > 1) {
                    startInt = 1;
                }
                for (var i = startInt; i < subs.length; i++) {
                    var v = subs[i];
                    if (v.afterActivate) {
                        this.app.log(F, "afterActivate for v.id=" + v.id);
                        v.afterActivate(current, data);
                        v._active = true;
                    }
                }
            },

            _getNextSubViewArray: function (subIds, next, parent) {
                // summary:
                //		Get next sub view array, this array will hold the views which are about to be transitioned to
                //
                // subIds: String
                //		the subids, the views are separated with a comma
                // next: Object
                //		the next view to be transitioned to.
                // parent: Object
                //		the parent view used in place of next if next is not set.
                //
                // returns:
                //		Array of views which will be transitioned to during this transition
                //var F = MODULE + ":_getNextSubViewArray";
                var parts = [];
                var p = next || parent;
                if (subIds) {
                    parts = subIds.split(",");
                }
                var nextSubViewArray = [p];
                //now we need to loop forwards thru subIds calling beforeActivate
                for (var i = 0; i < parts.length; i++) {
                    var toId = parts[i];
                    //	var v = p.children[p.id + '_' + toId];
                    var v = p.children[toId];
                    if (v) {
                        nextSubViewArray.push(v);
                        p = v;
                    }
                }
                nextSubViewArray.reverse();
                return nextSubViewArray;
            },

            _getCurrentSubViewArray: function (parent, nextSubViewArray, removeView) {
                // summary:
                //		Get current sub view array which will be replaced by the views in the nextSubViewArray
                //
                // parent: String
                //		the parent view whose selected children will be replaced
                // nextSubViewArray: Array
                //		the array of views which are to be transitioned to.
                //
                // returns:
                //		Array of views which will be deactivated during this transition
                //var F = MODULE + ":_getCurrentSubViewArray";
                var currentSubViewArray = [];
                var constraint, type, hash;
                var p = parent;
                //	this.currentLastSubChildMatch = null;
                //	this.nextLastSubChildMatch = null;
                var currentLastSubChildMatch = null;
                var nextLastSubChildMatch = null;

                for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
                    constraint = nextSubViewArray[i].constraint || "center";
                    type = typeof (constraint);
                    hash = (type === "string" || type === "number") ? constraint : constraint.__hash;
                    // if there is a selected child for this constraint, and the child matches this view, push it.
                    if (p && p.selectedChildren && p.selectedChildren[hash]) {
                        if (p.selectedChildren[hash] === nextSubViewArray[i]) {
                            currentLastSubChildMatch = p.selectedChildren[hash];
                            nextLastSubChildMatch = nextSubViewArray[i];
                            currentSubViewArray.push(currentLastSubChildMatch);
                            p = currentLastSubChildMatch;
                        } else {
                            currentLastSubChildMatch = p.selectedChildren[hash];
                            currentSubViewArray.push(currentLastSubChildMatch);
                            // setting this means the transition will be done to the child instead of the parent
                            nextLastSubChildMatch = nextSubViewArray[i];
                            // since the constraint was set, but it did not match, need to deactivate all selected
                            // children of this.currentLastSubChildMatch
                            if (!removeView) {
                                var selChildren = constraints.getAllSelectedChildren(currentLastSubChildMatch);
                                currentSubViewArray = currentSubViewArray.concat(selChildren);
                            }
                            break;
                        }
                    } else { // the else is for the constraint not matching which means no more to deactivate.
                        currentLastSubChildMatch = null; // there was no view selected for this constraint
                        // set this to the next view for transition to an empty constraint
                        nextLastSubChildMatch = nextSubViewArray[i];
                        break;
                    }

                }
                // Here since they had the constraint but it was not the same I need to deactivate all children of p
                if (removeView) {
                    currentSubViewArray = currentSubViewArray.concat(constraints.getAllSelectedChildren(p));
                }
                var ret = {
                    currentSubViewArray: currentSubViewArray,
                    currentLastSubChildMatch: currentLastSubChildMatch,
                    nextLastSubChildMatch: nextLastSubChildMatch
                };
                //	return currentSubViewArray;
                return ret;
            },

            _getCurrentSubViewNamesArray: function (currentSubViewArray) {
                // summary:
                //		Get current sub view names array, the names of the views which will be transitioned from
                //
                // currentSubViewArray: Array
                //		the array of views which are to be transitioned from.
                //
                // returns:
                //		Array of views which will be deactivated during this transition
                //var F = MODULE + ":_getCurrentSubViewNamesArray";
                var currentSubViewNamesArray = [];
                for (var i = 0; i < currentSubViewArray.length; i++) {
                    currentSubViewNamesArray.push(currentSubViewArray[i].name);
                }
                return currentSubViewNamesArray;
            }
        });
    });
