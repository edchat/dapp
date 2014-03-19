define(
	["require", "dcl/dcl", "dojo/on", "dojo/_base/lang", "dojo/Deferred", "../../Controller",
		"../../utils/constraints", "dojo/dom-construct", "dojo/aspect"
	],
	function (require, dcl, on, lang, Deferred, Controller, constraints, domConstruct, aspect) {
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
			//	parent: event.dapp && event.dapp.parentNode ? event.dapp.parentNode : newView.domNode.parentNode,
				dapp: {
					nextView: newView,
					parentView: parentView,
					parentNode: event.dapp && event.dapp.parentNode ? event.dapp.parentNode : newView.domNode.parentNode,
					isParent: event.isParent,
					lastView: event.dapp ? event.dapp.lastView : true,
					lastViewId: event.dapp ? event.dapp.lastViewId : newView.id,
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
				console.log(MODULE, F + "called for event.dest=[" + event.dest + "] this.app.id="+this.app.id);
				var self = this;
				event.preventDefault();
				// load the actual view

				var viewId = this.app.flatViewDefinitions[event.dest] ?
					this.app.flatViewDefinitions[event.dest].viewId : event.dest;
				this.app.log(MODULE, F + "called for viewId=[" + viewId + "]");


				//TODO: this is questionable, how to handle .show calls directly with possible , and + in dest or defaultViews
				//check to see if this event has event.dapp if not it did not come from transition so try to pass
				// this one on to transition
				var dest = event.dest;
				if(!event.dapp || !event.dapp.parentView){
					//This must be a direct call from .show, need to setup event.dapp with parentView etc.
					event.dapp = {};
					event.dapp.parentNode = event.target;
					if(dest.indexOf("_") >= 0){ // is the dest really a viewId?
						var testDest = this.app.getViewDestFromViewid(dest);
					//	event.dest = testDest;
						dest = testDest;
					}
					event.dapp.parentView = this.app.getParentViewFromViewName(dest, event.target);
					event.dapp.lastViewId = viewId;
					event.dapp.isParent = false;

					// setup dest with the full view path, add in defaultViews if necessary
					if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
							dest = this.app.flatViewDefinitions[dest].viewPath;
					}
					if(!event.parent){
						dest = this.app.updateDestWithDefaultViews(dest);
						console.log(MODULE, F + "dest adjusted to have defaults dest=[" + dest + "]");
						event.dest = dest;
					}
					// it dest has multiple parts or is nested
					if(!event.parent && (dest.indexOf("+") >= 0 || dest.indexOf("-") >= 0 || dest.indexOf(",") >= 0)){
					//if(dest.indexOf("+") >= 0 || dest.indexOf("-") >= 0){
					//TODO: this is questionable, how to handle .show calls directly with possible , and + in dest or defaultViews
						console.log(MODULE, F + "adjusted dest contains + - or , so need to handle special case dest=[" + dest + "]");
						console.log(MODULE, F + "handle special case by firing delite-display for now dest=[" + dest + "]");
						var tempDisplaydeferred = new Deferred();
						on.emit(document, "delite-display", {
							// TODO is that really defaultView a good name? Shouldn't it be defaultTarget or defaultView_s_?
							dest: dest,
							displayDeferred: tempDisplaydeferred,
							bubbles: true,
							cancelable: true
						});
						tempDisplaydeferred.then(function (value) {
							// need to resolve the loadDeferred (too late?)
							var newView = document.getElementById(viewId);
							console.log(MODULE, F + "back from handle special case need to resolve deferred for =[" + viewId + "]");

							event.loadDeferred.resolve({
							//	child: newView.domNode || newView,
								child: value.child,
								dapp: {
									parentView: event.dapp.parentView, // todo: is this needed?
									parentNode: event.dapp.parentNode, // todo: is this needed?
									nextView: newView//,
							//		isParent: event.isParent, // todo: is this needed?
							//		lastView: event.lastView,
							//		lastViewId: event.lastViewId,
							//		id: newView.id,
							//		viewName: newView.viewName
								}
							});
						});
						return;
					}
				}
			//	event.parent = event.parent || event.target;

				if(!event.dapp.parentNode){
					event.dapp.parentNode = event.target;
				}
				// TODO: deal with defaultParams?
				var params = event.params || "";

				var viewDef = this.app.getViewDefFromEvent(event);
				var constraint = viewDef ? viewDef.constraint : null;

				// TODO: why doing this again, it may not be needed..?
			/*
				if (!event.dapp.parentView) {
					if (!viewDef) { // problem, we dont have this view
						event.loadDeferred.resolve({
							child: typeof event.dest === "string" ? document.getElementById(event.dest) : event.dest
						});
						return;
					}
					event.dapp = {lastViewId : viewId};
					event.dapp.parentNode = event.target;
					event.dapp.parentView = this.app.getParentViewFromViewName(dest, event.target);
					event.dapp.isParent = false;
					this.app.log(MODULE, F + "called without event.parent for [" + event.dest + "] set it to [" +
						event.dapp.parentView.id + "]");
				} else {
					this.app.log(MODULE, F + "called with event.dapp.parentView [" + event.dapp.parentView.id + "]");
				}
			*/
				var view = null;
				if (event.dapp.parentView && event.dapp.parentView.children) {
					view = event.dapp.parentView.children[viewId];
				}


				console.log(MODULE, F + " before loadDeferred.then event.dest=[" + event.dest + "] self.app.id="+self.app.id);
			/*
				var onAddedDclHandle = dcl.around(event.target.performDisplay, function(sup){
				    return function(child, value){
						console.log("inside onAddedDclHandle for child.id="+(child?child.id:"no child"));
				    	sub.call(child, value);
						onAddedDclHandle.remove();
				    };
				  })

				var onbeforeDisplayHandle = on(event.target, "delite-display-beforeDisplay", function (complete) {
				//var onHandle = aspect.after(event.target, "performDisplay", function (child, complete) {
					//	on(event.target, "delite-display-complete", function (complete) {
					if(complete.dest !== event.dest){ // if this delite-display-complete is not for this view return
						console.log("in on delite-display-beforeDisplay complete.dest NOT EQUAL =["+(complete ? complete.dest: "")+ "] event.dest="+event.dest);
						return;
					}
					console.log("in on delite-display-beforeDisplay complete.dest IS EQUAL =["+(complete ? complete.dest: "")+ "] event.dest="+event.dest);
					onbeforeDisplayHandle.remove();
				})
			 */
				/* jshint maxcomplexity: 16 */
				//event.loadDeferred.then(function (value) {
				//var onAddedHandle = on(event.target, "delite-display-added", function (value) {
				//var onAddedHandle = aspect.before(event.target, "performDisplay", function (child, value) {
				//var onAddedHandle = dcl.before(event.target.performDisplay, function (child, value) {
				//	if(!value || value.dest !== event.dest){ // if this delite-display-complete is not for this view return
				//		console.log("in aspect.before NOT EQUAL value.dest ="+(value ? value.dest: "")+ " event.dest="+event.dest);
				//		return;
				//	}
				//	onAddedHandle.remove();
				var onbeforeDisplayHandle = on(event.target, "delite-display-beforeDisplay", function (value) {
					//TODO: ELC need to review this and see if fullViewTarget and other params are really needed, and how best to
					// get the parent
					if(value.dest !== event.dest){ // if this delite-display-complete is not for this view return
						console.log("in on delite-display-beforeDisplay complete.dest NOT EQUAL =["+(value ? value.dest: "")+ "] event.dest="+event.dest);
						return;
					}
					console.log("in on delite-display-beforeDisplay complete.dest IS EQUAL =["+(value ? value.dest: "")+ "] event.dest="+event.dest);
					onbeforeDisplayHandle.remove();

				//	console.log(MODULE, F + " insied loadDeferred.then event.dest=[" + event.dest + "] self.app.id="+self.app.id);
					var parts, toId, subIds, next, parent, toId2;
					if (value.dapp.id) { // need to call the before Activate/Deactivate for the view(s)
						self.app.log(MODULE, F + "in loadDeferred.then if value.dapp.id for viewId=[" + viewId + "]");
						toId = value.dapp.id;
						subIds = null;
						// TODO: this needs to change, value.dapp.viewName is actually the id, so change it from name
						// TODO: to id and add a call in app to get the viewPath from the id, and call that instead.
						var viewDef = self.app.flatViewDefinitions[(value.dapp.viewName || value.dapp.id)];
						if(!viewDef){
							console.error("View is not defined in the config for viewId: "+viewId);
							//throw new Error("View is not defined in the config for viewId: "+viewId);
						}
						var viewTarget = viewDef.viewPath;
					//	parent = value.parent;
						parent = value.dapp.parentView; //todo: should this be parentNode?
					//	var parentView = value.dapp.parentView;

						if (viewTarget) {
							parts = viewTarget.split(",");
							toId = parts.shift();
							subIds = parts.join(",");
						//ELC should not have to check for defaultView here, it is now added to dest up front added back for show case

						} else {
							// If parent.defaultView is like "main,main", we also need to split it and set the value to
							// toId and subIds. Or cannot get the next view by "parent.children[parent.id + '_' + toId]"
							parts = parentView.defaultView.split(",");
							toId = parts.shift();
							subIds = parts.join(",");

						}
						self.app.log(MODULE, F + "in loadDeferred.then if value.dapp.id with subIds =[" + subIds + "]");

						var parentView = self.app.getParentViewFromViewId(toId.replace(/,/g,"_"));
						// next is loaded and ready for transition
						//	next = parent.children[parent.id + '_' + toId];

					//	next = parent.children[toId];
						next = parentView.domNode.children[toId];
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
						//TODO: check on next vs. nextView, maybe parent vs. parentView too in the sections below
					//ELC should not need to check .defaultView here, added to dest up front added back for show case

						//TODO: question about defaultView here...
						if (!subIds && (!value.dapp.lastViewId || value.dapp.lastViewId === value.dapp.id)
							&& nextView.defaultView) {
							subIds = nextView.defaultView;
							//TODO: why was I doing this????????
						//	constraints.setSelectedChild(parentView, (nextView.constraint || "center"), nextView, self.app);
						//	return; // do not call beforeActivate for the parent with defaultView wait for last child
						}

						if (!value.dapp.isParent && (!value.dapp.lastViewId || value.dapp.lastViewId === value.dapp.id)) {
							var nextSubViewArray = [nextView || parentView];
							//	var nextSubViewArray = [parentView || self.app];
							if (subIds) {
								//nextSubViewArray = self._getNextSubViewArray(subIds, next, parent);
								nextSubViewArray = self._getNextSubViewArray(subIds, nextView, parentView);
							}

							var current = constraints.getSelectedChild(parentView, (nextView && nextView.constraint ?
								nextView.constraint : next && next.constraint ? next.constraint : "center"));
							var testVisibleChild = nextView.domNode.parentNode ? nextView.domNode.parentNode._visibleChild : null;
							self.app.log(MODULE, F + "got current from call to constraints with parentView.id=["+
								parentView.id, "], got current.id=[" + (current ? current.id : "") +"]");
							//TODO: remove temp test
							if(testVisibleChild && current && testVisibleChild !== current.domNode){
								console.warn("testVisibleChild !== current testVisibleChild.id="+testVisibleChild.id);
							}
							//var current = constraints.getSelectedChild(parent, next.parentSelector || "center");
							var currentSubViewRet = self._getCurrentSubViewArray(parentView, nextSubViewArray,
								/*removeView,*/
								false);
							var currentSubViewArray = currentSubViewRet.currentSubViewArray;
							self.currentLastSubChildMatch = currentSubViewRet.currentLastSubChildMatch;
							self.nextLastSubChildMatch = currentSubViewRet.nextLastSubChildMatch;
							//var currentSubNames = self._getCurrentSubViewNamesArray(currentSubViewArray);

							var data = event.viewData;
						}
						var retval = {};
						retval.dapp = value.dapp;
						if (!value.dapp.isParent && (!value.dapp.lastViewId || value.dapp.lastViewId === value.dapp.id)) {
						//	if (current && current._active) {
							if (currentSubViewArray) {
								self.app.log(MODULE, F + "calling _handleBeforeDeactivateCalls nextView id=[",
									(nextView ? nextView.id : ""), "], nextView.parent.id=[" + (nextView &&
										nextView.parent ? nextView.parent.id : "") + "] currentSubViewArray =",
									currentSubViewArray);
								self._handleBeforeDeactivateCalls(currentSubViewArray, self.nextLastSubChildMatch ||
									nextView, current, data, subIds);
							}else if(current){ // TODO: remove this TEMP
								self.app.log(MODULE, F + "NOT calling _handleBeforeDeactivateCalls current._active=[",
									current._active, "], current.id=[" + current.id);
							}
							retval.dapp.nextSubViewArray = nextSubViewArray;
							retval.dapp.currentSubViewArray = currentSubViewArray;
							retval.dapp.nextLastSubChildMatch = self.nextLastSubChildMatch;
							retval.dapp.current = current;
							retval.dapp.next = next;
							retval.nextView = nextView;
							retval.subIds = subIds;
						}
					//ELC should not have to check for defaultView here, added to dest up front. added back for show case
					//	if (!value.isParent && nextView && !nextView.defaultView) { // do not call activate if we have a default view to process
						if (!value.dapp.isParent && nextView && nextSubViewArray) { // do not call activate if we have a default view to process
							//console.log(F + " calling _handleBeforeActivateCalls next id=[", next.id, "],
							//        parent.id=[", next.parent.id, "]");
							self._handleBeforeActivateCalls(nextSubViewArray, self.currentLastSubChildMatch || current,
								data, subIds);
						//ELC move this into _handleBeforeActivateCalls
						//	constraints.setSelectedChild(parentView, (nextView ? nextView.constraint : next ? next.constraint
						//		: "center"), nextView ? nextView :  next, self.app);
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
					return retval;
				});
/*
				console.log("adding onAddedaspectHandle for event.dest="+(event.dest?event.dest:"no dest"));
				var onAddedaspectHandle = aspect.around(event.target, "performDisplay", function(original){
				    return function(child, value){
						console.log("inside onAddedaspectHandle before Original call for child.id="+(child?child.id:"no child"));
						onAddedaspectHandle.remove();
				      // doing something before the original call
				      var deferred = original(child, value);
				      // doing something after the original call
			//			console.log("inside onAddedaspectHandle after Original call for child.id="+(child?child.id:"no child"));
			//			if(!value || value.dest !== event.dest){ // if this delite-display-complete is not for this view return
			//				console.log("in aspect.around NOT EQUAL value.dest ="+(value ? value.dest: "")+ " event.dest="+event.dest);
			//				return;
			//			}
				      return deferred;
				    }
				  });
*/
				// once transition we will be ready to call afterActivate
				var onHandle = on(event.target, "delite-display-complete", function (complete) {
				//var onHandle = aspect.after(event.target, "performDisplay", function (child, complete) {
					//	on(event.target, "delite-display-complete", function (complete) {
					if(complete.dest !== event.dest){ // if this delite-display-complete is not for this view return
						console.log("in on delite-display-complete complete.dest NOT EQUAL =["+(complete ? complete.dest: "")+ "] event.dest="+event.dest);
						return;
					}
					console.log("in on delite-display-complete complete.dest IS EQUAL =["+(complete ? complete.dest: "")+ "] event.dest="+event.dest);
					onHandle.remove();
					if (complete.dapp) {
						//var next = complete.next;
						var next = complete.dapp.next || complete.dapp.nextView;
						self.app.log(MODULE, F + "delite-display-complete fired for [" + next.id + "] with parent [" +
							(complete.dapp.parentView ? complete.dapp.parentView.id : "") + "]");
						// TODO works for StackView but what about containers with several views visible same time
						//complete.dapp.parentNode._activeView = complete.dapp.parentView;
						complete.dapp.parentView._activeView = complete.dapp.parentView;

						// Add call to handleAfterDeactivate and handleAfterActivate here!
						var data = complete.viewData;
						if (!next.beforeActivate) { // is next an app view or domNode?
							next = self.app.getViewFromViewId(next.id);
						}
						//TODO: check on isParent, some are in dapp, some are not, check to see if added outside of dapp....
						if (!complete.dapp.isParent && next) {
							self.app.log(MODULE, F + "calling _handleAfterDeactivateCalls next id=[" + next.id +
								"] next.parentView.id=[" + next.parentView.id + "]");
							self._handleAfterDeactivateCalls(complete.dapp.currentSubViewArray,
								complete.dapp.nextLastSubChildMatch || next, complete.dapp.current, data,
								complete.subIds);
						}

					//ELC should not have to check defaultView here, it is now added to dest up front added back for show case
					//	if (complete.nextSubViewArray && next && !next.defaultView) { // do not call activate if we have a default view to process
						if (complete.dapp.nextSubViewArray && next) {
							self.app.log(MODULE, F + "calling _handleAfterActivateCalls next id=[" + next.id +
								"] next.parentView.id=[" + next.parentView.id + "]");
							self._handleAfterActivateCalls(complete.dapp.nextSubViewArray, /*removeView*/ false,
								complete.dapp.currentLastSubChildMatch || complete.dapp.current, data, complete.subIds);
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
					this._createView(event, viewId, event.dest.viewName, params, event.parentView || this.app,
						this.app.views[event.dest.id].type);
				} else {
					var type = null;
					if (event.dapp.parentView && event.dapp.parentView.views && event.dapp.parentView.views[viewId]) {
						type = event.dapp.parentView.views[viewId].type;
					}
					this._createView(event, viewId, event.dest, params, event.dapp.parentView, type);
				}
			},

			_createView: function (event, id, viewName, params, parentView, type) {
				var F = MODULE + "_createView ";
				this.app.log(MODULE, F + "called for [" + id + "]");
				console.log(MODULE, F + "called for [" + id + "] with event.dapp.isParent="+
					(event.dapp ? event.dapp.isParent : ''));
				var app = this.app;
				//var id = parent.id + '_' + id;
				// TODO: in my prototype View names & ids are the same, so view names must be unique
				require([type ? type : "../../View"], function (View) {
					var params = {
						"app": app,
						"id": id,
						"viewName": viewName,
						"parentView": parentView,
						"parentNode" : event.dapp.parentNode
					};
					dcl.mix(params, {
						"params": params
					});
					console.log("in load calling new View and start for id="+id);
					new View(params).start().then(function (newView) {
						console.log("in load back from new View and start for id="+id);
						var p = parentView || app.getParentViewFromViewId(id);
						var pView = app.getParentViewFromViewId(id);
						p.children[id] = newView; // todo: is this needed?
						pView.children[id] = newView; // todo: is this needed?
						//newView.init(); // todo: this worked with init controller, not without it! Move later and let displayContainer place the node
						var onAddedHandle = on(event.target, "delite-display-added", function (value) {
							if(!value.dapp || value.dapp.id !== newView.id){ // if this delite-display-complete is not for this view return
								console.log("in onAddedHandle NOT EQUAL value.id ="+(value.dapp ? value.dapp.id: "")+ " newView.id="+newView.id);
								return;
							}
							onAddedHandle.remove();
							newView.init();
						});
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
					" v.beforeDeactivate isFunction?=["+lang.isFunction(v.beforeDeactivate)+"] v._active=["+v._active+"]");
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
					if (v && v.beforeActivate) {
						this.app.log(MODULE, F + "beforeActivate for v.id=[" + v.id + "]");
						console.log(MODULE, F + "beforeActivate for v.id=[" + v.id + "]");
						v.beforeActivate(current, data);
					}
					if(p){
						constraints.setSelectedChild(p, (v ? v.constraint : "center"), v, this.app);
					}
					p = v;
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
				this.app.log(MODULE, F + "afterDeactivate called for subs=", subs);
			//	if (current && current._active) {
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
					this.app.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] and v.afterActivate isFunction="+
						lang.isFunction(v.afterActivate));
					if (v.afterActivate) {
						this.app.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] setting _active true");
						console.log(MODULE, F + "afterActivate for v.id=[" + v.id + "] setting _active true");
						v._active = true;
						v.afterActivate(current, data);
						//TODO: is this needed????
						if(v.domNode){
							v.domNode._active = true;
						}
					}
				}
			},

			_getNextSubViewArray: function (subIds, next, parentView) {
				// summary:
				//		Get next sub view array, this array will hold the views which are about to be transitioned to
				//
				// subIds: String
				//		the subids, the views are separated with a comma
				// next: Object
				//		the next view to be transitioned to.
				// parentView: Object
				//		the parent view used in place of next if next is not set.
				//
				// returns:
				//		Array of views which will be transitioned to during this transition
				var F = MODULE + "_getNextSubViewArray ";
				console.log(F,"called with subIds with subIds = ["+subIds+"]");
				console.log(F+"called with subIds with next.id = ["+(next ? next.id: '')+"]");
				console.log(F+"called with subIds with parentView.id = ["+(parentView ? parentView.id: '')+"]");
				var parts = [];
				var p = next || parentView;
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
				for (var i = 0; i <= nextSubViewArray.length - 1; i++) {
					console.log(F+"returning with nextSubViewArray with nextSubViewArray[i].id = ["+nextSubViewArray[i].id+"]");
				}
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
				var currentSubViewArray = [];
				var constraint, type, hash;
				var p = parentView;
				var currentLastSubChildMatch = null;
				var nextLastSubChildMatch = null;
				console.log(F+"called with parentView.id = ["+parentView.id+"]");

				for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
					//constraint = nextSubViewArray[i].constraint || "center";
					console.log(F+"called nextSubViewArray includes  nextSubViewArray[i].id= ["+nextSubViewArray[i].id+"]");
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
				console.log(F+"returning  currentLastSubChildMatch.id = ["+(currentLastSubChildMatch ? currentLastSubChildMatch.id : '') +"]");
				console.log(F+"returning  nextLastSubChildMatch.id = ["+nextLastSubChildMatch.id+"]");
				for (var i = 0; i <= currentSubViewArray.length - 1; i++) {
					console.log(F+"returning  currentSubViewArray with currentSubViewArray[i].id = ["+currentSubViewArray[i].id+"]");
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
						"view id = " + viewId + "'.");
					return;
				}

				if (!parentView.children[viewId] && !event.unloadApp) {
					console.warn("unload-view event for a view which was not found in parentView.children[viewId] for " +
						"viewId = " + viewId + "'.");
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
