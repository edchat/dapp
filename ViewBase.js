define(["require", "dojo/when", "dojo/on", "dojo/dom-attr", "dojo/_base/declare", "dojo/_base/lang",
	"dojo/Deferred", "./utils/model", "./utils/constraints"],
	function(require, when, on, domAttr, declare, lang, Deferred, model, constraints){
	return declare("dojox.app.ViewBase", null, {
		// summary:
		//		View base class with model & controller capabilities. Subclass must implement rendering capabilities.
		constructor: function(params){
			// summary:
			//		Constructs a ViewBase instance.
			// params:
			//		view parameters, include:
			//
			//		- app: the app
			//		- id: view id
			//		- name: view name
			//		- parent: parent view
			//		- controller: view controller module identifier
			//		- children: children views
			this.id = "";
			this.name = "";
			this.children = {};
			this.selectedChildren = {};
			// private
			this._started = false;
			lang.mixin(this, params);
			// mixin views configuration to current view instance.
			if(this.parent.views){
				lang.mixin(this, this.parent.views[this.name]);
			}
		},

		// start view
		start: function(){
			// summary:
			//		start view object.
			//		load view template, view controller implement and startup all widgets in view template.
			if(this._started){
				return this;
			}
			this._startDef = new Deferred();
			when(this.load(), lang.hitch(this, function(){
				// call setupModel, after setupModel startup will be called after startup the loadViewDeferred will be resolved
				this._setupModel();
			}));
			return this._startDef;
		},

		load: function(){
			var vcDef = this._loadViewController();
			when(vcDef, lang.hitch(this, function(controller){
				if(controller){
					lang.mixin(this, controller);
				}
			}));
			return vcDef;
		},

		_setupModel: function(){
			// summary:
			//		Load views model if it is not already loaded then call _startup.
			// tags:
			//		private
			
			if(!this.loadedModels){
				var loadModelLoaderDeferred = new Deferred();
				var createPromise;
				try{
					createPromise = model(this.models, this.parent, this.app);
				}catch(e){
					loadModelLoaderDeferred.reject(e);
					return loadModelLoaderDeferred.promise;
				}
				when(createPromise, lang.hitch(this, function(models){
					if(models){
						// if models is an array it comes from dojo/promise/all. Each array slot contains the same result object
						// so pick slot 0.
						this.loadedModels = lang.isArray(models)?models[0]:models;
					}
					this._startup();
				}),
				function(err){
					loadModelLoaderDeferred.reject(err);
				});
			}else{ // loadedModels already created so call _startup
				this._startup();				
			}		
		},

		_startup: function(){
			// summary:
			//		startup widgets in view template.
			// tags:
			//		private

			this._startLayout();			
		},

		_startLayout: function(){
			// summary:
			//		startup widgets in view template.
			// tags:
			//		private
			this.app.log("  > in app/ViewBase _startLayout firing layout for name=[",this.name,"], parent.name=[",this.parent.name,"]");

			if(!this.hasOwnProperty("constraint")){
				this.constraint = domAttr.get(this.domNode, "data-app-constraint") || "center";
			}
			constraints.register(this.constraint);


			this.app.emit("app-initLayout", {
				"view": this, 
				"callback": lang.hitch(this, function(){
						//start widget
						this.startup();

						// call view assistant's init() method to initialize view
						this.app.log("  > in app/ViewBase calling init() name=[",this.name,"], parent.name=[",this.parent.name,"]");
						this.init();
						this._started = true;
						if(this._startDef){
							this._startDef.resolve(this);
						}
				})
			});
		},


		_loadViewController: function(){
			// summary:
			//		Load view controller by configuration or by default.
			// tags:
			//		private
			//
			var viewControllerDef = new Deferred();
			var path;

			if(!this.controller){ // no longer using this.controller === "none", if we dont have one it means none.
				this.app.log("  > in app/ViewBase _loadViewController no controller set for view name=[",this.name,"], parent.name=[",this.parent.name,"]");
				viewControllerDef.resolve(true);
				return viewControllerDef;
			}else{
				path = this.controller.replace(/(\.js)$/, "");
			}

			var requireSignal;
			try{
				var loadFile = path;
				var index = loadFile.indexOf("./");
				if(index >= 0){
					loadFile = path.substring(index+2);
				}
				requireSignal = require.on("error", function(error){
					if(viewControllerDef.isResolved() || viewControllerDef.isRejected()){
						return;
					}
					if(error.info[0] && (error.info[0].indexOf(loadFile) >= 0)){
						viewControllerDef.resolve(false);
						requireSignal.remove();
					}
				});

				if(path.indexOf("./") == 0){
					path = "app/"+path;
				}

				require([path], function(controller){
					viewControllerDef.resolve(controller);
					requireSignal.remove();
				});
			}catch(e){
				viewControllerDef.reject(e);
				requireSignal.remove();
			}
			return viewControllerDef;
		},

		init: function(){
			// summary:
			//		view life cycle init()
		},

		beforeActivate: function(){
			// summary:
			//		view life cycle beforeActivate()
		},

		afterActivate: function(){
			// summary:
			//		view life cycle afterActivate()
		},

		beforeDeactivate: function(){
			// summary:
			//		view life cycle beforeDeactivate()
		},

		afterDeactivate: function(){
			// summary:
			//		view life cycle afterDeactivate()
		},

		destroy: function(){
			// summary:
			//		view life cycle destroy()
		}
	});
});
