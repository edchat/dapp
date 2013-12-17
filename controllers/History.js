define(["dcl/dcl", "dojo/_base/lang", "dojo/on", "../Controller", "../utils/hash", "dojo/topic"],
	function (dcl, lang, on, Controller, hash, topic) {
		// module:
		//		dapp/controllers/History
		// summary:
		//		Bind "app-domNode" event on dapp application instance.
		//		Bind "app-finishedTransition" event on dojox/app application instance,
		//		Bind "startTransition" event on dapp application domNode.
		//		Bind "popstate" event on window object.
		//		Maintain history by HTML5 "pushState" method and "popstate" event.

		var MODULE = "dapp/controllers/History";

		return dcl(Controller, {
			// _currentPosition:     Integer
			//              Persistent variable which indicates the current position/index in the history
			//              (so as to be able to figure out whether the popState event was triggerd by
			//              a backward or forward action).
			_currentPosition: 0,

			// currentState: Object
			//              Current state
			currentState: {},

			// currentStack: Array
			//              Array with the history used to look for targets already in the stack
			currentStack: [],

			constructor: function () {
				// summary:
				//		Bind "app-domNode" event on dapp application instance.
				//		Bind "startTransition" event on dapp application domNode.
				//		Bind "popstate" event on window object.
				//

				this.events = {
					"app-domNode": this.onDomNodeChange,
					"app-finishedTransition": this.setupUrlHash//,
					//	"app-transition": this.onStartTransition
				};
				if (this.app.domNode) {
					this.onDomNodeChange({oldNode: null, newNode: this.app.domNode});
				}
				this.bind(window, "popstate", lang.hitch(this, this.onPopState));
			},

			onDomNodeChange: function (evt) {
				if (evt.oldNode != null) {
					this.unbind(evt.oldNode, "startTransition");
				}
			//	this.bind(evt.newNode, "startTransition", lang.hitch(this, this.onStartTransition));
			},

			onStartTransition: function (evt) {
				// summary:
				//		Response to dapp "startTransition" event.
				//
				// example:
				//		Use "dojox/mobile/TransitionEvent" to trigger "startTransition" event, and this function will
				// 		response the event. For example:
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
				var F = ":onStartTransition";
				this.app.log(MODULE, F,  "History onStartTransition evt.detail.target=", evt.detail.target);

				var currentHash = window.location.hash;
				var currentView = hash.getTarget(currentHash, this.app.defaultView);
				var currentParams = hash.getParams(currentHash);
				var _detail = lang.clone(evt.detail);
				var _detail2;
				_detail.target = _detail.title = currentView;
				_detail.url = currentHash;
				_detail.params = currentParams;
				_detail.id = this._currentPosition;

				// Create initial state if necessary
				if (history.length === 1) {
					history.pushState(_detail, _detail.href, currentHash);
					this.currentStack.push(_detail);
				}

				//		this.currentStack.push(evt.detail);

				// Update the current state
				_detail.bwdTransition = _detail.transition;
				//	lang.mixin(this.currentState, _detail);
				//	history.replaceState(this.currentState, this.currentState.href, currentHash);

				_detail2 = this.currentStack[this._currentPosition];
				lang.mixin(this.currentState, _detail2);

				history.replaceState(this.currentState, this.currentState.href, currentHash);

				// Create a new "current state" history entry
				this._currentPosition += 1;
				evt.detail.id = this._currentPosition;
				/*
				 if (!this.app.autoHashUrl) {
				 var newHash = evt.detail.url || "#" + evt.detail.target;

				 if (evt.detail.params) {
				 newHash = hash.buildWithParams(newHash, evt.detail.params);
				 }

				 evt.detail.fwdTransition = evt.detail.transition;
				 history.pushState(evt.detail, evt.detail.href, newHash);
				 //	history.pushState(evt.detail, evt.detail.href, "#");
				 this.currentState = lang.clone(evt.detail);

				 // Finally: Publish pushState topic
				 //			topic.publish("/app/history/pushState", evt.detail.target);
				 } else {
				 this.app.currentParams = evt.detail.params;
				 this.app.currentDetail = evt.detail;
				 this.app.currentDetailHref = evt.detail.href;
				 }
				 */
			},

			setupUrlHash: function (evt) {
				// summary:
				//		Response to dojox/app "app-finishedTransition" event.
				//
				// evt: Object
				//		transition options parameter

				// if not doing a popState and autoHashUrl is true then setup the currentHash and call pushState.
				var F = MODULE + ":setupUrlHash";
				this.app.log(MODULE, F, "History setupUrlHash evt.origDetail.target=[" + evt.origDetail.target + "]");

				if (evt && evt.origDetail && evt.origDetail.doingPopState) { // when doingPopState do not pushState.
					this.app.log(MODULE, F, "in History setupUrlHash evt.origDetail.doingPopState = true, so return");
					return;
				}
				this.app.log(MODULE, F,  "History setupUrlHash evt.origDetail=", evt.origDetail);

				var currentHash = window.location.hash;
				var currentView = hash.getTarget(currentHash, this.app.defaultView);
				var currentParams =  hash.getParams(currentHash);
				var _detail = lang.clone(evt.origDetail);
				_detail.target = _detail.title = currentView;
				_detail.url = currentHash;
				_detail.params = currentParams;
				_detail.id = this._currentPosition;

				// Create initial state if necessary
				//if (history.length === 1) {
			//	if (this.currentStack.length === 0) { // first entry for this app history
			//		history.pushState(_detail, _detail.href, currentHash);
			//		this.currentStack.push(_detail);
			//	}

				if (this.currentStack.length > 0) { // not first entry for this app history
					this.app.log(MODULE, F,  "History setupUrlHash 1 calling replaceState this.currentState=",
						this.currentState);
					// Update the current state
					_detail.bwdTransition = _detail.transition;
					lang.mixin(this.currentState, _detail);
					this.app.log(MODULE, F,  "History setupUrlHash callng replaceState currentHash =[" + currentHash + "]");
					this.app.log(MODULE, F,  "History setupUrlHash callng replaceState this.currentState=",
						this.currentState);
					history.replaceState(this.currentState, this.currentState.href, currentHash);
				}
/*
				var currentHash = window.location.hash;
				var _detail2 = this.currentStack[this._currentPosition];
				if (_detail2) {
					_detail2.bwdTransition = _detail2.transition;
				//	lang.mixin(this.currentState, _detail);
					this.app.log(MODULE, F,  "History onStartTransition _detail2=", _detail2);
					history.replaceState(_detail2, _detail2.href, currentHash);
				}
				//	if (!this.app.autoHashUrl) {
				var currentView = hash.getTarget(currentHash, this.app.defaultView);
			//	var currentParams = hash.getParams(currentHash);
*/
				evt.origDetail.id = this._currentPosition;

				// Create initial state if necessary
				if (history.length === 1) {
					history.pushState(evt.origDetail, evt.origDetail.href, currentHash);
					this.currentStack.push(evt.origDetail);
				}

	//			evt.origDetail.bwdTransition = evt.origDetail.transition;


				this.currentStack.push(evt.origDetail);

			//	_detail = lang.clone(evt.origDetail);

			//	var _detail = this.currentStack[this._currentPosition];
			//	_detail.target = _detail.title = currentView;
			//	_detail.url = currentHash;
			//	_detail.params = currentParams;
			//	_detail.id = this._currentPosition;

				var newHash = evt.origDetail.url || (evt.origDetail.target ?  "#" + evt.origDetail.target : "");
				if (evt.origDetail.params) {
					newHash = hash.buildWithParams(newHash, evt.origDetail.params);
				}

				// Create a new "current state" history entry
				this._currentPosition += 1;
				evt.origDetail.id = this._currentPosition;

				evt.origDetail.target = evt.origDetail.target || currentView;
				evt.origDetail.fwdTransition = evt.origDetail.transition;

				this.app.log(MODULE, F,  "History setupUrlHash before pushState evt.origDetail=", evt.origDetail);
				history.pushState(evt.origDetail, evt.origDetail.href, newHash);
			//	history.pushState(currentView, _detail.href, newHash);
				//	history.pushState(evt.origDetail, evt.origDetail.href, "#");
			//	this.currentState = lang.clone(evt.origDetail);
				this.currentState = lang.clone(evt.origDetail);

				// Finally: Publish pushState topic
				topic.publish("/app/history/pushState", evt.origDetail.target);

			//	this._currentPosition += 1;
			//	this._currentPosition = this.currentStack.length - 1;


				//	}
				/*
				 if (this.app.autoHashUrl) {
				 var currentHash = "#" + hash.getAllSelectedChildrenHash(this.app, "");

				 //if (this.app.currentParams) {
				 //	currentHash = hash.buildWithParams(currentHash, this.app.currentParams);
				 //}
				 if (evt.origDetail.params) {
				 currentHash = hash.buildWithParams(currentHash, evt.origDetail.params);
				 }

				 // push states to history list
				 this.app.log(MODULE, F, "in History setupUrlHash calling pushState with currentHash=[",
				 currentHash, "]");
				 //history.pushState(this.app.currentDetail, this.app.currentDetailHref, currentHash);
				 history.pushState(evt.detail, evt.detail.href, currentHash);
				 }
				 */
			},


			onPopState: function (evt) {
				// summary:
				//		Response to dapp "popstate" event.
				//
				// evt: Object
				//		Transition options parameter

				// Clean browser's cache and refresh the current page will trigger popState event,
				// but in this situation the application has not started and throws an error.
				// So we need to check application status, if application not STARTED, do nothing.
				var F = ":onPopState";
				this.app.log(MODULE, F, "History onPopState evt.state.target=[" + evt.state.target + "]");
				this.app.log(MODULE, F, "History onPopState evt.state.transition=[" + evt.state.transition + "]");
				if ((this.app.getStatus() !== this.app.lifecycle.STARTED) || !evt.state) {
					return;
				}

				//ELC NOTE NEED TO TEST WITH transition settings from the li and in defaultTransition because a setting
				// of transition on a view in the config only works because it overrides everything see it the log
				// that the wrong transition is set here, but it still works if set transition on view...
				//ELC also the transition in should be the same as the transition back, and forward should be the same
				// as the next transition (out) that is set in fwdTransition on the history.replaceState

				// Get direction of navigation and update _currentPosition accordingly
				var backward = evt.state.id < this._currentPosition;
				backward ? this._currentPosition -= 1 : this._currentPosition += 1;

				// Publish popState topic and transition to the target view. Important: Use correct transition.
				// Reverse transitionDir only if the user navigates backwards.
				var opts = lang.mixin({reverse: backward, doingPopState: true}, evt.state);
				opts.transition = backward ? opts.bwdTransition : opts.fwdTransition;
				this.app.log(MODULE, F, "History onPopState opts.transition=[" + opts.transition + "]");
				this.app.log(MODULE, F, "in History onPopState calling emit app-transition with state.target=[",
					evt.state.target, "]");
				this.app.emit("app-transition", {
					viewId: evt.state.target,
					opts: opts
				});
				topic.publish("/app/history/popState", evt.state.target);
			}
		});
	});
