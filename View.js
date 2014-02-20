define(["require", "dojo/when", "dojo/on", "dcl/dcl", "dojo/_base/lang", "dojo/Deferred",
	"delite/Widget", "delite/template", "delite/Invalidating", "delite/register", "delite/handlebars",
	"dojo/dom-construct",
	"dojo/dom-attr", "dojo/dom-style", "dojo/dom-class",
	"delite/Stateful",
	//	"dijit/Destroyable",
	//"dijit/_TemplatedMixin",
	//"dijit/_WidgetsInTemplateMixin",
	"./ViewBase", "./utils/nls"
],
	function (require, when, on, dcl, lang, Deferred, Widget, dtemplate, Invalidating, register, handlebars,
		domConstruct, domAttr, domStyle, domClass, Stateful, //Destroyable,
		//	_TemplatedMixin,
		//	_WidgetsInTemplateMixin,
		ViewBase, nls) {

		return dcl([ViewBase, Widget, Invalidating /*_TemplatedMixin, _WidgetsInTemplateMixin, Destroyable,*/ ], {
			// summary:
			//		View class inheriting from ViewBase adding templating & globalization capabilities.
			constructor: function (params) { // jshint unused:false
				// summary:
				//		Constructs a View instance either from a configuration or programmatically.
				//
				// example:
				//		|	use configuration file
				//		|
				//		|	// load view controller from views/simple.js by default
				//		|	"simple":{
				//		|		"template": "myapp/views/simple.html",
				//		|		"nls": "myapp/nls/simple"
				//		|		"dependencies":["dojox/mobile/TextBox"]
				//		|	}
				//		|
				//		|	"home":{
				//		|		"template": "myapp/views/home.html", // no controller set so no view controller
				//		|		"dependencies":["dojox/mobile/TextBox"]
				//		|	}
				//		|	"main":{
				//		|		"template": "myapp/views/main.html",
				//		|		"controller": "myapp/views/main.js", // identify view controller from views/main.js
				//		|		"dependencies":["dojox/mobile/TextBox"]
				//		|	}
				//
				// example:
				//		|	var viewObj = new View({
				//		|		app: this.app,
				//		|		id: this.id,
				//		|		name: this.name,
				//		|		parent: this,
				//		|		templateString: this.templateString,
				//		|		template: this.template,
				//		|		controller: this.controller
				//		|	});
				//		|	viewObj.start(); // start view
				//
				// params:
				//		view parameters, include:
				//
				//		- app: the app
				//		- id: view id
				//		- name: view name
				//		- template: view template identifier. If templateString is not empty, this parameter ignored
				//		- templateString: view template string
				//		- controller: view controller module identifier
				//		- parent: parent view
				//		- children: children views
				//		- nls: nls definition module identifier
				console.log("dapp/View:constructor called for " + this.id);
			},

			// _TemplatedMixin requires a connect method if data-dojo-attach-* are used
			connect: function (obj, event, method) {
				console.log("dapp/View:connect called for " + this.id);
				return this.own(on(obj, event, lang.hitch(this, method)))[0]; // handle
			},

			_loadTemplate: function () {
				// summary:
				//		load view HTML template and dependencies.
				// tags:
				//		private
				//
				console.log("dapp/View:_loadTemplate called for " + this.id);

				if (this.templateString) {
					return true;
				} else {
					var tpl = this.template;
					var deps = this.dependencies ? this.dependencies : [];
					if (tpl) {
						deps = deps.concat(["dojo/text!" + tpl]);
					}
					var loadViewDeferred = new Deferred();
					require(deps, lang.hitch(this, function () {
						this.templateString = this.template ? arguments[arguments.length - 1] : "<div></div>";
						loadViewDeferred.resolve(this);
					}));
					return loadViewDeferred;
				}
			},

			// start view
			load: dcl.superCall(function (sup) {
				return function () {
					console.log("dapp/View:load called for " + this.id);
					var tplDef = new Deferred();
					var defDef = sup.call(this);
					var nlsDef = nls(this);
					// when parent loading is done (controller), proceed with template
					// (for data-dojo-* to work we need to wait for controller to be here, this is also
					// useful when the controller is used as a layer for the view)
					when(defDef, lang.hitch(this, function () {
						when(nlsDef, lang.hitch(this, function (nls) {
							// we inherit from the parent NLS
							this.nls = dcl.mix({}, this.parent.nls) || {};
							if (nls) {
								// make sure template can access nls doing ${nls.myprop}
								dcl.mix(this.nls, nls);
							}
							when(this._loadTemplate(), function (value) {
								tplDef.resolve(value);
							});
						}));
					}));
					return tplDef;
				};
			}),

			// in another place it was mentioned that may want to change from startup --> enteredViewCallback.
			_startup: dcl.superCall(function (sup) {
				return function () {
					// summary:
					//		startup widgets in view template.
					// tags:
					//		private
					console.log("dapp/View:_startup called for " + this.id);

					this._needsResize = true; // flag used to be sure resize has been called before transition

					// parse the content of the template
					// FIXME: should be transparent with delite/handlebar...

					this.domNode = document.getElementById(this.id);
					this.attributes.nls = this.nls; // add nls strings to attributes

					var params = {
						baseClass: "d-" + this.id,
						buildRendering: handlebars.compile(this.templateString),
						preCreate: function () {
							console.log("in view preCreate");
						},
						postCreate: function () {
							console.log("in view postCreate ");
						},
						refreshRendering: dcl.after(function (args) {
							console.log("in view refreshRendering args[0] = " + args[0]);
						})
					};
					dcl.mix(params, this.attributes);

					// try to setup a widget to build the view here
					register(this.id, [HTMLElement, Widget, Invalidating], params);



					/* tried this for christophe
					if(!this.app.ViewClass){
						this.app.ViewClass = register("d-app-view", [HTMLElement, Widget, Invalidating]);
					}

					this.app.ViewClass.prototype.buildRendering = handlebars.compile(this.templateString);
					var view = new this.app.ViewClass();
					//view.prototype.buildRendering = handlebars.compile(this.templateString);
					this.domNode = register.createElement("d-app-view"); //"d-app-view"
					*/
					this.domNode = register.createElement(this.id);
					this.domNode.id = this.id;

					//TODO: had to do this for widgets in templates to work
					this.domNode.containerNode = this.domNode;
					this.domNode.startup();

					this._initViewHidden();

					this._startLayout();

					sup.call(this);
				};
			})
		});
	});
