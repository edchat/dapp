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
			//	console.log(MODULE, F + " in resolveView  event.dest = "+event.dest);
			//	console.log(MODULE, F + " in resolveView  event.dapp.isParent = "+(event.dapp?
			// event.dapp.isParent:""));
			if (newView && newView.app) {
				newView.app.log(MODULE, F + "called with viewName=[" + viewName + "] nextView.id=[" + newView.id +
					"] " + "parentView.id=[" + (parentView ? parentView.id : "") + "]");
				//		console.log(MODULE, F + "called with viewName=[" + viewName + "] nextView.id=[" + newView.id +
				//			"] " + "parentView.id=[" + (parentView ? parentView.id : "") +
				// "] event.dapp.parentView.id=[" +
				//			(event.dapp && event.dapp.parentView ? event.dapp.parentView.id : ""));
			}
			event.loadDeferred.resolve({
				child: newView.domNode,
				dapp: {
					nextView: newView,
					parentView: parentView,
					parentNode: event.dapp.parentNode,
					isParent: event.dapp.isParent,
					lastViewPart: event.dapp.lastViewPart,
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

			/* jshint maxcomplexity: 16 */
			_loadHandler: function (event) {
				var F = MODULE + "_loadHandler ";
				this.app.log(MODULE, F + "called for event.dest=[" + event.dest + "] this.app.id=" + this.app.id);
				var self = this;
				event.preventDefault();

				// load the actual view
				var dest = event.dest;

				var viewId;
				// if from dom.show, this could be a view id, if it contains an _ treat it as an id
				if (dest.indexOf("_") >= 0) { // if dest is already a view id.
					viewId = dest;
					dest = this.app.getViewDestFromViewid(dest);
				} else {
					viewId = this.app.getViewIdFromDest(event.dest, event.target);
				}
				this.app.log(MODULE, F + "called for viewId=[" + viewId + "]");

				//Need to handle calls directly from node.show that did not come from transition
				if (!event.dapp || !event.dapp.parentView) {
					//This must be a direct call from .show, need to setup event.dapp with parentView etc.

					// setup dest with the full view path, add in defaultViews if necessary
					dest = viewId.replace(/_/g, ",");
					if (!event.parent) {
						dest = this.app.updateDestWithDefaultViews(dest);
						this.app.log(MODULE, F + "dest adjusted to have defaults dest=[" + dest + "]");
						event.dest = dest;
					}
					// if dest has multiple parts or is nested we need to send it thru transition
					if (!event.parent && (dest.indexOf("+") >= 0 || dest.indexOf("-") >= 0 || dest.indexOf(",") >= 0)) {
						self.app.log(MODULE, F + "adjusted dest contains +- or , need to handle special case dest=[" +
							dest + "]");
						this._handleShowFromDispContainer(event, dest);
						return;
					}
					event.dapp = {};
					event.dapp.parentNode = event.target;
					event.dapp.parentView = this.app.getParentViewFromViewName(dest, event.target);
					this.app.log(MODULE, F + "in .show path after update event.dapp.parentView.id = " +
						event.dapp.parentView.id);
					event.dapp.isParent = false;
					event.dapp.lastViewPart = true;
				}

				// Check to see if this view has already been loaded
				var view = null;
				if (event.dapp.parentView && event.dapp.parentView.children) {
					view = event.dapp.parentView.children[viewId];
					if (view) {
						self.app.log(MODULE, F + "view already loaded view.id=" + view.id);
					}
				}


				// After the loadDeferred is resolved, but before the view is displayed this event,
				// delite-display-before will be fired.
				//var onbeforeDisplayHandle = on(event.target, "delite-display-before", function (value) {
				var onbeforeDisplayHandle = event.target.on("delite-display-before", function (value) {
					// If the value.dest does not match the one we are expecting keep waiting
					if (value.dest !== event.dest) { // if this delite-display-complete is not for this view return
						return;
					}
					onbeforeDisplayHandle.remove(); // remove the handle when we match value.dest
					self.app.log(MODULE, F + "in on delite-display-before value.dest =[" + value.dest + "]");

					var retval = {};

					// If this is not a parent of a nested view, we need to determine the firstChildView, subIds and
					//  parentView in order to call _getNextSubViewArray, _handleBeforeDeactivateCalls and
					// _handleBeforeActivateCalls
					if (!value.dapp.isParent) {
						var parts, firstChildId, subIds;
						retval.dapp = value.dapp;

						firstChildId = value.dapp.id;
						subIds = null;

						var viewTarget = value.dapp.nextView.id.replace(/_/g, ",");
						if (viewTarget) {
							parts = viewTarget.split(",");
							firstChildId = parts.shift();
							subIds = parts.join(",");
						}
						var appView = self.app;

						var firstChildView = appView.children[firstChildId];
						self.app.log(MODULE, F + "check firstChildView.constraint=[" + (firstChildView ?
							firstChildView.constraint : "") + "] ");


						var nextSubViewArray = [firstChildView || appView];
						if (subIds) {
							nextSubViewArray = self._getNextSubViewArray(subIds, firstChildView, appView);
						}

						// Need to use constraints.getSelectedChild instead of event.target._visibleChild
						// because in a nested case where isParent is true we replace the event.target._visibleChild
						// before we are ready to use it.  We wait for !isParent and then process the views.
						var current = constraints.getSelectedChild(appView, (firstChildView &&
							firstChildView.constraint ? firstChildView.constraint : "center"));
						//	var testVisibleChild = firstChildView.domNode.parentNode ?
						//		firstChildView.domNode.parentNode._visibleChild : null;
						//			self.app.log(MODULE, F +
						// 				"got current from call to constraints with appView.id=[" +
						//				appView.id, "], got current.id=[" + (current ? current.id : "") + "]");
						//	//TODO: remove temp test
						//			if (testVisibleChild && current && testVisibleChild !== current.domNode) {
						//				console.warn("testVisibleChild !== current testVisibleChild.id=" +
						//				testVisibleChild.id);
						//			}

						// use the nextSubViewArray to get the currentSubViewArray and current and next last child
						// matches.
						var currentSubViewRet = self._getCurrentSubViewArray(appView, nextSubViewArray,
							/*removeView,*/
							false);
						var currentSubViewArray = currentSubViewRet.currentSubViewArray;
						self.currentLastSubChildMatch = currentSubViewRet.currentLastSubChildMatch;
						self.nextLastSubChildMatch = currentSubViewRet.nextLastSubChildMatch;

						//call _handleBeforeDeactivateCalls to process calls to beforeDeactivate for this transition
						if (currentSubViewArray) {
							//self.app.log(MODULE, F + "calling _handleBeforeDeactivateCalls firstChildView id=[",
							//	(firstChildView ? firstChildView.id : ""), "], firstChildView.parent.id=[" +
							//	(firstChildView &&
							//	firstChildView.parent ? firstChildView.parent.id : "") + "] currentSubViewArray =",
							//	currentSubViewArray);
							self._handleBeforeDeactivateCalls(currentSubViewArray, self.nextLastSubChildMatch ||
								firstChildView, current, value.viewData, subIds);
						}
						retval.dapp.nextSubViewArray = nextSubViewArray;
						retval.dapp.currentSubViewArray = currentSubViewArray;
						retval.dapp.nextLastSubChildMatch = self.nextLastSubChildMatch;
						retval.dapp.current = current;
						retval.firstChildView = firstChildView;
						retval.subIds = subIds;
						self.app.log(MODULE, F + "retval.firstChildView.id = [" + retval.firstChildView.id +
							"] retval.dapp.current.id = [" + (retval.dapp.current ? retval.dapp.current.id : "") +
							"] retval.subIds = [" + retval.subIds + "]");

						//call _handleBeforeActivateCalls to process calls to beforeActivate for this transition
						self._handleBeforeActivateCalls(nextSubViewArray, self.currentLastSubChildMatch || current,
							value.viewData, subIds);
					}
					return retval;
				});

				// on delite-display-complete we will be ready to call afterDeactivate and afterActivate
				var onHandle = on(event.target, "delite-display-complete", function (complete) {
					if (complete.dest !== event.dest) { // if this delite-display-complete is not for this view return
						return;
					}
					self.app.log(MODULE, F + "in on delite-display-complete complete.dest =[" + complete.dest + "]");
					onHandle.remove();

					var next = complete.dapp.nextView;
					self.app.log(MODULE, F + "delite-display-complete fired for [" + next.id + "] with parent [" +
						(complete.dapp.parentView ? complete.dapp.parentView.id : "") + "]");

					// Add call to handleAfterDeactivate and handleAfterActivate here!

					// Call _handleAfterDeactivateCalls if !isParent (not parent part of a nested view)
					if (!complete.dapp.isParent) {
						self.app.log(MODULE, F + "calling _handleAfterDeactivateCalls next id=[" + next.id +
							"] next.parentView.id=[" + next.parentView.id + "]");
						self._handleAfterDeactivateCalls(complete.dapp.currentSubViewArray,
							complete.dapp.nextLastSubChildMatch || next, complete.dapp.current, complete.viewData,
							complete.subIds);
					}

					if (complete.dapp.nextSubViewArray && next) {
						self.app.log(MODULE, F + "calling _handleAfterActivateCalls next id=[" + next.id +
							"] next.parentView.id=[" + next.parentView.id + "]");
						self._handleAfterActivateCalls(complete.dapp.nextSubViewArray, /*removeView*/ false,
							complete.dapp.currentLastSubChildMatch || complete.dapp.current, complete.viewData,
							complete.subIds);
					}
				});
				// TODO: deal with defaultParams?
				var params = event.params || "";

				if (view) {
					// set params to new value before returning
					if (params) {
						view.params = params;
					}
					resolveView(event, event.dest, view, event.dapp.parentView);
				} else if (event.dest && event.dest.id && this.app.views[event.dest.id]) {
					viewId = event.dest.id;
					this._createView(event, viewId, event.dest.viewName, params, event.dapp.parentView || this.app,
						event.dapp.lastViewPart, event.dapp.isParent,
						this.app.views[event.dest.id].type);
				} else {
					var type = null;
					if (event.dapp.parentView && event.dapp.parentView.views && event.dapp.parentView.views[viewId]) {
						type = event.dapp.parentView.views[viewId].type; // todo: this code for type seems questionable
					}
					this._createView(event, viewId, event.dest, params, event.dapp.parentView,
						event.dapp.lastViewPart, event.dapp.isParent, type);
				}
			},

			_handleShowFromDispContainer: function (event, dest) {
				//	var F = MODULE + "_handleShowFromDispContainer ";
				//	adjusted dest contains + - or , so need to handle specialcase dest
				//	console.log(MODULE, F + "handle special case by firing delite-display for now dest=[" +
				// dest + "]");
				var tempDisplaydeferred = new Deferred();
				on.emit(document, "delite-display", {
					// TODO is that really defaultView a good name? Shouldn't it be defaultTarget or defaultView_s_?
					dest: dest,
					displayDeferred: tempDisplaydeferred,
					bubbles: true,
					cancelable: true
				});
				tempDisplaydeferred.then(function (value) {
					// need to resolve the loadDeferred
					//	console.log(MODULE, F + "back from handle special case need to resolve deferred for =[" +
					//		value.dapp.id + "]");

					// resolve the loadDeferred here, do not need dapp stuff since we are not waiting on the
					// "delite-display-before" or "delite-display-complete" it was handled already by the emit
					// for "delite-display" above.
					event.loadDeferred.resolve({
						child: value.child
					});
				});
				return;

			},

			_createView: function (event, id, viewName, params, parentView, lastViewPart, isParent, type) {
				var F = MODULE + "_createView ";
				this.app.log(MODULE, F + "called for [" + id + "] with event.dapp.isParent=" +
					(event.dapp ? event.dapp.isParent : ""));
				var app = this.app;
				require([type ? type : "../../View"], function (View) {
					var params = {
						"app": app,
						"id": id,
						"viewName": viewName,
						"parentView": parentView,
						"parentNode": event.dapp.parentNode,
						"lastViewPart": lastViewPart,
						"isParent": isParent
					};
					dcl.mix(params, {
						"params": params
					});
					//		console.log("in load calling new View and start for id=" + id);
					new View(params).start().then(function (newView) {
						//			console.log("in load back from new View and start for id=" + id);
						var p = parentView || app.getParentViewFromViewId(id);
						var pView = app.getParentViewFromViewId(id);
						p.children[id] = newView; // todo: is this needed?
						pView.children[id] = newView; // todo: is this needed?
						/*
						var onAddedHandle = on(event.target, "delite-display-added", function (value) {
							// if this delite-display-complete is not for this view return
							if (!value.dapp || value.dapp.id !== newView.id) {
								console.log("in onAddedHandle NOT EQUAL value.id =" +
									(value.dapp ? value.dapp.id : "") + " newView.id=" + newView.id);
								return;
							}
							onAddedHandle.remove();
							newView.initialized = true;
							newView.init();
						});
					*/
						event.dapp.parentView = pView;
						event.dapp.parentNode = newView.parentNode;
						event.dapp.lastViewPart = lastViewPart;
						event.dapp.isParent = isParent;
						//		console.log("in before call to resolveView with isParent = "+isParent);
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
					this.app.log(MODULE, F + "in _handleBeforeDeactivateCalls in subs for v.id=[" + v.id + "]" +
						" v.beforeDeactivate isFunction?=[" + lang.isFunction(v.beforeDeactivate) + "] v._active=[" +
						v._active + "]");
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
				var p = this.app;
				for (var i = subs.length - 1; i >= 0; i--) {
					var v = subs[i];
					if (!v.beforeActivate) {
						v = this.app.getViewFromViewId(v.id);
					}
					if (!v.initialized) {
						v.initialized = true;
						v.init();
					}
					if (v && v.beforeActivate) {
						this.app.log(MODULE, F + "beforeActivate for v.id=[" + v.id + "]");
						v.beforeActivate(current, data);
					}
					if (p) {
						constraints.setSelectedChild(p, (v ? v.constraint : "center"), v, this.app);
					}
					p = v;
				}
			},

			_handleAfterDeactivateCalls: function (subs, next, current, data /*, subIds*/ ) {
				// summary:
				//		Call afterDeactivate for each of the current views which have been deactivated
				var F = MODULE + "_handleAfterDeactivateCalls ";
				this.app.log(MODULE, F + "afterDeactivate called for subs=", subs);
				if (subs) {
					//now we need to loop forwards thru subs calling afterDeactivate
					for (var i = 0; i < subs.length; i++) {
						var v = subs[i];
						this.app.log(MODULE, F + "afterDeactivate called with v.id=[" + v.id + "]");
						if (v && v.beforeDeactivate && v._active) {
							this.app.log(MODULE, F + "afterDeactivate for v.id=[" + v.id + "] setting _active false");
							v._active = false;
							v.afterDeactivate(next, data);
						}
					}
				}
			},

			_handleAfterActivateCalls: function (subs, removeView, current, data /*, subIds*/ ) {
				// summary:
				//		Call afterActivate for each of the next views which have been activated
				var F = MODULE + "_handleAfterActivateCalls ";
				//now we need to loop backwards thru subs calling beforeActivate (ok since next matches current)
				this.app.log(MODULE, F + "in _handleAfterActivateCalls with subs =", subs);
				var startInt = 0;
				if (removeView && subs.length > 1) {
					startInt = 1;
				}
				for (var i = startInt; i < subs.length; i++) {
					var v = subs[i];
					this.app.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] and v.afterActivate isFunction=" +
						lang.isFunction(v.afterActivate));
					if (v.afterActivate) {
						this.app.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] setting _active true");
						v._active = true;
						v.afterActivate(current, data);
					}
				}
			},

			_getNextSubViewArray: function (subIds, firstChildView, parentView) {
				// summary:
				//		Get next sub view array, this array will hold the views which are about to be transitioned to
				//
				// subIds: String
				//		the subids, the views are separated with a comma
				// firstChildView: Object
				//		the firstChildView view to be transitioned to.
				// parentView: Object
				//		the parent view used in place of firstChildView if firstChildView is not set.
				//
				// returns:
				//		Array of views which will be transitioned to during this transition
				var F = MODULE + "_getNextSubViewArray ";
				this.app.log(MODULE, F + "in _getNextSubViewArray with subIds =", subIds);
				var parts = [];
				var p = firstChildView || parentView;
				if (subIds) {
					parts = subIds.split(",");
				}
				var nextSubViewArray = [p];
				var prevViewId = firstChildView.id;
				//now we need to loop forwards thru subIds calling beforeActivate
				for (var i = 0; i < parts.length; i++) {
					prevViewId = prevViewId + "_" + parts[i];
					var v = p.children[prevViewId];
					if (v) {
						nextSubViewArray.push(v);
						p = v;
					}
				}
				nextSubViewArray.reverse();
				//	for (var i = 0; i <= nextSubViewArray.length - 1; i++) {
				//		console.log(F + "returning with nextSubViewArray with nextSubViewArray[i].id = [" +
				// 				nextSubViewArray[i].id + "]");
				//	}
				return nextSubViewArray;
			},

			_getCurrentSubViewArray: function (parentView, nextSubViewArray, removeView) {
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
				var F = MODULE + "_getCurrentSubViewArray ";
				this.app.log(MODULE, F + "in _getNextSubViewArray with parentView.id =", parentView.id);
				var currentSubViewArray = [];
				var constraint, type, hash;
				var p = parentView;
				var currentLastSubChildMatch = null;
				var nextLastSubChildMatch = null;

				for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
					if (nextSubViewArray[i].constraint) {
						constraint = nextSubViewArray[i].constraint;
					} else {
						var v = this.app.getViewFromViewId(nextSubViewArray[i].id);
						constraint = v.constraint;
					}

					//constraint = nextSubViewArray[i].constraint || nextSubViewArray[i].parentView.id;
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
							// setting this means the transition will be done to the child instead of the parentView
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
				//	for (var i = 0; i <= currentSubViewArray.length - 1; i++) {
				//		console.log(F + "returning  currentSubViewArray with currentSubViewArray[i].id = [" +
				// 			currentSubViewArray[i].id + "]");
				//	}
				var ret = {
					currentSubViewArray: currentSubViewArray,
					currentLastSubChildMatch: currentLastSubChildMatch,
					nextLastSubChildMatch: nextLastSubChildMatch
				};
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
				var parentView = event.parentView || view.parent || this.app;
				var viewId = view.id;
				this.app.log(MODULE, F + " app-unload-view called for [" + viewId + "]");

				if ((!parentView && !event.unloadApp) || !view || !viewId) {
					console.warn("unload-view event for view with no parentView or with an invalid view with view = ",
						view);
					return;
				}

				if (event.unloadApp) {
					// need to clear out selectedChildren
					parentView.selectedChildren = {};
				}

				if (parentView.selectedChildren[viewId]) {
					console.warn("unload-view event for a view which is still in use so it can not be unloaded for " +
						"view id = " + viewId + ".");
					return;
				}

				if (!parentView.children[viewId] && !event.unloadApp) {
					console.warn("unload-view event for a view which was not found in parentView.children[viewId] " +
						"for viewId = " + viewId + ".");
					return;
				}

				this.unloadChild(parentView, view);

				if (event.callback) {
					event.callback();
				}
			},

			unloadChild: function (parentView, viewToUnload) {
				// summary:
				//		Unload the view, and all of its child views recursively.
				// 		Destroy all children, destroy all widgets, destroy the domNode, remove the view from the
				// 		parentView.children, then destroy the view.
				//
				// parentView: Object
				//		parentView of this view.
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

				delete parentView.children[viewToUnload.id]; // remove it from the parentViews children
				if (viewToUnload.destroy) {
					this.app.log(MODULE, F + " calling destroy for the view [" + viewToUnload.id + "]");
					viewToUnload.destroy(); // call destroy for the view.
				}
				viewToUnload = null;
			}
		});
	});
