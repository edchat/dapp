define(["require", "dcl/dcl", "dojo/on", "dojo/Deferred", "dojo/_base/lang",
		"../../utils/hash", "../../Controller"
	],
	function (require, dcl, on, Deferred, lang, hash, Controller) {
		return dcl(Controller, {
		// _currentPosition:     Integer
		//              Persistent variable which indicates the current position/index in the history
		//              (so as to be able to figure out whether the popState event was triggerd by
		//              a backward or forward action).
		_currentPosition: 0,

		// currentState: Object
		//              Current state
		currentState: {},

			constructor: function () {
				this.docEvents = {
					"dapp-finishedTransition": this.finishedTransition
				};
				this.bind(window, "popstate", lang.hitch(this, this.onPopState));

				this.app.autoHashUrl = true;
			},

			finishedTransition: function(evt){
				// summary:
				//		Response to dojox/app "startTransition" event.
				//
				// example:
				//		Use "dojox/mobile/TransitionEvent" to trigger "startTransition" event, and this function will response the event. For example:
				//		|	var transOpts = {
				//		|		title:"List",
				//		|		target:"items,list",
				//		|		url: "#items,list",
				//		|		params: {"param1":"p1value"}
				//		|	};
				//		|	new TransitionEvent(domNode, transOpts, e).dispatch();
				//
				// evt: Object
				//		Transition options parameter
				// if not doing a popState and autoHashUrl is true then setup the currentHash and call pushState with it.
				if(evt && evt.doingPopState){ // when doingPopState do not pushState.
					console.log("in History finishedTransition evt.opts.doingPopState = true, so return");
					return;
				}
				var currentHash = window.location.hash;
				var currentView = hash.getTarget(currentHash, this.app.defaultView);
				var currentParams =  hash.getParams(currentHash);
				var _detail = Object.create(evt.detail);
				//var _detail = {};
				_detail.target = _detail.title = currentView;
				_detail.dest = _detail.title = currentView;
				//_detail.target = evt.dest;
				_detail.url = currentHash;
				_detail.params = currentParams;
				_detail.id = this._currentPosition;
				//_detail.dest = evt.dest;

				// Create initial state if necessary
				if(history.length == 1){
					history.pushState(_detail, _detail.href, currentHash);
				}

				// Update the current state
				_detail.bwdTransition = _detail.transition;
				lang.mixin(this.currentState, _detail);
				history.replaceState(this.currentState, this.currentState.href, currentHash);

				// Create a new "current state" history entry
				this._currentPosition += 1;
				//evt.detail = evt.detail || {};
				evt.detail.id = this._currentPosition;
			//	evt.detail.transition = evt.transition;
			//	evt.detail.target = _detail.target;
			//	evt.detail.dest = _detail.dest;

			//	var newHash = evt.detail.url || "#" + evt.dest;
				var newHash = "#"+hash.getAllSelectedChildrenHash(this.app, "");

				if(evt.detail.params){
					newHash = hash.buildWithParams(newHash, evt.detail.params);
				}

			//	this.app.hideUrlHash = true;
				if(this.app.hideUrlHash) {
					evt.detail.dest = newHash;
					newHash = "";
				}

				evt.detail.fwdTransition = evt.detail.transition;
				history.pushState(evt.detail, evt.detail.href, newHash);
				this.currentState = lang.clone(evt.detail);

				// Finally: Publish pushState topic
				//topic.publish("/app/history/pushState", evt.detail.target);
			},

			onPopState: function(evt){
				// summary:
				//		Response to dojox/app "popstate" event.
				//
				// evt: Object
				//		Transition options parameter

				// Clean browser's cache and refresh the current page will trigger popState event,
				// but in this situation the application has not started and throws an error.
				// So we need to check application status, if application not STARTED, do nothing.
				if((this.app.status !== this.app.lifecycle.STARTED) || !evt.state ){
					return;
				}

				var state = evt.state;
				if(!state){
					if(window.location.hash){
						state = {
							target: hash.getTarget(location.hash),
							url: location.hash,
							params: hash.getParams(location.hash)
						}
					}else{
						state = {
							target: this.app.defaultView
						};
					}
				}

				// Get direction of navigation and update _currentPosition accordingly
				var backward = evt.state.id < this._currentPosition;
				backward ? this._currentPosition -= 1 : this._currentPosition += 1;

				// Publish popState topic and transition to the target view. Important: Use correct transition.
				// Reverse transitionDir only if the user navigates backwards.
			//	var opts = lang.mixin({reverse: backward ? true : false}, evt.state);
			//	opts.transition = backward ? opts.bwdTransition : opts.fwdTransition;
			//	this.app.emit("app-transition", {
			//		viewId: evt.state.target,
			//		opts: opts
			//	});
				var opts = {
					bubbles: true,
					cancelable: true,
					doingPopState: true,
					dest: evt.state.dest,
					reverse: backward ? true : false
				};
				dcl.mix(opts,
					{
						transition: "slide",
						direction: "end"
					});
				on.emit(document, "dapp-display", opts);

				//topic.publish("/app/history/popState", evt.state.target);
			},

			setupUrlHash: function(evt){
				// summary:
				//		Response to dojox/app "app-finishedTransition" event.
				//
				// evt: Object
				//		transition options parameter

				// if not doing a popState and autoHashUrl is true then setup the currentHash and call pushState with it.
				if(evt && evt.doingPopState){ // when doingPopState do not pushState.
					console.log("in History setupUrlHash evt.opts.doingPopState = true, so return");
					return;
				}
				if(this.app.autoHashUrl){
					var currentHash = "#"+hash.getAllSelectedChildrenHash(this.app, "");

					if(this.app.currentParams){
						currentHash = hash.buildWithParams(currentHash, this.app.currentParams);
					}

					// push states to history list
					console.log("in History setupUrlHash calling pushState with currentHash=[",currentHash,"]");
					history.pushState(this.app.currentDetail, this.app.currentDetailHref, currentHash);
				}
			},

			onPopState2: function(evt){
				// summary:
				//		Response to dojox/app "popstate" event.
				//
				// evt: Object
				//		transition options parameter

				// Clean browser's cache and refresh the current page will trigger popState event,
				// but in this situation the application has not started and throws an error.
				// so we need to check application status, if application not STARTED, do nothing.
				if(this.app.status !== this.app.lifecycle.STARTED){
					return;
				}

				var state = evt.state;
				if(!state){
					if(window.location.hash){
						state = {
							target: hash.getTarget(location.hash),
							url: location.hash,
							params: hash.getParams(location.hash)
						}
					}else{
						state = {
							target: this.app.defaultView
						};
					}
				}

				// TODO explain what is the purpose of this, _sim is never set in dojox/app
				if(evt._sim){
					history.replaceState(state, state.title, state.href);
				}

				this.app.log("in History onPopState calling emit app-transition with state.target=[",state.target,"]");
				// transition to the target view
			//	this.app.emit("app-transition", {
			//		viewId: state.target,
			//		opts: lang.mixin({reverse: true, doingPopState: true}, evt.detail, {"params": state.params})
			//	});
				var opts = {
					bubbles: true,
					cancelable: true,
					doingPopState: true,
					dest: state.target,
					reverse: true
				};
				dcl.mix(opts,
					{
						transition: "slide",
						direction: "end"
					});
				on.emit(document, "dapp-display", opts);

			//	this.app.showOrHideViews(state.target);
			}
		});
	});
