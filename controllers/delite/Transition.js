define(["dcl/dcl", "dojo/on", "dojo/when", "dojo/Deferred", "dojo/promise/all", "dojo/_base/lang", "../../Controller",
		"../../utils/constraints"
	],
	function (dcl, on, when, Deferred, all, lang, Controller, constraints) {

		return dcl(Controller, {
			constructor: function () {
				document.addEventListener("delite-display", lang.hitch(this, "_displayHandler"));
			},
			_displayHandler: function (event) {
				console.log("dapp/controller/delite/Transition:_displayHandler called for " + event.dest);
				// TODO be more generic here instead of picking a few props
				this._displayViews({
					dest: event.dest
					// other props
				});
			},
			_displayViews: function (event, skipParents) {
				console.log("dapp/controller/delite/Transition:_displayViews called for " + event.dest);
				console.log("dapp/controller/delite/Transition:_displayViews called for ", event);
				var views = event.dest && event.dest.split("+");
				if (views) {
					for (var i = 0; i < views.length; i++) {
						// display the view
						console.log("dapp/controller/delite/Transition:_displayViews calling _displayView with ", views[i]);
						this._displayView(views[i], event, true, false, skipParents);
					}
				} else {
					// this is the root
					this._displayView(null, event, true, false, skipParents);
				}
			},
			_displayView: function (viewTarget, event, displayDefaultView, isParent, skipParents) {
				console.log("dapp/controller/delite/Transition:_displayView called for viewTarget [" + viewTarget +
				"] with event.dest = ["+event.dest+ "] and event.parent =["+event.parent+"]");
				var app = this.app;
				var deferred = new Deferred(),
					self = this,
					subEvent, parent, loadDeferred;
				event.isParent = isParent;
				if (displayDefaultView) {
					event.dapp ? event.dapp.fullViewTarget = viewTarget : event.dapp = {fullViewTarget : viewTarget };
				}
				// wait for parents to be displayed first
				when(skipParents || this._displayParents(viewTarget, event, isParent, displayDefaultView),
					function (value) {
						console.log("dapp/controller/delite/Transition:_displayView after _displayParents value.dapp.nextView.id = ",
							value.dapp.nextView.id);
						subEvent = Object.create(event);
						subEvent.dest = viewTarget.split(",").pop();
						console.log("dapp/controller/delite/Transition:_displayView subEvent.dest = ", subEvent.dest);
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
						var parentSelector = self.app.getViewDefFromViewName(subEvent.dest).parentSelector;
						var p  = self.app.domNode.querySelector(parentSelector);
						console.log("dapp/controller/delite/Transition:_displayView compare p and subEvent.parent p = ",
							p ? p.id : "");

						console.log("dapp/delite/cont/Transition:_displayView after _displayParents subEvent.parent = ",
							subEvent.parent.containerNode ? subEvent.parent.containerNode.id : "");
						//	loadDeferred = parent.containerNode.show(subEvent.dest, subEvent).then(function (value) {
						if (!p || !p.show) {
							return;
						}
						console.log("dapp/controller/delite/Transition:_displayView before p.show with subEvent.dest = ["+subEvent.dest+
							"] with p = ", p);
						loadDeferred = p.show(subEvent.dest, subEvent).then(function (value) {
							console.log("dapp/controller/delite/Transition:_displayView back from " +
								"parent.containerNode.show for subEvent", subEvent);
							event.isParent = false;
							deferred.resolve(value);
							return value;
						});
						// if we are at the init view, check if we have defaultView children to display in addition
						if (displayDefaultView) {
							console.log("dapp/delite/cont/Transition:_displayView after .show displayDefaultView");
							loadDeferred.then(function (value) {
								if (value.dapp.nextView.defaultView) {
									// TODO: here we re-use the same transition as was initially setup
									// do we want to use it for defaultView as well?
									var newEvent = Object.create(subEvent);
									newEvent.dest = value.dapp.nextView.defaultView;
									console.log("dapp/controller/delite/Transition:_displayView calling displayViews " +
										"for displayDefaultView newEvent=", newEvent);
									self._displayViews(newEvent, value);
								}
								return value;
							});
						}
					});
				return deferred.promise;
			},
			_displayParents: function (viewTarget, event, displayDefaultView) {
				console.log("dapp/controller/delite/Transition:_displayParents called for viewTarget=" + viewTarget);
				// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
				// TODO: we might improve that later to avoid users have to specify this?
				var parts = viewTarget ? viewTarget.split(",") : "";
				if (parts && parts.length > 1) {
				//	parts.shift();
					parts.pop();  // process the parent first
					event.isParent = true;
					var dest = parts.join(",");
					console.log("dapp/controller/delite/Transition:_displayParents calling return _displayView " +
						"with event, displayDefaultView, true with dest =", dest);
					return this._displayView(dest, event, displayDefaultView, true);
				} else {
					//	event.isParent = false;
				}
				console.log("dapp/controller/delite/Transition:_displayParents calling return dapp this.app");
				return {
					dapp: {
						nextView: this.app
					},
					isParent: false
				};
			}
		});
	});
