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

			_getParentNode: function (subEvent) {
				var F = MODULE + "_getParentNode ";
				// subEvent.dapp.parentView is the view, the parentView.containerNode is the parentNode
				var viewDef = this.app.getViewDefFromEvent(subEvent);
				var parentSelector = viewDef ? viewDef.parentSelector : null;
				var p = parentSelector ? this.app.domNode.querySelector(parentSelector) : null;
				if (!p) {
					p = subEvent.dapp.parentView.containerNode;
					if (parentSelector) {
						console.warn("Parent was not found with parentSelector=[" + parentSelector +
							"] for parentView with id=[" + subEvent.dapp.parentView.id + "]");
					}
				}

				this.app.log(MODULE, F + "parentSelector = [" + parentSelector + "] p.id=" + (p ? p.id : "") + "]");

				return p;
			},
			_displayHandler: function (event) {
				var F = MODULE + "_displayHandler ";
				this.app.log(MODULE, F + "called **NEW** delite-display event with event.dest=[" + event.dest + "]");
				var dest = event.dest;
				dest = this.app.updateDestWithDefaultViews(dest);
				this.app.log(MODULE, F + "after call to updateDestWithDefaultViews dest=[" + dest + "]");
				this._displayViews({
					dest: dest,
					viewData: event.viewData,
					reverse: event.reverse,
					transition: event.transition,
					displayDeferred: event.displayDeferred,
					dapp: {}
				});
			},
			_displayViews: function (event) {
				var F = MODULE + "_displayViews ";
				this.app.log(MODULE, F + "called with event.dest=[" + event.dest + "] and event.viewData=[" +
					event.viewData + "]");
				//Todo: note when lastViewPart = false, lastViewId will be undefined, so we could remove it but it
				// might be confusing to.
				var lastViewPart = true;
				var views = event.dest && event.dest.split("+");
				if (views) {
					for (var i = 0; i < views.length; i++) {
						var lastViewId = views[i].replace(/,/g, "_");
						lastViewPart = (i === views.length - 1); // true for last part of multipart view
						this.app.log(MODULE, F + "calling _displayView with [" + views[i] +
							"] lastViewPart = [" + lastViewPart + "]");
						this._displayView(views[i], event, false, lastViewPart, lastViewId);
					}
				} else {
					// this is the root
					this._displayView(null, event, false, lastViewPart, "root");
				}
			},
			_displayView: function (viewTarget, event, isParent, lastViewPart, lastViewId) {
				var F = MODULE + "_displayView ";
				this.app.log(MODULE, F + "called for viewTarget [" + viewTarget + "] with event.dest = [" +
					event.dest + "] ");
				//	console.log("in _displayView called with lastViewId = "+lastViewId);
				//	console.log("in _displayView called with isParent = "+isParent);
				//	console.log("in _displayView called with lastViewPart = "+lastViewPart);
				var deferred = new Deferred(),
					subEvent, loadDeferred;
				//var parent;
				event.dapp.isParent = isParent;
				event.dapp.lastViewPart = lastViewPart;
				event.dapp.lastViewId = lastViewId;
				var _self = this;
				// wait for parents to be displayed first
				when(this._displayParents(viewTarget, event, lastViewPart, lastViewId, isParent),
					function (value) {
						_self.app.log(MODULE, F + "after _displayParents value.dapp.nextView.id=[" +
							value.dapp.nextView.id + "]");
						//	console.log("in _displayView back from this._displayParents lastViewId = "+lastViewId);
						//	console.log(MODULE, F + " in when this._displayParents  isParent = "+isParent);
						subEvent = Object.create(event);
						subEvent.dest = viewTarget.split(",").pop();
						subEvent.dapp.lastViewPart = lastViewPart;
						subEvent.dapp.lastViewId = lastViewId;
						subEvent.dapp.isParent = isParent;
						_self.app.log(MODULE, F + "subEvent.dest = [" + subEvent.dest + "]");

						subEvent.dapp.parentView = value.dapp.nextView;
						var p = _self._getParentNode(subEvent);
						if (!p || !p.show) {
							console.warn((p ? ("Parent [" + p.id + "] does not have a show function!") :
								"Do not have a parent for [" + subEvent.dest + "]"));
							if (event.displayDeferred && subEvent.dapp.lastViewPart) {
								event.displayDeferred.resolve(value);
							}
							return;
						}
						subEvent.dapp.parentNode = p;
						_self.app.log(MODULE, F + "before p.show with subEvent.dest = [" + subEvent.dest +
							"] with p.id=[" + p.id + "]");
						//	console.log("in transition before call to .show subEvent.dapp.lastViewPart=["+
						//		subEvent.dapp.lastViewPart+"]");
						//	console.log("in transition before call to .show subEvent.dapp.isParent=["+
						//		subEvent.dapp.isParent+"]");
						//	console.log("in transition before call to .show subEvent.dapp.lastViewId=["+
						//		subEvent.dapp.lastViewId+"]");
						//console.log(MODULE, F + " calling p.show with subEvent.dest = "+(subEvent.dest));
						//console.log(MODULE, F + " calling p.show with subEvent.dapp.isParent = "+(subEvent.dapp?
						// subEvent.dapp.isParent:""));
						//console.log("in _displayView calling p.show with subEvent.dapp.lastViewId = "+
						// subEvent.dapp.lastViewId);
						loadDeferred = p.show(subEvent.dest, subEvent).then(function (value) {
							_self.app.log(MODULE, F + "back from parent.containerNode.show for subEvent.dest[" +
								subEvent.dest + "] subEvent.dapp.parentView.id[" + subEvent.dapp.parentView.id + "]");
							deferred.resolve(value);
							var nextId = value.next ? value.next.id : value.dapp.nextView.id;
							if (event.displayDeferred && value.dapp.lastViewPart && !value.dapp.isParent &&
								nextId === event.dapp.lastViewId) {
								event.displayDeferred.resolve(value);
							}
							return value;
						});
					});
				return deferred.promise;
			},
			_displayParents: function (viewTarget, ev, lastViewPart, lastViewId) {
				var F = MODULE + "_displayParents ";
				this.app.log(MODULE, F + "called for viewTarget=[" + viewTarget + "]");
				// for now we consider the parents are listed in the display command (i.e. parent1,parent2,view)
				// TODO: we might improve that later to avoid users have to specify this?
				var parts = viewTarget ? viewTarget.split(",") : "";
				if (parts && parts.length > 1) {
					parts.pop(); // process the parent first
					var dest = parts.join(",");
					this.app.log(MODULE, F + "calling return _displayView with dest=[", dest + "]");
					return this._displayView(dest, ev, true, lastViewPart, lastViewId);
				}
				return {
					dapp: {
						nextView: this.app,
						dest: ev.dest
					}
				};
			}
		});
	});
