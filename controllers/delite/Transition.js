define(["dcl/dcl", "dojo/on", "dojo/when", "dojo/Deferred", "dojo/promise/all", "dojo/_base/lang", "../../Controller"],
	function (dcl, on, when, Deferred, all, lang, Controller) {
		var MODULE = "controllers/delite/Transition:";

		return dcl(Controller, {
			constructor: function (app) {
				this.app = app;
				this.func = lang.hitch(this, "_displayHandler");
				document.addEventListener("delite-display", this.func, false);
				this.app.on("app-unloadApp", lang.hitch(this, "unloadApp"));
			},
			unloadApp: function () {
				//TODO: Look into using own and destroyable to handle destroy
				document.removeEventListener("delite-display", this.func, false);
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
				subEvent.parent = parentView;

				// TODO: fix this to get the constraint properly THIS IS TEST CODE HERE
				//	var constraint = parent.views[subEvent.dest].constraint || "main";
				//var constraint = constraints.getConstraintForViewTarget(viewTarget, app);
				//var p = document.getElementById(constraint); // || document.body;
				//	var viewDefinition = self.app.getViewDefFromViewName(subEvent.dest);
				//	var parentSelector = viewDefinition ? viewDefinition.parentSelector : null;
				//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
				//	var p = parentSelector ? self.app.domNode.querySelector(parentSelector) : null;
			//	var parentSelector2 = this.app.getViewDefFromViewName(subEvent.dest).parentSelector;
				var parentSelector = this.app.getViewDefFromEvent(subEvent).parentSelector;
				var p = this.app.domNode.querySelector(parentSelector);
				this.app.log(MODULE, F + "compare p and subEvent.parent p = [" +
					(p ? p.id : "") + "]");

				this.app.log(MODULE, F + "after _displayParents subEvent.parent = [" +
					(subEvent.parent.containerNode ? subEvent.parent.containerNode.id : "") + "]");
				if (!p) {
					p = subEvent.parent.containerNode ? subEvent.parent.containerNode : subEvent.parent.children[0];
				}
				return p;
			},
			_displayHandler: function (event) {
				var F = MODULE + "_displayHandler ";
				this.app.log(MODULE, F + "called with event.dest=[" + event.dest + "]");
				// TODO be more generic here instead of picking a few props
				var dest = event.dest;
				if (this.app.flatViewDefinitions[dest]) { // if dest is a view name we will use the viewPath
					dest = this.app.flatViewDefinitions[dest].viewPath;
				}
				this._displayViews({
					dest: dest,
					viewData: event.viewData,
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
					//var savedDisplayDeferred = event.displayDeferred;
					for (var i = 0; i < views.length; i++) {
						// display the view
						if (i === views.length - 1) {
							event.lastView = true;
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
					event.dapp ? event.dapp.fullViewTarget = viewTarget : event.dapp = {
						fullViewTarget: viewTarget
					};
				}
				var _self = this;
				// wait for parents to be displayed first
				when(skipParents || this._displayParents(viewTarget, event, isParent, displayDefaultView),
					function (value) {
						if (_self.destroyed) { //TODO: this removeEventListener is not working!!!!
							return;
						}

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
						var p = _self._getParentNode(subEvent, value.dapp.nextView);
						//	loadDeferred = parent.containerNode.show(subEvent.dest, subEvent).then(function (value) {
						if (!p || !p.show) {
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
							event.isParent = false;
							deferred.resolve(value);
							return value;
						});
						// if we are at the init view, check if we have defaultView children to display in addition
						if (displayDefaultView) {
							_self.app.log(MODULE, F + "after .show displayDefaultView");
							loadDeferred.then(function (value) {
								if (value.dapp.nextView.defaultView) {
									// TODO: here we re-use the same transition as was initially setup
									// do we want to use it for defaultView as well?
									var newEvent = Object.create(subEvent);
									newEvent.dest = value.dapp.nextView.defaultView;
									_self.app.log(MODULE, F + "calling displayViews for displayDefaultView " +
										"newEvent.dest=[" + newEvent.dest + "]");
									_self._displayViews(newEvent, value);
								} else {
									if (event.displayDeferred && value.dapp.lastView) {
										event.displayDeferred.resolve();
									}
								}
								return value;
							});
						}
					});
				return deferred.promise;
			},
			_displayParents: function (viewTarget, event, displayDefaultView) {
				var F = MODULE + "_displayParents ";
				this.app.log(MODULE, F + "called for viewTarget=[" + viewTarget + "]");
				// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
				// TODO: we might improve that later to avoid users have to specify this?
				var parts = viewTarget ? viewTarget.split(",") : "";
				if (parts && parts.length > 1) {
					//	parts.shift();
					parts.pop(); // process the parent first
					event.isParent = true;
					var dest = parts.join(",");
					this.app.log(MODULE, F + "calling return _displayView with event, displayDefaultView," +
						" true with dest=[", dest + "]");
					return this._displayView(dest, event, displayDefaultView, true);
				} else {
					//	event.isParent = false;
				}
				this.app.log(MODULE, F + " calling return dapp this.app");
				return {
					dapp: {
						nextView: this.app,
						lastView: event.lastView
					},
					isParent: false
				};
			}
		});
	});
