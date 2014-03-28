define(["require", "dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/config",
		"dojo/Evented", "dojo/Deferred", "dojo/when", "dojo/has", "dojo/on", "dojo/domReady",
		"dojo/dom-construct", "dojo/dom-attr", "./utils/nls", "dojo/topic",
		"./utils/hash", "./utils/constraints", "./utils/config", "dojo/_base/window" //, "dojo/domReady!"
	],
	function (require, kernel, lang, declare, config, Evented, Deferred, when, has, on, domReady, domConstruct, domAttr,
		nls, topic, hash, constraints, configUtils) {
		var MODULE = "Main:";

		has.add("app-log-api", (config.app || {}).debugApp);

		var Application = declare(Evented, {
			lifecycle: {
				UNKNOWN: 0, //unknown
				STARTING: 1, //starting
				STARTED: 2, //started
				STOPPING: 3, //stopping
				STOPPED: 4 //stopped
			},

			_status: 0, //unknown

			constructor: function (params, node) {
				lang.mixin(this, params);
				this.domNode = node;
				this.children = {};
				this.loadedStores = {};
				this.loadedControllers = [];
			},
			getStatus: function () {
				return this._status;
			},

			setStatus: function (newStatus) {
				this._status = newStatus;

				// publish /app/status event.
				// application can subscribe this event to do some status change operation.
				topic.publish("/app/status", newStatus, this.id);
			},

			displayView: function (view, params) {
				// TODO: complete implementation
				var opts = lang.mixin({
						bubbles: true,
						cancelable: true,
						dest: view
					},
					params ? params : {
						transition: "slide",
						direction: "end"
					});
				on.emit(document, "delite-display", opts);
			},

			hideView: function () {
				// TODO hide should either just hide or optionally unload it as well
			},

			// TODO: move to a Store controller?
			_createDataStore: function () {
				// summary:
				//		Create data store instance
				if (this.stores) {
					//create stores in the configuration.
					for (var item in this.stores) {
						if (item.charAt(0) !== "_") { //skip the private properties
							var type = this.stores[item].type ? this.stores[item].type : "dojo/store/Memory";
							var config = {};
							if (this.stores[item].params) {
								lang.mixin(config, this.stores[item].params);
							}
							// we assume the store is here through dependencies
							var StoreCtor;
							try {
								StoreCtor = require(type);
							} catch (e) {
								throw new Error(type + " must be listed in the dependencies");
							}
							if (config.data && lang.isString(config.data)) {
								//get the object specified by string value of data property
								//cannot assign object literal or reference to data property
								//because json.ref will generate __parent to point to its parent
								//and will cause infinitive loop when creating StatefulModel.
								config.data = lang.getObject(config.data);
							}
							if (this.stores[item].observable) {
								var observableCtor;
								try {
									observableCtor = require("dojo/store/Observable");
								} catch (e) {
									throw new Error("dojo/store/Observable must be listed in the dependencies");
								}
								this.stores[item].store = observableCtor(new StoreCtor(config));
							} else {
								this.stores[item].store = new StoreCtor(config);
							}
							this.loadedStores[item] = this.stores[item].store;
						}
					}
				}
			},

			createControllers: function (controllers) {
				// summary:
				// Create controller instance
				//
				// controllers: Array
				// controller configuration array.
				// returns:
				// controllerDeferred object

				if (controllers) {
					var requireItems = [];
					for (var i = 0; i < controllers.length; i++) {
						requireItems.push(controllers[i]);
					}
					var controllerDef = new Deferred();
					require(requireItems, lang.hitch(this, function () {
						for (var i = 0; i < arguments.length; i++) {
							// instantiate controllers, set Application object, and perform auto binding
							this.loadedControllers.push((new arguments[i](this)).bind());
						}
						controllerDef.resolve(this);
					}));
					return controllerDef;
				}
			},

			// setup default view and Controllers and startup the default view
			start: function () {
				//
				//create application level data store
				this._createDataStore();
				this.setupControllers();
				// if available load root NLS
				when(nls(this), lang.hitch(this, function (nls) {
					if (nls) {
						lang.mixin(this.nls = {}, nls);
					}
					this.startup();
				}));
			},

			updateDestWithDefaultViews: function (dest) {
				var F = MODULE + "updateDestWithDefaultViews ";
				var viewPath = dest;
				this.log(MODULE, F + "called with dest=[" + dest + "]");
				console.log(MODULE, F + "called with dest=[" + dest + "]");
				var parts = viewPath.split("+");
				for (var item in parts) {
					parts[item] = this.addDefaultViewsToPath(parts[item]);
				}
				viewPath = parts.join("+");

				this.log(MODULE, F + "final set  returning viewPath=[" + viewPath + "]");
				console.log(MODULE, F + "final set  returning viewPath=[" + viewPath + "]");
				return viewPath;
			},


			addDefaultViewsToPath: function (dest) {
				var F = MODULE + "addDefaultViewsToPath ";
				var viewPath = dest;
				this.log(MODULE, F + "called with dest=[" + dest + "]");
				console.log(MODULE, F + "called with dest=[" + dest + "]");
				var viewDef = this.getViewDefFromDest(dest);
				while (viewDef && viewDef.defaultView) {
					viewPath = viewPath + "," + viewDef.defaultView;
					this.log(MODULE, F + "set viewPath=[" + viewPath + "]");
					viewDef = this.getViewDefFromDest(viewPath);
				}
				this.log(MODULE, F + "final set  returning viewPath=[" + viewPath + "]");
				console.log(MODULE, F + "final set  returning viewPath=[" + viewPath + "]");
				return viewPath;
			},

			getViewDefFromEvent: function (evnt) {
				var F = MODULE + "getViewDefFromEvent ";
				var viewPath;
				this.log(MODULE, F + "called with evnt.dest=[" + evnt.dest + "]");
				//	if(evnt.dapp && evnt.dapp.fullViewTarget){
				//		viewPath = evnt.dapp.fullViewTarget;
				//	}else
				//
				if (evnt.dest.indexOf("_") >= 0) { // viewId?
					this.getViewDefFromViewId(evnt.dest);
					return;
				}
				if (evnt.dapp && evnt.dapp.parentView) { // parent has to be a view to use the id
					if (evnt.dapp.parentView === this) {
						viewPath = evnt.dest;
					} else {
						return this.getViewDefFromViewId(evnt.dapp.parentView.id + "_" + evnt.dest);
						//viewPath = this.getViewDefFromViewId(evnt.dapp.parentView.id);
					}
				}
				var viewName = evnt.dest;
				if (viewName && viewPath) {
					var parts = viewPath.split(",");
					var viewDef = this;
					//	this.log(MODULE, F + "parts=["+parts+"] viewDef.id=["+viewDef.id+"]");
					for (var item in parts) {
						viewDef = viewDef.views[parts[item]];
						if (parts[item] === viewName) {
							break;
						}
						//this.log(MODULE, F + "item=["+item+"] viewDef.parentSelector=["+viewDef.parentSelector+"]");
					}
					this.log(MODULE, F + "called with viewName=[" + viewName + "] viewPath=[" + viewPath + "]" +
						" returning viewDef.parentSelector=[" + (viewDef ? viewDef.parentSelector : "") + "]");
					return viewDef;
				}
				this.log(MODULE, F + "called with viewName=[" + viewName + "] viewPath=[" + viewPath +
					"] returning null");
				this.log(MODULE, F + "returning null");
				return null;
			},

			getViewDestFromViewid: function (viewId) {
				var F = MODULE + "getViewDestFromViewid ";
				if (viewId) {
					var parts = viewId.split("_");
					var viewDef = this;
					var viewName = "";
					//	this.log(MODULE, F + "parts=["+parts+"] viewDef.id=["+viewDef.id+"]");
					for (var item in parts) {
						viewName = parts[item];
						viewDef = viewDef.views[parts[item]];
						//this.log(MODULE, F + "item=["+item+"] viewDef.parentSelector=["+viewDef.parentSelector+"]");
					}
					this.log(MODULE, F + "called with viewId=[" + viewId +
						" returning viewDef.parentSelector=[" + (viewDef ? viewDef.parentSelector : "") + "]");
					return viewName;
				}
				this.log(MODULE, F + "called with viewId=[" + viewId +
					"] returning viewId");
				this.log(MODULE, F + "returning viewId");
				return viewId;
			},

			getViewDefFromViewId: function (viewId) {
				var F = MODULE + "getViewDefFromViewId ";
				if (viewId) {
					var parts = viewId.split("_");
					var viewDef = this;
					//	this.log(MODULE, F + "parts=["+parts+"] viewDef.id=["+viewDef.id+"]");
					for (var item in parts) {
						viewDef = viewDef.views[parts[item]];
						//this.log(MODULE, F + "item=["+item+"] viewDef.parentSelector=["+viewDef.parentSelector+"]");
					}
					this.log(MODULE, F + "called with viewId=[" + viewId +
						" returning viewDef.parentSelector=[" + (viewDef ? viewDef.parentSelector : "") + "]");
					return viewDef;
				}
				this.log(MODULE, F + "called with viewId=[" + viewId +
					"] returning null");
				this.log(MODULE, F + "returning null");
				return null;
			},

			getViewDefFromDest: function (viewPath) {
				var F = MODULE + "getViewDefFromDest ";
				if (viewPath) {
					var parts = viewPath.split(",");
					var viewDef = this;
					//	this.log(MODULE, F + "parts=["+parts+"] viewDef.id=["+viewDef.id+"]");
					for (var item in parts) {
						viewDef = viewDef.views[parts[item]];
						//this.log(MODULE, F + "item=["+item+"] viewDef.parentSelector=["+viewDef.parentSelector+"]");
					}
					this.log(MODULE, F + "called with viewPath=[" + viewPath +
						" returning viewDef.parentSelector=[" + (viewDef ? viewDef.parentSelector : "") + "]");
					return viewDef;
				}
				this.log(MODULE, F + "called with viewPath=[" + viewPath +
					"] returning null");
				this.log(MODULE, F + "returning null");
				return null;
			},

			getViewIdFromDest: function (dest, parentNode) {
				console.log("getViewIdFromDest called with dest = " + dest);
				var pView = this.getParentViewFromViewName(dest, parentNode);
				if (this === pView) { // pView is the app
					return dest;
				}
				return pView.id + "_" + dest;
			},

			getParentViewFromViewName: function (viewName, parentNode) {
				if (this.containerNode === parentNode) {
					return this;
				}
				var pNode = parentNode;
				while (!pNode.viewId && pNode.parentNode) {
					pNode = pNode.parentNode;
				}
				if (pNode && pNode.viewId) {
					var parentViewId = pNode.viewId;
					return this.getViewFromViewId(parentViewId);
				}
				return this;
			},

			getViewFromViewId: function (viewId) {
				//var F = MODULE + "getViewFromViewId ";
				if (viewId) {
					var parts = viewId.split("_");
					var view = this;
					var nextChildId = "";
					for (var item in parts) {
						var childId = nextChildId + parts[item];
						view = view.children[childId];
						nextChildId = childId + "_";
					}
					return view;
				}
				return null;
			},

			getParentViewFromViewId: function (viewId) {
				//var F = MODULE + "getParentViewFromViewId ";
				if (viewId) {
					var parts = viewId.split("_");
					parts.pop();
					var view = this;
					var nextChildId = "";
					for (var item in parts) {
						var childId = nextChildId + parts[item];
						view = view.children[childId];
						nextChildId = childId + "_";
					}
					return view;
				}
				return null;
			},

			setupControllers: function () {
				// create application controller instance
				// move set _startView operation from history module to application
				//var F = MODULE + "setupControllers ";

				var currentHash = window.location.hash;
				this._startView = hash.getTarget(currentHash, this.defaultView);
				this._startParams = hash.getParams(currentHash);
			},

			startup: function () {
				// load controllers and views
				//
				this.selectedChildren = {};
				var controllers = this.createControllers(this.controllers);
				// constraint on app
				if (this.hasOwnProperty("constraint")) {
					constraints.register(this.constraints);
				} else {
					this.constraint = "center";
				}
				when(controllers, lang.hitch(this, function () {
					// emit "app-init" event so that the Init controller can initialize the app and the root view
					this.emit("app-init", {});
				}));
			},

			unloadApp: function () {
				// summary:
				//		Unload the application, and all of its child views.
				// 		set the status for STOPPING during the unload and STOPPED when complete
				// 		emit app-unload-view to have controllers stop, and delete the global app reference.
				//
				var F = MODULE + "unloadApp ";
				var appStoppedDef = new Deferred();
				this.setStatus(this.lifecycle.STOPPING);
				this.emit("app-unloadApp", {}); // for controllers to cleanup

				var params = {};
				params.view = this;
				params.parentView = this;
				params.unloadApp = true;
				params.callback = lang.hitch(this, function () {
					this.setStatus(this.lifecycle.STOPPED);
					delete window[this.name]; // remove the global for the app
					appStoppedDef.resolve();
				});
				this.log(MODULE, F + "emit app-unload-view for [" + this.id + "]");
				this.emit("app-unload-view", params);
				return appStoppedDef;
			},

			log: function () {} // noop may be replaced by a logger controller


		});

		function generateApp(config, node) {
			// summary:
			// generate the application
			//
			// config: Object
			// app config
			// node: domNode
			// domNode.
			var path;
			var appStartedDef = new Deferred();

			// call configProcessHas to process any has blocks in the config
			config = configUtils.configProcessHas(config);

			if (!config.loaderConfig) {
				config.loaderConfig = {};
			}
			if (!config.loaderConfig.paths) {
				config.loaderConfig.paths = {};
			}
			if (!config.loaderConfig.paths.app) {
				// Register application module path
				path = window.location.pathname;
				if (path.charAt(path.length) !== "/") {
					path = path.split("/");
					path.pop();
					path = path.join("/");
				}
				config.loaderConfig.paths.app = path;
			}

			/* global requirejs */
			if (window.requirejs) {
				requirejs.config(config.loaderConfig);
			} else {
				// Dojo loader?
				require(config.loaderConfig);
			}

			if (!config.modules) {
				config.modules = [];
			}
			var modules = config.modules.concat(config.dependencies ? config.dependencies : []);

			if (config.template) {
				path = config.template;
				if (path.indexOf("./") === 0) {
					path = "app/" + path;
				}
				modules.push("dojo/text!" + path);
			}

			require(modules, function () {
				var modules = [Application];
				for (var i = 0; i < config.modules.length; i++) {
					modules.push(arguments[i]);
				}

				var ext;
				if (config.template) {
					ext = {
						templateString: arguments[arguments.length - 1]
					};
				}
				/*global App:true */
				App = declare(modules, ext);


				domReady(function () {
					var app = new App(config, node || document.body);
					app.setStatus(app.lifecycle.STARTING);
					// Create global namespace for application.
					// The global name is application id. For example, modelApp
					var globalAppName = app.id;
					if (window[globalAppName]) {
						lang.mixin(app, window[globalAppName]);
					}
					window[globalAppName] = app;
					app.appStartedDef = appStartedDef;
					app.start();
				});
			});
			return appStartedDef;
		}


		return function (config, node) {
			if (!config) {
				throw new Error("Application Configuration Missing");
			}
			return generateApp(config, node);
		};
	});
