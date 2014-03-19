define(["dcl/dcl", "dojo/on", "dojo/when", "dojo/Deferred", "dojo/promise/all", "dojo/_base/lang",
	"dojo/_base/array", "../../Controller"],
	function (dcl, on, when, Deferred, all, lang, array, Controller) {

		var MODULE = "controllers/delite/TestTransition:";
		var transit;
		var LOGKEY = "TestTransition:";
		var eventID = 0;

		return dcl(Controller, {
			constructor: function (app) {
				this.app = app;
				this.func = lang.hitch(this, "transition");
				document.addEventListener("delite-display", this.func, false);
				this.app.on("app-unloadApp", lang.hitch(this, "unloadApp"));
			},

			unloadApp: function () {
				//TODO: Look into using own and destroyable to handle destroy
				document.removeEventListener("delite-display", this.func, false);
				this.unbindAll();
			},


				proceeding: false,

				waitingQueue:[],

				/**
				 * Response to dojox/app "app-transition" event.
				 */
				transition: function(event){
					var F = MODULE+":transition";
					console.log("TestTransition: TRANSITION TO: " + event.dest);
					var dest = event.dest;
					// setup dest with the full view path, add in defaultViews if necessary
					if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
						dest = this.app.flatViewDefinitions[dest].viewPath;
					}
					dest = this.app.updateDestWithDefaultViews(dest);
					console.log("TestTransition: dest adjusted to have defaults dest=[" + dest + "]");
					event.dest = dest;


					event.viewId = event.dest;
					this.app.log(LOGKEY,F,"New Transition event.viewId=["+event.viewId+"]");
					this.app.log(F,"event.viewId=["+event.viewId+"]","event.opts=",event.opts);

					var viewPaths = this.app._decodeViewPaths(event.viewId);
					var viewPath, newEvent, index;
					var queue = [];
					var item = null;
					console.log("TestTransition: VIEW PATH COUNT: " + viewPaths.length);
					if(viewPaths.length > 0) {
						for (index = 0; index < viewPaths.length; index++) {
							viewPath = viewPaths[index];
							console.log("TestTransition: VIEW PATH: " + viewPath.id);
							console.log("TestTransition: VIEW PATH REMOVE: " + viewPath.remove);
							array.forEach(viewPath.lineage, lang.hitch(this, function(ancestor) {
								console.log("TestTransition: LINEAGE: " + ancestor);
							}));
							newEvent = Object.create(event);
							newEvent.eventID = eventID++;
							newEvent.viewId = viewPath.id;
							newEvent._removeView = viewPath.remove;
							newEvent._doResize = (index<viewPaths.length-1)?false: true;
						//	newEvent.displayDeferred= event.displayDeferred;
							queue.push({
								viewPath: viewPath,
								event: newEvent,
								queue: queue,
								origEvent: event
							});
						}
					} else {
						queue.push({
							event: event,
							queue: queue,
							origEvent: event
						});
						event._doResize = true; // at the end of the last transition call resize
						event._removeView = false;
					}

					// now that the triggers are setup, set off the first
					item = queue.shift();
					this._processQueueItem(item);
				},

				/**
				 * Loads an item from the queue, possibly updates the queue with new
				 * default views, performs the required transitions, and then triggers
				 * the next item on the queue (if any) to be processed.
				 *
				 * @param item The item to be processed (already removed from queue).
				 */
				_processQueueItem: function(item) {
					var loadEvent = { };
					var transEvent = item.event;
					var viewPath = item.viewPath;
					var params = transEvent.params ? transEvent.params : transEvent.opts ? transEvent.opts.params : null;
					loadEvent.viewId = transEvent.viewId;
					console.log("TestTransition: in _processQueueItem with loadEvent.viewId= " + loadEvent.viewId);
					loadEvent.params = params;
					loadEvent.forceTransitionNone = transEvent.forceTransitionNone;
					loadEvent.eventID = eventID++;
					// setup the callback
					loadEvent.callback = lang.hitch(this, function(defaultViewPaths) {
					//loadEvent.loadDeferred = new Deferred();
					//loadEvent.loadDeferred.then(lang.hitch(this, function(defaultViewPaths) {
						console.log("TestTransition: Back from LoadEvent: No DEFAULT VIEW PATHS: " + defaultViewPaths.length);
						var templateEvent = null;
						var newEvent = null;
						var defaultViewPath = null;
						var defaultViewEvents = [];
						var queue = item.queue;
						var index = 0;
						// check if we have default views to transition to
						if (defaultViewPaths && defaultViewPaths.length>0) {
							// we have default views so setup a transition event for each
							console.warn("ELC I DO NOT THINK I SHOULD HIT HERE BECAUSE WE GOT DEFAULT VIEWS UP FRONT");
							templateEvent = {
								defaultView: true,
								forceTransitionNone: loadEvent.forceTransitionNone,
								opts: { params: params }
							};
							for (index = 0; index < defaultViewPaths.length; index++) {
								defaultViewPath = defaultViewPaths[index];
								newEvent = Object.create(templateEvent);
								newEvent.viewId = this.app._encodeViewPaths([defaultViewPath]);
								newEvent.eventID = eventID++;
								newEvent._removeView = defaultViewPath.remove;
								newEvent._doResize = (queue.length==0 && index==defaultViewPaths.length-1)?true:false,
								defaultViewEvents.push(newEvent);
							}

							// push new items on to the front of the queue
							for (index = defaultViewEvents.length-1; index >= 0; index--) {
								queue.unshift({
									viewPath: defaultViewPaths[index],
									event: defaultViewEvents[index],
									queue: queue
								});
							}
							// process the next item WITHOUT doing the transition for this
							// item.  At least one (if not multiple default views) will handle
							// doing the transition for this item since it is handled recursively
							// from the root of the view lineage
							if (queue.length > 0) {
								// delay doing any transition or layout since the default
								// views should trigger that since they are down-stream
								this._processQueueItem(queue.shift());
							} else {
								if (item.origEvent && item.origEvent.callback) {
									item.origEvent.callback();
								}
							//	if (item.origEvent && item.origEvent.loadDeferred) {
							//		item.origEvent.loadDeferred();
							//	}
							}
						} else {
							// perform the transition and layout now
							console.log("TestTransition: calling _doTransition here with viewPath.id="+viewPath.id);
							var transComplete = true;
							var transComplete = this._doTransition(viewPath,
																   transEvent.opts,
																   transEvent.displayDeferred,
																   params,
																{}, //transEvent.opts.data,
																   this.app,
																   transEvent._removeView,
																   transEvent._doResize,
																   transEvent.forceTransitionNone);

							// wait for the transition to complete before processing the next item
							// TODO: look into this since we should be able to optimize so we avoid
							// waiting for off-screen transitions (not sure if already handled)
							when(transComplete, lang.hitch(this, function(){
								var nextItem = null;
								if (queue.length > 0) {
									nextItem = queue.shift();
									this._processQueueItem(nextItem);
								} else {
									if (item.origEvent && item.origEvent.callback) {
										item.origEvent.callback();
									}
								//	if (item.origEvent && item.origEvent.loadDeferred) {
								//		item.origEvent.loadDeferred();
								//	}
								}
							}));
						}
					});

					// emit the event
					console.log("TestTransition: this will emit the app-load loadevent for loadEvent.viewId=["+loadEvent.viewId+"]");
					this.app.emit("app-load", loadEvent);
				// as a test set timer and fire loadEvent.callback
				//	setTimeout(function () { // try timeout to wait for afterAcivate...
				//		loadEvent.callback("");
				//	}, 300);
				},

			/**
			 * Transitions from the currently visible view to the defined view.
			 * It should determine what would be the best transition unless
			 * an override in opts tells it to use a specific transitioning methodology
			 * the transitionTo is a string in the form of [view1,view2].
			 *
			 * @param {Object} transitionTo Transition to view path (as parsed from app._decodeViewPaths());
			 * @param {Object} opts Transition options.
			 * @param {Object} params The parameters
			 * @param {Object} data data object that will be passed on activate & de-activate methods of the view
			 * @param {Object} parent The view's parent.
			 * @param {Boolean} removeView Remove view instead of transition to it.
			 * @param {Boolean} forceTransitionNone Force the transition type to be none (used for initial default view)
			 * @param {Boolean} nested Whether the mthod is called from the transitioning of a parent view.
			 *
			 * @return {Promise} Transit dojo/promise/all object.
			 */
			_doTransition: function(transitionTo, opts, displayDeferred, params, data, parent, removeView, doResize, forceTransitionNone, nested){
				var F = MODULE+":_doTransition";

				if(!parent){
					throw Error("view parent not found in transition.");
				}

				this.app.log(F+" transitionTo=[",(transitionTo?transitionTo.id:null),"], removeView=[",removeView,"] parent.name=[",parent.name,"], opts=",opts);
				console.log("TestTransition: transitionTo=[",(transitionTo?transitionTo.id:null),"], removeView=[",removeView,"] parent.name=[",parent.name,"], opts=",opts);

				var parts, toId, subIDs, next;
				parts = transitionTo.lineage.concat([]); // clone the array

				toId = parts.shift();
				subIDs = this.app._encodeViewLineage(parts);

				var childID = this.app._formatChildViewIdentifier(parent, toId);
				console.log("TestTransition: transitionTo=[",(transitionTo?transitionTo.id:null),"], " +
					"THIS IS WHERE Transition was doing the stuff with handleBeforeActivate layout etc. I guess this would call .show");
				console.log("TestTransition: childID=["+childID+"] subIDs=["+subIDs+"]");
				var opts = lang.mixin({
						bubbles: true,
						cancelable: true,
						dest: transitionTo.id,
						doResize: doResize,
						displayDeferred: displayDeferred,
						transition: "slide",
						direction: "end"
					});
//				transitionTo.dest = transitionTo.id;
				this._displayHandler(opts);
/*
				// next is loaded and ready for transition
				next = parent.children[childID];
				if(!next){
					if(removeView){
						this.app.log(F+" called with removeView true, but that view is not available to remove");
						return;	// trying to remove a view which is not showing
					}
					throw Error("child view must be loaded before transition.");
				}

				var nextSubViewArray = [next || parent];
				if(subIDs){
					nextSubViewArray = this._getNextSubViewArray(parts, next, parent);
				}

				var context = {};
				var current = dConstraints.getSelectedChild(parent, next.constraint);
				var currentSubViewArray = this._getCurrentSubViewArray(parent, nextSubViewArray, removeView, context);

				var currentSubNames = this._getCurrentSubViewNamesArray(currentSubViewArray);

				// set params on next view.
				next.params = this._getParamsForView(next.name, params);

				if(removeView){
					if(next !== current){ // nothing to remove
						this.app.log(F+" called with removeView true, but that view is not available to remove");
						return;	// trying to remove a view which is not showing
					}
					this.app.log(LOGKEY,F,"Transition Remove current From=["+currentSubNames+"]");
					// if next == current we will set next to null and remove the view with out a replacement
					next = null;
				}

				// get the list of nextSubNames, this is next.name followed by the subIDs
				var nextSubNames = "";
				if(next){
					nextSubNames = next.name;
					if(subIDs){
						nextSubNames = nextSubNames+","+subIDs;
					}
				}


				if((nextSubNames == (""+currentSubNames)) && (next == current)){ // new test to see if current matches next
					this.app.log(LOGKEY,F,"Transition current and next DO MATCH From=["+currentSubNames+"] TO=["+nextSubNames+"]");
					this._handleMatchingViews(nextSubViewArray, next, current, parent, data, removeView, doResize, subIDs, currentSubNames, toId, forceTransitionNone, opts, context);

				}else{
					this.app.log(LOGKEY,F,"Transition current and next DO NOT MATCH From=["+currentSubNames+"] TO=["+nextSubNames+"]");
					//When clicking fast, history module will cache the transition request que
					//and prevent the transition conflicts.
					//Originally when we conduct transition, selectedChild will not be the
					//view we want to start transition. For example, during transition 1 -> 2
					//if user click button to transition to 3 and then transition to 1. After
					//1->2 completes, it will perform transition 2 -> 3 and 2 -> 1 because
					//selectedChild is always point to 2 during 1 -> 2 transition and transition
					//will record 2->3 and 2->1 right after the button is clicked.

					//assume next is already loaded so that this.set(...) will not return
					//a promise object. this.set(...) will handles the this.selectedChild,
					//activate or deactivate views and refresh layout.

					//necessary, to avoid a flash when the layout sets display before resize
					if(!removeView && next){
						var nextLastSubChild = context.nextLastSubChildMatch || next;
						var startHiding = false; // only hide views which will transition in
						for(var i = nextSubViewArray.length-1; i >= 0; i--){
							var v = nextSubViewArray[i];
							if(startHiding || v.id == nextLastSubChild.id){
								startHiding = true;
								if(!v._needsResize && v.domNode){
									this.app.log(LOGKEY,F," setting domStyle visibility hidden for v.id=["+v.id+"], display=["+v.domNode.style.display+"], visibility=["+v.domNode.style.visibility+"]");
									this._setViewVisible(v, false);
								}
							}
						}
					}

					if(current && current._active){
						this._handleBeforeDeactivateCalls(currentSubViewArray, context.nextLastSubChildMatch || next, current, data, subIDs);
					}
					if(next){
						this.app.log(F+" calling _handleBeforeActivateCalls next name=[",next.name,"], parent.name=[",next.parent.name,"]");
						this._handleBeforeActivateCalls(nextSubViewArray, context.currentLastSubChildMatch || current, data, subIDs);
					}
					if(!removeView){
						var nextLastSubChild = context.nextLastSubChildMatch || next;
						var trans = this._getTransition(nextLastSubChild, parent, toId, opts, forceTransitionNone)
						this.app.log(F+" calling _handleLayoutAndResizeCalls trans="+trans);
						this._handleLayoutAndResizeCalls(nextSubViewArray, removeView, doResize, subIDs, forceTransitionNone, trans, context);
					}else{
						// for removeView need to set visible before transition do it here
						for(var i = 0; i < nextSubViewArray.length; i++){
							var v = nextSubViewArray[i];
							this.app.log(LOGKEY,F,"setting visibility visible for v.id=["+v.id+"]");
							if(v.domNode){
								this.app.log(LOGKEY,F,"  setting domStyle for removeView visibility visible for v.id=["+v.id+"], display=["+v.domNode.style.display+"]");
								this._setViewVisible(v, true);
							}
						}
					}
					var result = true;

					// context.currentLastSubChildMatch holds the view to transition from
					if(transit && (!nested || context.currentLastSubChildMatch != null) && context.currentLastSubChildMatch !== next){
						// css3 transit has the check for IE so it will not try to do it on ie, so we do not need to check it here.
						// We skip in we are transitioning to a nested view from a parent view and that nested view
						// did not have any current
						result = this._handleTransit(next, parent, context.currentLastSubChildMatch, opts, toId, removeView, forceTransitionNone, doResize, context);
					}
					dWhen(result, dLang.hitch(this, function(){
						if(next){
							this.app.log(F+" back from transit for next ="+next.name);
						}
						if(removeView){
							var nextLastSubChild = context.nextLastSubChildMatch || next;
							var trans = this._getTransition(nextLastSubChild, parent, toId, opts, forceTransitionNone);
							this._handleLayoutAndResizeCalls(nextSubViewArray, removeView, doResize, subIDs, forceTransitionNone, trans, context);
						}

						// Add call to handleAfterDeactivate and handleAfterActivate here!
						this._handleAfterDeactivateCalls(currentSubViewArray, context.nextLastSubChildMatch || next, current, data, subIDs);
						this._handleAfterActivateCalls(nextSubViewArray, removeView, context.currentLastSubChildMatch || current, data, subIDs);
					}));
					return result; // dojo/promise/all
				}
				*/
			},

			_getParentNode: function (subEvent, parentView) {
				var F = MODULE + "_getParentNode ";
				//TODO: Need to distinguish between parentView and parentDomNode!!
				//TODO: parentSelector if set points to the parentDomNode, if it is not set use the parentView
				//TODO: to determine the domNode
				// parentView is the view, the view.containerNode is the container
				// TODO make sure one can in the config of the view specify a different container
				// "myview": { container: "a query string" }
				// and when specified use the query string here to get the container instead of the only child
				// TODO: fix this to get the parent properly THIS IS TEST CODE HERE
				// TODO: TO MUCH MAGIC< THIS is setting subEvent.parent, if that is needed make it explicit with the return value.
			//	subEvent.parent = parentView;

				// TODO: fix this to get the constraint properly THIS IS TEST CODE HERE
				//	var constraint = parent.views[subEvent.dest].constraint || "main";
				//var constraint = constraints.getConstraintForViewTarget(viewTarget, app);
				//var p = document.getElementById(constraint); // || document.body;
				//	var viewDefinition = self.app.getViewDefFromViewName(subEvent.dest);
				//	var parentSelector = viewDefinition ? viewDefinition.parentSelector : null;
				//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
				//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
			//	var parentSelector2 = this.app.getViewDefFromViewName(subEvent.dest).parentSelector;
				var viewDef = this.app.getViewDefFromEvent(subEvent);
				var parentSelector = viewDef ? viewDef.parentSelector : null;
				var p = this.app.domNode.querySelector(parentSelector);
				this.app.log(MODULE, F + "compare p and subEvent.parent p = [" +
					(p ? p.id : "") + "]");

				this.app.log(MODULE, F + "after _displayParents parentView = [" +
					(parentView.containerNode ? parentView.containerNode.id : "") + "]");
				if (!p) {
					p = parentView.containerNode ? parentView.containerNode : parentView.children[0];
				}
				if (!p) {
					p = parentView.domNode.containerNode ? parentView.domNode.containerNode :
						parentView.domNode.children[0];
				}
				return p;
			},

			_displayHandlerNEWONE: function (event) {
				var F = MODULE + "_displayHandler ";
				this.app.log(MODULE, F + "called with event.dest=[" + event.dest + "]");
				console.log("TestTransition: called with event.dest=[" + event.dest + "]");
				// TODO be more generic here instead of picking a few props
				var dest = event.dest;

				var promise = this.showView(event);
				console.log("TestTransiton: _displayHandler called with event.dest="+event.dest);

				// wait for the view to be loaded
			//	when(promise,

				// setup dest with the full view path, add in defaultViews if necessary
			//	if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
			//		dest = this.app.flatViewDefinitions[dest].viewPath;
			//	}
			//	dest = this.app.updateDestWithDefaultViews(dest);
		/*
				console.log("TestTransition: dest adjusted to have defaults dest=[" + dest + "]");
				this._displayViews({
					dest: dest,
					viewData: event.viewData,
					doResize:  event.doResize,
					reverse: event.reverse,
					transition: event.transition,
					displayDeferred: event.displayDeferred
					//dest: event.dest
					// other props
				});
		*/
			},

			/**
			 * Handles loading each view chain specified for load in app-load event.
			 */
			showView: function(showEvent){
			//	var parent = this._getParent(showEvent); // set to event.parent or app
				var parent = showEvent.parent || this.app; // set to event.parent or app
				var viewPaths = this.app._decodeViewPaths(showEvent.dest);
				var viewPath = viewPaths[0]; // should only be one
				var parts = viewPath.lineage.concat([]);
				var childID = parts.shift();
				var params = showEvent.params || "";

				var promise = this.showChild(parent, childID, parts, params, showEvent);
				return promise;
			},


			/**
			 * show child and sub children views recursively.
			 * @param {Object} parent The parent of this view.
			 * @param {String} childID The view ID that needs to be shown.
			 * @param {String[]} subIDs The array representing the posterity of the child.
			 * @param {Object} params The parameters to use.
			 * @param {Object} showEvent The show event.
			 *
			 * @return {Promise} The promise for the default views array that need to be created.
			 */
			showChild: function(parent, childID, subIDs, params, showEvent){
				var F = MODULE + "showChild ";
				if(!parent){
					throw Error("No parent for Child '" + childID + "'.");
				}
				var parts = null, childViews = null;

				var p = parent;
				if(!childID) return null;

				var showChildDeferred = new Deferred();
				var showPromise;
				try{
					console.log("TestTransition: we create the child here: with childID=["+childID+"] and parent.id="+(parent?parent.id:""));
				//	showPromise = new Deferred();
				//	showPromise = this.showChild(parent, childID, subIDs.concat([]), params);
					this.app.log(MODULE, F + "before p.show with childID = [" + childID +
						"] with p.id=[" + p.id + "]");
					showPromise = p.containerNode.show(childID, showEvent).then(function (value) {
						this.app.log(MODULE, F + "back from parent.containerNode.show for subEvent.dest[" +
							subEvent.dest + "] subEvent.parent.id[" + subEvent.parent.id + "]");
					//ELC this seems wrong, assuming not isParent after first one...
					//	event.isParent = false;
						event.isParent = false;
						deferred.resolve(value);
						var nextId = value.next ? value.next.id : value.dapp ? value.dapp.nextView.id : "";
						if (event.displayDeferred && event.doResize && value.dapp.lastView && !value.dapp.isParent &&
							nextId === event.lastViewId) {
							event.displayDeferred.resolve();
						}
						return value;
					});

				//	setTimeout(function () { // try timeout to wait for afterAcivate...
				//		showPromise.resolve();
				//	}, 300);
				}catch(ex){
					console.warn("logTransitions:","","emit reject show exception for =["+childID+"]",ex);
					showChildDeferred.reject("show child '"+childID+"' error.");
					return showChildDeferred.promise;
				}
				when(showPromise, lang.hitch(this,
					function(child){
						var defaultViews = null;
						var childID = null;
						// if no subIds and current view has default view, show the default view.
						if(!subIDs || subIDs.length == 0) {
							if ((child !== showPromise) && (child.defaultView)) {
								defaultViews = this.app._decodeDefaultViews(child, true);
								this.app.log("logTransitions:","TestTransition:showChild"," found default views=[ "
											+ defaultViews + " ]");
								showChildDeferred.resolve(defaultViews);
							}
							showChildDeferred.resolve(null);
							return;
						}

						var parts = subIDs.concat([]);
						childID = parts.shift();

						var subPromise = this.showChild(child, childID, parts, params, showEvent);
						when(subPromise,
							function(defaultViews){
								showChildDeferred.resolve(defaultViews);
							},
							function(){
								showChildDeferred.reject("load child '"+childID+"' error.");
							}
						);
					}),
					function(){
						console.warn("showChildDeferred.REJECT() for ["+childID+"] subIds=["+subIDs+"]");
						showChildDeferred.reject("load child '"+childID+"' error.")
					}
				);
				return showChildDeferred.promise; // dojo/Deferred.promise
			},


			_displayHandler: function (event) {
				var F = MODULE + "_displayHandler ";
				this.app.log(MODULE, F + "called with event.dest=[" + event.dest + "]");
				console.log("TestTransition: called with event.dest=[" + event.dest + "]");
				// TODO be more generic here instead of picking a few props
				var dest = event.dest;
				// setup dest with the full view path, add in defaultViews if necessary
				if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
					dest = this.app.flatViewDefinitions[dest].viewPath;
				}
				dest = this.app.updateDestWithDefaultViews(dest);
				console.log("TestTransition: dest adjusted to have defaults dest=[" + dest + "]");
				this._displayViews({
					dest: dest,
					viewData: event.viewData,
					doResize:  event.doResize,
					reverse: event.reverse,
					transition: event.transition,
					displayDeferred: event.displayDeferred
					//dest: event.dest
					// other props
				});
			},
		
			_displayViews: function (event, skipParents) {
				var F = MODULE + "_displayViews ";
				this.app.log(MODULE, F + "called with event.dest=[" + event.dest + "] and event.viewData=[" +
					event.viewData + "]");
				event.lastView = true;
				var views = event.dest && event.dest.split("+");
				if (views) {
					var allDeferred = [];
					for (var i = 0; i < views.length; i++) {
						if (i === views.length - 1) {
							event.lastView = true;
						//	event.lastViewId = event.dest.replace(/,/g,"_");
							event.lastViewId = views[i].replace(/,/g,"_");
						} else {
							event.lastView = false;
						}
						this.app.log(MODULE, F + "calling _displayView with [" + views[i] + "] event.lastView = [" +
							event.lastView + "]");
						this._displayView(views[i], event, true, false, skipParents);
					}
				} else {
					// this is the root
					this._displayView(null, event, true, false, skipParents);
				}
			},
			_displayView: function (viewTarget, event, displayDefaultView, isParent, skipParents) {
				var F = MODULE + "_displayView ";
				this.app.log(MODULE, F + "called for viewTarget [" + viewTarget + "] with event.dest = [" +
					event.dest + "] ");
				var deferred = new Deferred(),
					subEvent, loadDeferred;
				//var parent;
				event.isParent = isParent;
				if (displayDefaultView) {
			//		event.dapp ? event.dapp.fullViewTarget = viewTarget : event.dapp = {
			//			fullViewTarget: viewTarget
			//		};
				}
				var _self = this;
				// wait for parents to be displayed first
				when(skipParents || this._displayParents(viewTarget, event, isParent, displayDefaultView),
					function (value) {
					//	if (_self.destroyed) { //TODO: this removeEventListener was not working! can remove this!!!
					//		return;
					//	}

						_self.app.log(MODULE, F + "after _displayParents value.dapp.nextView.id=[" +
							value.dapp.nextView.id + "]");
						subEvent = Object.create(event);
						subEvent.dest = viewTarget.split(",").pop();
						subEvent.lastView = value.dapp.lastView;
						_self.app.log(MODULE, F + "subEvent.dest = [" + subEvent.dest + "]");
						/*
						//TODO: Need to distinguish between parentView and parentDomNode!!
						//TODO: parentSelector if set points to the parentDomNode, if it is not set use the parentView
						//TODO: to determine the domNode
						// parent is the view, the view.containerNode is the container
						// TODO make sure one can in the config of the view specify a different container
						// "myview": { container: "a query string" }
						// and when specified use the query string here to get the container instead of the only child
						// TODO: fix this to get the parent properly THIS IS TEST CODE HERE
						subEvent.parent = parent = value.dapp.nextView;

						// TODO: fix this to get the constraint properly THIS IS TEST CODE HERE
						//	var constraint = parent.views[subEvent.dest].constraint || "main";
						//var constraint = constraints.getConstraintForViewTarget(viewTarget, app);
						//var p = document.getElementById(constraint); // || document.body;
					//	var viewDefinition = self.app.getViewDefFromViewName(subEvent.dest);
					//	var parentSelector = viewDefinition ? viewDefinition.parentSelector : null;
					//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
					//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
						var parentSelector = _self.app.getViewDefFromViewName(subEvent.dest).parentSelector;
						var p = _self.app.domNode.querySelector(parentSelector);
						_self.app.log(MODULE, F + "compare p and subEvent.parent p = [" +
							(p ? p.id : "") + "]");

						_self.app.log(MODULE, F + "after _displayParents subEvent.parent = [" +
							(subEvent.parent.containerNode ? subEvent.parent.containerNode.id : "") + "]");
						if(!p){
							p = subEvent.parent.containerNode ? subEvent.parent.containerNode :
								subEvent.parent.children[0];
						}
					*/
						//TODO: HEY HAVING PROBLEM WITH _getParentNode, setting parentView into subEvent.parent....
						//TODO:  simple1/Test and ./nested1/Test work with subEvent.parent = value.dapp.nextView
						//TODO: but FAIL: sample2Suite2 dapp simple2 test initial layout
						//TODO:  and ./simple2/Test works with subEvent.parent = p, but ./nested1/Test fails.
						var p = _self._getParentNode(subEvent, value.dapp.nextView);
						subEvent.parent = value.dapp.nextView;
						//	loadDeferred = parent.containerNode.show(subEvent.dest, subEvent).then(function (value) {
						if (!p || !p.show) {
							console.warn("either do not have a parent or parent does not have show() function. parent=",p);
							if (event.displayDeferred && subEvent.lastView) {
								event.displayDeferred.resolve();
							}
							return;
						}
						_self.app.log(MODULE, F + "before p.show with subEvent.dest = [" + subEvent.dest +
							"] with p.id=[" + p.id + "]");
						loadDeferred = p.show(subEvent.dest, subEvent).then(function (value) {
							_self.app.log(MODULE, F + "back from parent.containerNode.show for subEvent.dest[" +
								subEvent.dest + "] subEvent.parent.id[" + subEvent.parent.id + "]");
						//ELC this seems wrong, assuming not isParent after first one...
						//	event.isParent = false;
							event.isParent = false;
							deferred.resolve(value);
							var nextId = value.next ? value.next.id : value.dapp ? value.dapp.nextView.id : "";
							if (event.displayDeferred && event.doResize && value.dapp.lastView && !value.dapp.isParent &&
								nextId === event.lastViewId) {
								event.displayDeferred.resolve();
							}
							return value;
						});
						// if we are at the init view, check if we have defaultView children to display in addition
						//TODO: should be able to remove this
						if (displayDefaultView) {
							_self.app.log(MODULE, F + "after .show displayDefaultView");
							loadDeferred.then(function (value) {
							// ELC Should not need to process .defaultView here, added to dest
							/*
								if (value.dapp.nextView.defaultView) {
									// TODO: here we re-use the same transition as was initially setup
									// do we want to use it for defaultView as well?
									var newEvent = Object.create(subEvent);
									newEvent.dest = value.dapp.nextView.defaultView;
									_self.app.log(MODULE, F + "calling displayViews for displayDefaultView " +
										"newEvent.dest=[" + newEvent.dest + "]");
									_self._displayViews(newEvent, value);
								} else {
							//		if (event.displayDeferred && value.dapp.lastView) {
							//			event.displayDeferred.resolve();
							//		}
								}
							*/
								return value;
							});
						}
					});
				return deferred.promise;
			},
			_displayParents: function (viewTarget, ev, displayDefaultView) {
				var F = MODULE + "_displayParents ";
				this.app.log(MODULE, F + "called for viewTarget=[" + viewTarget + "]");
				// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
				// TODO: we might improve that later to avoid users have to specify this?
				var parts = viewTarget ? viewTarget.split(",") : "";
				if (parts && parts.length > 1) {
					//	parts.shift();
					parts.pop(); // process the parent first
					ev.isParent = true;
					var dest = parts.join(",");
					this.app.log(MODULE, F + "calling return _displayView with ev, displayDefaultView," +
						" true with dest=[", dest + "]");
					return this._displayView(dest, ev, displayDefaultView, true);
				} else {
					//	ev.isParent = false;
				}
				this.app.log(MODULE, F + " calling return dapp this.app");
				return {
					dapp: {
						nextView: this.app,
						lastView: ev.lastView,
						dest: ev.dest
					},
					isParent: ev.isParent
				};
			}
		});
	});
