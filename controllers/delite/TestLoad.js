define(
	["require", "dcl/dcl", "dojo/on", "dojo/_base/lang", "dojo/_base/array", "dojo/when", "dojo/Deferred",
		"dojo/promise/all", "../../Controller",
		"../../utils/constraints", "dojo/dom-construct"
	],
	function (require, dcl, on, lang, array, when, Deferred, promiseAll, Controller, constraints, domConstruct) {
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
					lastViewId: event.lastViewId,
					id: newView.id,
					viewName: newView.viewName
				}
			});
		};

		return dcl(Controller, {
				/**
				 * Constructor that sets up and binds the events.
				 * @constructor
				 */
				constructor: function(app, events){
					this.events = {
						"app-init": this.init,
						"app-load": this.load,
						"app-unloadApp": this.unloadApp
					};
					this.func = lang.hitch(this, "_loadHandler");
					this.loadHandler = document.addEventListener("delite-display-load", this.func);
				},
			unloadApp: function () {
				//TODO: should also destroy this controller too!
				document.removeEventListener("delite-display-load", this.func, false);
				this.unbindAll();
			},

				/**
				 * Handle app-init event and return a promise for completion.
				 * The returned promise provides the root view that gets created.
				 */
				init: function(event){
					// created a deferred promise for the root view on app
					var deferred = new Deferred();

					// allow the template string and controller to be promises
					var rootPromise = promiseAll([event.templateString,event.controller]);

					when(rootPromise, lang.hitch(this, function(values) {
						// extract fields from the event
						var parent = event.parent;
						var tmpl   = values[0];
						var ctrl   = values[1];
						var type   = event.type;

						// create the view -- TODO: check if should use null instead of "^root" for root ID (like Ed did)
						var promise = this.createView(
							parent, this.app.id, null, {templateString: tmpl, controller: ctrl }, null, type);

						// when the view is created, record the view and start it
						when(promise, lang.hitch(this, function(newView){
							// change from standard Load controller to set the app's root view
							this.app.rootView = newView;

							// do the callback after starting the new view
							when(newView.start(), lang.hitch(this, function() {
								// initialize the root view
								var promise = this._initRootView(newView);

								// resolve the deferred
								when(promise, lang.hitch(this, function() {
									deferred.resolve(newView);
								}));
							}));
						}));
					}));

					// call the original event callback
					deferred.then(event.callback);
				//	if(event.loadDeferred){
				//		deferred.then(event.loadDeferred.resolve());
				//	}

					// return the rootView promise
					return deferred.promise;
				},

				/**
				 * This method is called by "init" to handle initialization of the root view after
				 * it is created.  This method may return a promise if initialization occurs
				 * asynchronously.  The "app-init" will not fully resolve its promise until the
				 * promise (if any) returned by this method is fulfilled.
				 *
				 * By default this method checks if a method by the same name exists on the app
				 * itself and calls it.
				 *
				 * @param [View] rootView The root view reference.
				 */
				_initRootView: function(rootView) {
					var deferred = null;
					var promise = null;

					// do nothing (override this if needed)
					if (this.app && this.app._initRootView && lang.isFunction(this.app._initRootView)) {
						deferred = new Deferred();
						promise = this.app._initRootView(rootView);
						when(promise, lang.hitch(this, function(value) {
							deferred.resolve(value);
						}));
						return deferred.promise;

					} else {
						return null;
					}
				},

				/**
				 * Handles the app-load event for loading one or more views.
				 */
				load: function(event){
					this.app.log("in idx/app/controllers/Load event.viewId="+event.viewId+" event =", event);
					console.log("TestLoad: load event.viewId="+event.viewId+" event =", event);
					var viewPaths = this.app._decodeViewPaths(event.viewId);
					var viewPath = null;
					console.log("TestLoad: load viewPaths.length="+viewPaths.length);
					if (!viewPaths || viewPaths.length == 0) return null;
					var queue = [];
					var index = 0;
					var item = null;
					var defaultViews = [];
					var transEvent = null;

					// create a deferred return value
					var deferred = new Deferred();
					// TODO: is this needed? initLoad used to be true for the first load from main for the defaultView
				/*
					if (event.initLoad) {
						transEvent = {
							viewId: event.viewId,
							opts: { params: event.params },
							forceTransitionNone: true
						};
						transEvent.callback = lang.hitch(this, function() {
							console.log("TestLoad: load in transEvent.callback calling deferred.resolve");
							deferred.resolve([]);
						});
						console.log("TestLoad: load calling app.emit app-transition");
						this.app.emit("app-transition", transEvent);
						return deferred.promise;
					}
				*/
					// iterate over the view array and setup queue items
					for (index = 0; index < viewPaths.length; index++) {
						// get the next view path
						viewPath = viewPaths[index];
						// create the queued item
						item = {
							viewPath: viewPath,
							queue: queue,
							defaultViews: defaultViews,
							origEvent: event,
							deferred: deferred
						};

						// add the event to the item
						item.event = lang.clone(event);
						item.event.viewId = viewPath.id;
						item.event.callback = null;
						//item.event.loadDeferred = null;
						console.log("TestLoad: load queueing up view id ["+viewPath.id+"]");

						// add the item to the queue
						queue.push(item);
					}

					// start processing the queue by setting off the first trigger
					if (queue.length > 0) {
						item = queue.shift();
						this._processQueueItem(item);
					}

					// return the promise for when we complete
					return deferred.promise;
				},

				/**
				 * Handles processing an item on the queue.
				 */
				_processQueueItem: function(item) {
					// load the view with the associated event
					var promise = this.loadView(item.event);
					console.log("TestLoad: _processQueueItem called with item.event.viewId="+item.event.viewId);

					// wait for the view to be loaded
					when(promise,
						lang.hitch(this, function(defaultViews) {
							var nextItem = null;
							if (defaultViews) {
								console.warn("ELC I DO NOT THINK I SHOULD HIT HERE BECAUSE WE GOT DEFAULT VIEWS UP FRONT");
								array.forEach(defaultViews, lang.hitch(this, function(view) {
									item.defaultViews.push(view);
								}));
							}
							// once loaded, check for a next item
							if (item.queue.length > 0) {
								nextItem = item.queue.shift();
								this._processQueueItem(nextItem);

							} else {
								if (item.origEvent && item.origEvent.callback) {
									item.origEvent.callback(item.defaultViews);
								}
							//	if (item.origEvent && item.origEvent.loadDeferred) {
							//		item.origEvent.loadDeferred.resolve(item.defaultViews);
							//	}
								// otherwise resolve the promise for this function
								item.deferred.resolve(item.defaultViews);
							}
						}),
						lang.hitch(this, function(msg) {
							item.deferred.reject(msg);
						})
					);
				},

				/**
				 * Determines the parent to which the newly created
				 * view should be added using the specified event.
				 * This is called from loadView()
				 */
				_getParent: function(loadEvent) {
					return loadEvent.parent || this.app;
				},

				/**
				 * Handles loading each view chain specified for load in app-load event.
				 */
				loadView: function(loadEvent){
					var parent = this._getParent(loadEvent);
					var viewPaths = this.app._decodeViewPaths(loadEvent.viewId);
					var viewPath = viewPaths[0]; // should only be one
					var parts = viewPath.lineage.concat([]);
					var childID = parts.shift();
					var params = loadEvent.params || "";

					var promise = this.loadChild(parent, childID, parts, params, loadEvent);
					return promise;
				},

				/**
				 * Load child and sub children views recursively.
				 * @param {Object} parent The parent of this view.
				 * @param {String} childID The view ID that needs to be loaded.
				 * @param {String[]} subIDs The array representing the posterity of the child.
				 * @param {Object} params The parameters to use.
				 * @param {Object} loadEvent The load event.
				 *
				 * @return {Promise} The promise for the default views array that need to be created.
				 */
				loadChild: function(parent, childID, subIDs, params, loadEvent){
					if(!parent){
						throw Error("No parent for Child '" + childID + "'.");
					}
					var parts = null, childViews = null;

					// NOTE: original Load controller has logic to handle null
					// childID, but it seems that this method never gets called
					// with a null child ID.
					if(!childID) return null;

					var loadChildDeferred = new Deferred();
					var createPromise;
					try{
						console.log("TestLoad: we create the child here: with childID=["+childID+"] and parent.id="+(parent?parent.id:""));
					//	createPromise = new Deferred();
						createPromise = this.createChild(parent, childID, subIDs.concat([]), params);
					//	setTimeout(function () { // try timeout to wait for afterAcivate...
					//		createPromise.resolve();
					//	}, 300);
					}catch(ex){
						console.warn("logTransitions:","","emit reject load exception for =["+childID+"]",ex);
						loadChildDeferred.reject("load child '"+childID+"' error.");
						return loadChildDeferred.promise;
					}
					when(createPromise, lang.hitch(this,
						function(child){
							var defaultViews = null;
							var childID = null;
							// if no subIds and current view has default view, load the default view.
							if(!subIDs || subIDs.length == 0) {
								if ((child !== createPromise) && (child.defaultView)) {
									defaultViews = this.app._decodeDefaultViews(child, true);
									this.app.log("logTransitions:","Load:loadChild"," found default views=[ "
												+ defaultViews + " ]");
									loadChildDeferred.resolve(defaultViews);
								}
								loadChildDeferred.resolve(null);
								return;
							}

							var parts = subIDs.concat([]);
							childID = parts.shift();

							var subPromise = this.loadChild(child, childID, parts, params, loadEvent);
							when(subPromise,
								function(defaultViews){
									loadChildDeferred.resolve(defaultViews);
								},
								function(){
									loadChildDeferred.reject("load child '"+childID+"' error.");
								}
							);
						}),
						function(){
							console.warn("loadChildDeferred.REJECT() for ["+childID+"] subIds=["+subIDs+"]");
							loadChildDeferred.reject("load child '"+childID+"' error.")
						}
					);
					return loadChildDeferred.promise; // dojo/Deferred.promise
				},

				/**
				 * Create a view instance if not already loaded by calling createView. This is typically a
				 * dojox/app/View.
				 *
				 * @param {Object} parent The parent of the view.
				 * @param {String} childID The viw ID that needs to be loaded.
				 * @param {String[]} subIDs the array of sub view IDs.
				 * @return If the view exists, return the view object.  Otherwise, create the
				 *         view and return a dojo.Deferred instance.
				 */
				createChild: function(parent, childID, subIDs, params){
					var id = this.app._formatChildViewIdentifier(parent, childID);
				//	var viewConfig = this.app._getViewConfig(parent, childID);
					var viewConfig = parent.views[childID];
					// check for possible default params if no params were provided
					if(!params && viewConfig && viewConfig.defaultParams) {
						params = viewConfig.defaultParams;
					}
					var view = parent.children[id];
					if(view){
						// set params to new value before returning
						if(params){
							view.params = params;
						}
						this.app.log("in app/controllers/Load createChild view is already loaded so return the loaded view with the new parms ",view);
						return view;
					}
					var deferred = new Deferred();
					// create and start child. return Deferred
					var promise = this.createView(parent, id, childID, null, params, viewConfig.type);
					when(promise, lang.hitch(this, function(newView){
						//var constraint = this.app._getViewConstraint(newView);
						var constraint = newView.constraint;
						if (constraint && constraint != newView.constraint) {
							lang.mixin(newView, {constraint: constraint});
						}
						parent.children[id] = newView;
						when(newView.start(), function(view){
							deferred.resolve(view);
						});
					}));
					return deferred.promise;
				},
			/* jshint maxcomplexity: 13 */
			_loadHandler: function (event) {
				var F = MODULE + "_loadHandler ";
				this.app.log(MODULE, F + "called for event.dest=[" + event.dest + "]");
				console.log(MODULE, F + "called for event.dest=[" + event.dest + "] this.app.id="+this.app.id);
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


				//TODO: this is questionable, how to handle .show calls directly with possible , and + in dest or defaultViews
				//check to see if this event has event.dapp if not it did not come from transition so try to pass
				// this one on to transition
				var dest = event.dest;
					// setup dest with the full view path, add in defaultViews if necessary
				if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
						dest = this.app.flatViewDefinitions[dest].viewPath;
				}
			//	if(!event.parent){
			//		dest = this.app.updateDestWithDefaultViews(dest);
			//		console.log(MODULE, F + "dest adjusted to have defaults dest=[" + dest + "]");
			//		event.dest = dest;
			//	}
				// it dest has multiple parts or is nested
				//if(!event.parent && (dest.indexOf("+") >= 0 || dest.indexOf("-") >= 0 || dest.indexOf(",") >= 0)){
				if(!event.parent && (dest.indexOf("+") >= 0 || dest.indexOf("-") >= 0)){
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
						var newView = document.getElementById(viewId)
						console.log(MODULE, F + "back from handle special case need to resolve deferred for =[" + viewId + "]");

						event.loadDeferred.resolve({
						//	child: newView.domNode || newView,
							child: null,
							parent: event.parent,
							dapp: {
								nextView: newView//,
						//		parentView: parentView,
						//		isParent: event.isParent,
						//		lastView: event.lastView,
						//		lastViewId: event.lastViewId,
						//		id: newView.id,
						//		viewName: newView.viewName
							}
						});
					});
					//event.loadDeferred
				//	var opts = lang.mixin({
				//			bubbles: true,
				//			cancelable: true,
				//			dest: view
				//		},
				//		params ? params : {
				//			transition: "slide",
				//			direction: "end"
				//		});
				//	on.emit(document, "delite-display", opts);
					return;
				}

				// TODO: deal with defaultParams?
				var params = event.params || "";

				var viewDef = this.app.getViewDefFromEvent(event);
				var constraint = viewDef ? viewDef.constraint : null;

				if (!event.parent) {
					if (!viewDef) { // problem, we dont have this view
						event.loadDeferred.resolve({
							child: typeof event.dest === "string" ? document.getElementById(event.dest) : event.dest
						});
						return;
					}
					event.parent = event.target;
					event.dapp = {lastViewId : viewId};
					event.isParent = false;
					this.app.log(MODULE, F + "called without event.parent for [" + event.dest + "] set it to [" +
						event.parent.id + "]");
				} else {
					this.app.log(MODULE, F + "called with event.parent [" + event.parent.id + "]");
				}
				var view = null;
				if (event.parent && event.parent.children) {
					view = event.parent.children[viewId];
				}

				console.log(MODULE, F + " before loadDeferred.then event.dest=[" + event.dest + "] self.app.id="+self.app.id);

				/* jshint maxcomplexity: 16 */
				event.loadDeferred.then(function (value) {
					//TODO: ELC need to review this and see if fullViewTarget and other params are really needed, and how best to
					// get the parent
					console.log(MODULE, F + " insied loadDeferred.then event.dest=[" + event.dest + "] self.app.id="+self.app.id);
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
						parent = value.parent;
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

						if (!subIds && nextView.defaultView) {
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
						if (!value.dapp.isParent && (!value.dapp.lastViewId || value.dapp.lastViewId === value.dapp.id)) {
						//	if (current && current._active) {
							if (currentSubViewArray) {
								self.app.log(MODULE, F + "calling _handleBeforeDeactivateCalls nextView id=[",
									(nextView ? nextView.id : ""), "], nextView.parent.id=[" + (nextView && nextView.parent ? nextView.parent.id : "") +
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
						//TODO: check on isParent, some are in dapp, some are not, check to see if added outside of dapp....
						if (!complete.dapp.isParent && next) {
							self.app.log(MODULE, F + "calling _handleAfterDeactivateCalls next id=[" + next.id +
								"] next.parent.id=[" + next.parent.id + "]");
							self._handleAfterDeactivateCalls(complete.currentSubViewArray,
								complete.nextLastSubChildMatch || next, complete.current, data,
								complete.subIds);
						}

					//ELC should not have to check defaultView here, it is now added to dest up front added back for show case
					//	if (complete.nextSubViewArray && next && !next.defaultView) { // do not call activate if we have a default view to process
						if (complete.nextSubViewArray && next) {
							self.app.log(MODULE, F + "calling _handleAfterActivateCalls next id=[" + next.id +
								"] next.parent.id=[" + next.parent.id + "]");
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

				/**
				 * Create a dojox/app/View instance. Can be overridden to create different type of views.
				 *
				 * @param {Object} parent The parnet of the view.
				 * @param {String} id The ID of the child.
				 * @param {String} name The name to associate with the view.
				 * @param {String} mixin The module name to mixin.
				 * @param {Object} params The parameters for the view.
				 * @param {String} type The MID of the View.  If not provided then "dojox/app/View"
				 *
				 * @return {Promise} The promise that will resolve to the view.
				 */
				//_createView: function (event, id, viewName, params, parent, type) {
				createView: function(parent, id, viewName, mixin, params, type){
					var deferred = new Deferred();
					var app = this.app;
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
							newView.init(); // this worked with init controller, not without it!
							deferred.resolve(newView);
						});
					});

/*
					var defaultViewType = this.app._getDefaultViewType(parent, name);

					require([type?type:defaultViewType], lang.hitch(this, function(View){
						var newView = new View(lang.mixin({
							"app": app,
							"id": id,
							"name": name,
							"parent": parent
						}, { "params": params }, mixin));
						deferred.resolve(newView);
					}));
*/
					return deferred;
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
				var F = MODULE + "_getNextSubViewArray ";
				console.log(F,"called with subIds with subIds = ["+subIds+"]");
				console.log(F+"called with subIds with next.id = ["+(next ? next.id: '')+"]");
				console.log(F+"called with subIds with parent.id = ["+(parent ? parent.id: '')+"]");
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
				for (var i = 0; i <= nextSubViewArray.length - 1; i++) {
					console.log(F+"returning with nextSubViewArray with nextSubViewArray[i].id = ["+nextSubViewArray[i].id+"]");
				}
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
				var F = MODULE + "_getCurrentSubViewArray ";
				var currentSubViewArray = [];
				var constraint, type, hash;
				var p = parent;
				//	this.currentLastSubChildMatch = null;
				//	this.currentLastSubChildMatch = null;
				//	this.nextLastSubChildMatch = null;
				var currentLastSubChildMatch = null;
				var nextLastSubChildMatch = null;
				console.log(F+"called with parent.id = ["+parent.id+"]");

				for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
					//constraint = nextSubViewArray[i].constraint || "center";
					console.log(F+"called nextSubViewArray includes  nextSubViewArray[i].id= ["+nextSubViewArray[i].id+"]");
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

/*
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
*/
/*
			_createView: function (event, id, viewName, params, parent, type) {
				var F = MODULE + "_createView ";
				this.app.log(MODULE, F + "called for [" + id + "]");
				console.log(MODULE, F + "called for [" + id + "] with event.isParent="+event.isParent);
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
						newView.init(); // this worked with init controller, not without it!
						resolveView(event, id, newView, pView);
					});
				});
			},
*/
//			_handleBeforeDeactivateCalls: function (subs, next, current, /*parent,*/ //data
				/*,removeView, doResize,
				 subIds, currentSubNames*/
/*			) {
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

			_handleBeforeActivateCalls: function (subs, current, data ) {
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

			_handleAfterDeactivateCalls: function (subs, next, current, data ) {
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

//			_handleAfterActivateCalls: function (subs, removeView, current, data ) {
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
				var F = MODULE + "_getNextSubViewArray ";
				console.log(F,"called with subIds with subIds = ["+subIds+"]");
				console.log(F+"called with subIds with next.id = ["+(next ? next.id: '')+"]");
				console.log(F+"called with subIds with parent.id = ["+(parent ? parent.id: '')+"]");
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
				for (var i = 0; i <= nextSubViewArray.length - 1; i++) {
					console.log(F+"returning with nextSubViewArray with nextSubViewArray[i].id = ["+nextSubViewArray[i].id+"]");
				}
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
				var F = MODULE + "_getCurrentSubViewArray ";
				var currentSubViewArray = [];
				var constraint, type, hash;
				var p = parent;
				//	this.currentLastSubChildMatch = null;
				//	this.currentLastSubChildMatch = null;
				//	this.nextLastSubChildMatch = null;
				var currentLastSubChildMatch = null;
				var nextLastSubChildMatch = null;
				console.log(F+"called with parent.id = ["+parent.id+"]");

				for (var i = nextSubViewArray.length - 1; i >= 0; i--) {
					//constraint = nextSubViewArray[i].constraint || "center";
					console.log(F+"called nextSubViewArray includes  nextSubViewArray[i].id= ["+nextSubViewArray[i].id+"]");
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
/*					//TODO: should not be using domConstruct
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
//		});
//	});
