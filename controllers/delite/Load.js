define(
	["require", "dcl/dcl", "dojo/on", "dojo/_base/lang", "dojo/Deferred", "../../Controller",
		"../../utils/constraints", "dojo/dom-construct"
	],
	function (require, dcl, on, lang, Deferred, Controller, constraints, domConstruct) {
		var MODULE = "controllers/delite/Load:";
		var resolveView = function (event, viewName, newView, parentView) {
			// in addition to arguments required by delite we pass our own needed arguments
			// to get them back in the transitionDeferred
			var F = MODULE + "resolveView ";
			if (newView && newView.app) {
				newView.app.log(MODULE, F + "called with viewName=[" + viewName + "] nextView.id=[" + newView.id +
					"] " + "parentView.id=[" + (parentView ? parentView.id : "") + "]");
			}
			event.loadDeferred.resolve({
				child: newView.domNode || newView,
				parent: event.parent,
				dapp: {
					nextView: newView,
					parentView: parentView,
					isParent: event.isParent,
					lastView: event.lastView,
					id: newView.id,
					viewName: newView.viewName
				}
			});
		};

		return dcl(Controller, {
			constructor: function () {
				this.func = lang.hitch(this, "_loadHandler");
				this.loadHandler = document.addEventListener("delite-display-load", this.func);
				this.app.on("app-unloadApp", lang.hitch(this, "unloadApp"));
				this.events = {
					"app-unload-view": this.unloadView
				};
			},
			unloadApp: function () {
				//TODO: should also destroy this controller too!
				document.removeEventListener("delite-display-load", this.func, false);
			},
			/* jshint maxcomplexity: 13 */
			_loadHandler: function (event) {
				var F = MODULE + "_loadHandler ";
				this.app.log(MODULE, F + "called for event.dest=[" + event.dest + "]");
				var self = this;
				event.preventDefault();
				// load the actual view
				// TODO: don't I have two cases here, when the parent is a delite display container and when not?
				// probably to be solved by having all delite containers support the eventing mechanism
				//var viewId = event.dest || "";
				//var viewId =  event.dest ? (event.parent.id + '_' + event.dest) : "";
				var viewId = this.app.flatViewDefinitions[event.dest] ?
					this.app.flatViewDefinitions[event.dest].viewId : event.dest;
				this.app.log(MODULE, F + "called for viewId=[" + viewId + "]");
				// TODO: deal with defaultParams?
				var params = event.params || "";

				var viewDef = this.app.getViewDefFromEvent(event);
				var constraint = viewDef ? viewDef.constraint : null;

				if (!event.parent) {
					this.app.log(MODULE, F + "called without event.parent!!!!!!! for [" + event.dest + "]");
					if (!viewDef) { // problem, we dont have this view
						event.loadDeferred.resolve({
							child: typeof event.dest === "string" ? document.getElementById(event.dest) : event.dest
						});
						return;
					}
					event.parent = document.getElementById(constraint);
					this.app.log(MODULE, F + "called without event.parent set it to [" + event.parent.id + "]");
				} else {
					this.app.log(MODULE, F + "called with event.parent [" + event.parent.id + "]");
				}
				var view = null;
				if (event.parent && event.parent.children) {
					view = event.parent.children[viewId];
				}

				/* jshint maxcomplexity: 16 */
				event.loadDeferred.then(function (value) {
					//TODO: ELC need to review this and see if fullViewTarget and other params are really needed, and how best to
					// get the parent
					var parts, toId, subIds, next, parent;
					if (value.dapp.id) { // need to call the before Activate/Deactivate for the view(s)
						toId = value.dapp.id;
						subIds = null;
						// TODO: this needs to change, value.dapp.viewName is actually the id, so change it from name
						// TODO: to id and add a call in app to get the viewPath from the id, and call that instead.
						var viewTarget = self.app.flatViewDefinitions[(value.dapp.viewName || value.dapp.id)].viewPath;
						parent = value.parent;
						var parentView = value.dapp.parentView;
						if (viewTarget) {
							parts = viewTarget.split(",");
							parts.shift();
							subIds = parts.join(",");
						} else {
							// If parent.defaultView is like "main,main", we also need to split it and set the value to
							// toId and subIds. Or cannot get the next view by "parent.children[parent.id + '_' + toId]"
							parts = parentView.defaultView.split(",");
							toId = parts.shift();
							subIds = parts.join(",");
						}

						// next is loaded and ready for transition
						//	next = parent.children[parent.id + '_' + toId];
						next = parent.children[toId];
						var nextView = parentView.children[toId];
						self.app.log(MODULE, F + "check next.constraint and nextView.constraint next constraint=[",
							(next ? next.constraint : ""), "], nextView.constraint=[" + (nextView ?
								nextView.constraint : "") + "] ");

						//	if(!next){
						//	if(removeView){
						//		this.app.log(F+
						// 				"called with removeView true, but that view is not available to remove");
						//		return;	// trying to remove a view which is not showing
						//	}
						//	throw Error("child view must be loaded before transition.");
						//	}
						// if no subIds and next has default view,
						// set the subIds to the default view and transition to default view.
						if (!subIds && next.defaultView) {
							subIds = next.defaultView;
							constraints.setSelectedChild(parent, (nextView.constraint || "center"), nextView, self.app);
							return; // do not call beforeActivate for the parent with defaultView wait for last child
						}

						var nextSubViewArray = [nextView || parentView];
						//	var nextSubViewArray = [parentView || self.app];
						if (subIds) {
							//nextSubViewArray = self._getNextSubViewArray(subIds, next, parent);
							nextSubViewArray = self._getNextSubViewArray(subIds, parent, self.app);
						}

						var current = constraints.getSelectedChild(parentView, (nextView && nextView.constraint ?
							nextView.constraint : next && next.constraint ? next.constraint : "center"));
						self.app.log(MODULE, F + "got current from call to constraints with parentView.id=["+
							parentView.id, "], got current.id=[" + (current ? current.id : "") +"]");
						//var current = constraints.getSelectedChild(parent, next.parentSelector || "center");
						var currentSubViewRet = self._getCurrentSubViewArray(self.app, nextSubViewArray,
							/*removeView,*/
							false);
						var currentSubViewArray = currentSubViewRet.currentSubViewArray;
						self.currentLastSubChildMatch = currentSubViewRet.currentLastSubChildMatch;
						self.nextLastSubChildMatch = currentSubViewRet.nextLastSubChildMatch;
						//var currentSubNames = self._getCurrentSubViewNamesArray(currentSubViewArray);

						var data = event.viewData;

						if (!value.isParent) {
							if (current && current._active) {
								self.app.log(MODULE, F + "calling _handleBeforeDeactivateCalls nextView id=[",
									(nextView ? nextView.id : ""), "], parent.id=[" + (nextView && nextView.parent ? nextView.parent.id : "") +
									"] currentSubViewArray =",
									currentSubViewArray);
								self._handleBeforeDeactivateCalls(currentSubViewArray, self.nextLastSubChildMatch ||
									nextView, current, data, subIds);
							}else if(current){ // TODO: remove this TEMP
								self.app.log(MODULE, F + "NOT calling _handleBeforeDeactivateCalls current._active=[",
									current._active, "], current.id=[" + current.id);
							}
							value.nextSubViewArray = nextSubViewArray;
							value.currentSubViewArray = currentSubViewArray;
							value.nextLastSubChildMatch = self.nextLastSubChildMatch;
							value.current = current;
							value.next = next;
							value.nextView = nextView;
							value.subIds = subIds;
						}
						if (!value.isParent && next) {
							//console.log(F + " calling _handleBeforeActivateCalls next id=[", next.id, "],
							//        parent.id=[", next.parent.id, "]");
							self._handleBeforeActivateCalls(nextSubViewArray, self.currentLastSubChildMatch || current,
								data, subIds);
						}
						constraints.setSelectedChild(parent, (nextView ? nextView.constraint : next ? next.constraint
							: "center"), nextView ? nextView :  next, self.app);

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
				var onHandle = on(event.target, "delite-display-complete", function (complete) {
					//	on(event.target, "delite-display-complete", function (complete) {
					if(complete.dest !== event.dest){ // if this delite-display-complete is not for this view return
						return;
					}
					onHandle.remove();
					if (complete.dapp) {
						//var next = complete.next;
						var next = complete.next || complete.dapp.nextView;
						self.app.log(MODULE, F + "delite-display-complete fired for [" + next.id + "] with parent [" +
							(complete.dapp.parentView ? complete.dapp.parentView.id : "") + "]");
						// TODO works for StackView but what about containers with several views visible same time
						complete.parent._activeView = complete.dapp.parentView;

						// Add call to handleAfterDeactivate and handleAfterActivate here!
						var data = complete.viewData;
						if (!next.beforeActivate) { // is next an app view or domNode?
							next = self.app.getViewFromViewId(next.id);
						}
						if (!complete.isParent && next) {
							self.app.log(MODULE, F + "calling _handleAfterDeactivateCalls next id=[" + next.id +
								"] next.parent.id=[" + next.parent.id + "]");
							self._handleAfterDeactivateCalls(complete.currentSubViewArray,
								complete.nextLastSubChildMatch || next, complete.current, data,
								complete.subIds);
						}

						if (complete.nextSubViewArray) {
							self._handleAfterActivateCalls(complete.nextSubViewArray, /*removeView*/ false,
								complete.currentLastSubChildMatch || complete.current, data, complete.subIds);
						}

					}
				});
				if (view) {
					// set params to new value before returning
					if (params) {
						view.params = params;
					}
					var parentView = this.app.getParentViewFromViewId(view.id);
					resolveView(event, event.dest, view, parentView);
				} else if (event.dest && event.dest.id && this.app.views[event.dest.id]) {
					viewId = event.dest.id;
					this._createView(event, viewId, event.dest.viewName, params, event.parent || this.app,
						this.app.views[event.dest.id].type);
				} else {
					var type = null;
					if (event.parent && event.parent.views && event.parent.views[viewId]) {
						type = event.parent.views[viewId].type;
					}
					this._createView(event, viewId, event.dest, params, event.parent, type);
				}
			},

			_createView: function (event, id, viewName, params, parent, type) {
				var F = MODULE + "_createView ";
				this.app.log(MODULE, F + "called for [" + id + "]");
				var app = this.app;
				//var id = parent.id + '_' + id;
				// TODO: in my prototype View names & ids are the same, so view names must be unique
				require([type ? type : "../../View"], function (View) {
					var params = {
						"app": app,
						"id": id,
						"viewName": viewName,
						"parent": parent
					};
					dcl.mix(params, {
						"params": params
					});
					new View(params).start().then(function (newView) {
						var p = parent || app.getParentViewFromViewId(id);
						var pView = app.getParentViewFromViewId(id);
						p.children[id] = newView;
						pView.children[id] = newView;
						newView.init();
						resolveView(event, id, newView, pView);
					});
				});
			},

			_handleBeforeDeactivateCalls: function (subs, next, current, /*parent,*/ data
				/*,removeView, doResize,
				 subIds, currentSubNames*/
			) {
				// summary:
				//		Call beforeDeactivate for each of the current views which are about to be deactivated
				var F = MODULE + "_handleBeforeDeactivateCalls ";
				//	if(current._active){
				//now we need to loop backwards thru subs calling beforeDeactivate
				for (var i = subs.length - 1; i >= 0; i--) {
					var v = subs[i];
				//	this.app.log(MODULE, F + "in _handleBeforeDeactivateCalls in subs for v.id=[" + v.id + "]" +
				//	" v.beforeDeactivate=["+v.beforeDeactivate+"] v._active=["+v._active+"]");
					if (v && v.beforeDeactivate && v._active) {
						this.app.log(MODULE, F + "beforeDeactivate for v.id=[" + v.id + "]");
						v.beforeDeactivate(next, data);
					}
				}
			},

			_handleBeforeActivateCalls: function (subs, current, data /*, subIds*/ ) {
				// summary:
				//		Call beforeActivate for each of the next views about to be activated
				var F = MODULE + "_handleBeforeActivateCalls ";
				//now we need to loop backwards thru subs calling beforeActivate (ok since next matches current)
				for (var i = subs.length - 1; i >= 0; i--) {
					var v = subs[i];
					if (!v.beforeActivate) {
						v = this.app.getViewFromViewId(v.id);
					}
					if (v && v.beforeActivate) {
						this.app.log(MODULE, F + "beforeActivate for v.id=[" + v.id + "]");
						v.beforeActivate(current, data);
					}
					// set this view as the selected child of the parent for this constraint if parent is a view
					//TODO: ELC this is too late, needs to be done before deactivate is called
					//	if(this.app.id === v.parent.id || this.app.getViewDefFromViewName(v.parent.id)){
					//		constraints.setSelectedChild(v.parent, v.constraint || "center", v);
					//	}

				}
			},

			_handleAfterDeactivateCalls: function (subs, next, current, data /*, subIds*/ ) {
				// summary:
				//		Call afterDeactivate for each of the current views which have been deactivated
				var F = MODULE + "_handleAfterDeactivateCalls ";
				if (current && current._active) {
					//now we need to loop forwards thru subs calling afterDeactivate
					for (var i = 0; i < subs.length; i++) {
						var v = subs[i];
						if (v && v.beforeDeactivate && v._active) {
							this.app.log(MODULE, F + "afterDeactivate for v.id=[" + v.id + "] setting _active false");
							v.afterDeactivate(next, data);
							v._active = false;
						}
					}

				}
			},

			_handleAfterActivateCalls: function (subs, removeView, current, data /*, subIds*/ ) {
				// summary:
				//		Call afterActivate for each of the next views which have been activated
				var F = MODULE + "_handleAfterActivateCalls ";
				//now we need to loop backwards thru subs calling beforeActivate (ok since next matches current)
				var startInt = 0;
				if (removeView && subs.length > 1) {
					startInt = 1;
				}
				for (var i = startInt; i < subs.length; i++) {
					var v = subs[i];
					if (v.afterActivate) {
						this.app.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] setting _active true");
						v.afterActivate(current, data);
						v._active = true;
						//TODO: is this needed????
						if(v.domNode){
							v.domNode._active = true;
						}
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
				//var F = MODULE + "_getNextSubViewArray ";
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
					toId = this.app.flatViewDefinitions[toId].viewId;
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
				//var F = MODULE + "_getCurrentSubViewArray ";
				var currentSubViewArray = [];
				var constraint, type, hash;
				var p = parent;
				//	this.currentLastSubChildMatch = null;
				//	this.nextLastSubChildMatch = null;
				var currentLastSubChildMatch = null;
				var nextLastSubChildMatch = null;

				for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
					//constraint = nextSubViewArray[i].constraint || "center";
					if (nextSubViewArray[i].constraint) {
						constraint = nextSubViewArray[i].constraint;
					} else {
						var v = this.app.getViewFromViewId(nextSubViewArray[i].id);
						constraint = v.constraint;
					}

					//constraint = nextSubViewArray[i].constraint || nextSubViewArray[i].parent.id;
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

			unloadView: function (event) {
				// summary:
				//		Response to dapp "unload-view" event.
				// 		If a view has children loaded the view and any children of the view will be unloaded.
				//
				// example:
				//		Use trigger() to trigger "app-unload-view" event, and this function will response the event.
				// 		For example:
				//		|	this.trigger("app-unload-view", {"view":view, "callback":function(){...}});
				//
				// event: Object
				//		app-unload-view event parameter. It should be like this: {"view":view, "parent": parent
				// 		"callback":function(){...}}
				var F = MODULE + ":unloadView";

				var view = event.view || {};
				var parent = event.parent || view.parent || this.app;
				var viewId = view.id;
				this.app.log(MODULE, F + " app-unload-view called for [" + viewId + "]");

				if ((!parent && !event.unloadApp) || !view || !viewId) {
					console.warn("unload-view event for view with no parent or with an invalid view with view = ",
						view);
					return;
				}

				if (event.unloadApp) {
					// need to clear out selectedChildren
					parent.selectedChildren = {};
				}

				if (parent.selectedChildren[viewId]) {
					console.warn("unload-view event for a view which is still in use so it can not be unloaded for " +
						"view id = " + viewId + "'.");
					return;
				}

				if (!parent.children[viewId] && !event.unloadApp) {
					console.warn("unload-view event for a view which was not found in parent.children[viewId] for " +
						"viewId = " + viewId + "'.");
					return;
				}

				this.unloadChild(parent, view);

				if (event.callback) {
					event.callback();
				}
			},

			unloadChild: function (parent, viewToUnload) {
				// summary:
				//		Unload the view, and all of its child views recursively.
				// 		Destroy all children, destroy all widgets, destroy the domNode, remove the view from the
				// 		parent.children, then destroy the view.
				//
				// parent: Object
				//		parent of this view.
				// viewToUnload: Object
				//		the view to be unloaded.
				var F = MODULE + ":unloadChild";
				this.app.log(MODULE, F + " unloadChild called for [" + viewToUnload.id + "]");

				for (var child in viewToUnload.children) {
					this.app.log(MODULE, F + " calling unloadChild for for [" + child + "]");
					// unload children then unload the view itself
					this.unloadChild(viewToUnload, viewToUnload.children[child]);
				}
				if (viewToUnload.domNode) {
					// destroy all widgets, then destroy the domNode, then destroy the view.
					/*
					var widList = registry.findWidgets(viewToUnload.domNode);
					this.app.log("logLoadViews:", F,
						" before destroyRecursive loop registry.length = [" + registry.length + "] for view =[" +
						viewToUnload.id + "]");
					for (var wid in widList) {
						widList[wid].destroyRecursive();
					}
					this.app.log("logLoadViews:", F,
						" after destroyRecursive loop registry.length = [" + registry.length + "] for view =[" +
						viewToUnload.id + "]");
			*/
					//TODO: should not be using domConstruct
					this.app.log("logLoadViews:", F,
						" calling domConstruct.destroy for the view [" + viewToUnload.id + "]");
					domConstruct.destroy(viewToUnload.domNode);
				}

				delete parent.children[viewToUnload.id]; // remove it from the parents children
				if (viewToUnload.destroy) {
					this.app.log(MODULE, F + " calling destroy for the view [" + viewToUnload.id + "]");
					viewToUnload.destroy(); // call destroy for the view.
				}
				viewToUnload = null;
			}

			/*
			_getCurrentSubViewNamesArray: function (currentSubViewArray) {
				// summary:
				//		Get current sub view names array, the names of the views which will be transitioned from
				//
				// currentSubViewArray: Array
				//		the array of views which are to be transitioned from.
				//
				// returns:
				//		Array of views which will be deactivated during this transition
				//var F = MODULE + "_getCurrentSubViewNamesArray ";
				var currentSubViewNamesArray = [];
				for (var i = 0; i < currentSubViewArray.length; i++) {
					currentSubViewNamesArray.push(currentSubViewArray[i].viewName);
				}
				return currentSubViewNamesArray;
			}
*/
		});
	});
