define(["dcl/dcl", "lie/dist/lie", "../TransitionBase", "../../utils/view"],
	function (dcl, Promise, TransitionBase, viewUtils) {

		// summary:
		//		A Transition controller to listen for "dapp-display" events and drive the transitions for those
		// 		events.
		// description:
		//		A Transition controller to listen for "dapp-display" events and drive the transitions for those
		// 		events.

		return dcl(TransitionBase, {
			_getParentNode: function (subEvent) {
				// subEvent.dapp.parentView is the view, the parentView.containerNode is the parentNode
				var viewDef = subEvent.dapp.parentView.views[subEvent.dest];
				var parentSelector = viewDef ? viewDef.parentSelector : null;
				var p = parentSelector ? this.app.domNode.querySelector(parentSelector) : null;
				if (!p) {
					p = subEvent.dapp.parentView.containerNode;
					if (parentSelector) {
						console.warn("Parent was not found with parentSelector=[" + parentSelector +
							"] for parentView with id=[" + subEvent.dapp.parentView.id + "]");
					}
				}

				return p;
			},
			// _hideView is called to hide a view
			_hideView: function (viewTarget, event, isParent, viewPath) {
				var hidePromise = new Promise(function (resolve) {
					event.dapp.isParent = isParent;
					event.dapp.hide = true;
					event.dapp.viewPath = viewPath;
					event.dapp.parentView = viewUtils.getParentViewFromViewId(this.app, viewPath.lastViewId);
					event.dest = event.dapp.parentView.childViews[viewPath.lastViewId].viewName;
					var self = this;
					var p = self._getParentNode(event);
					if (!p.hide) { // should have a hide function, if not
						//TODO: need a test for this!!
						console.warn("No hide function available on parentNode for viewTarget =" + viewTarget);
						event.dapp.nextView = event.dapp.parentView.childViews[viewTarget];
						var parentSelChild = viewUtils.getSelectedChild(event.dapp.parentView,
							event.dapp.nextView.constraint);
						event.dapp.nextView.viewShowing = false;
						if (event.dapp.nextView === parentSelChild) {
							viewUtils.setSelectedChild(event.dapp.parentView,
								event.dapp.nextView.constraint, null, self.app); // remove from selectedChildren
						}
						resolve(event);
					} else {
						p.hide(event.dapp.viewPath.lastViewId, event).then(function (value) {
							resolve(value);
							return value;
						});
					}
				}.bind(this));
				return hidePromise;
			},

			// _parentIsValid is called to see if p is valid and handle it if it is not
			_parentIsValid: function (p, dest, resolve, value) {
				if (!p || !p.show) {
					console.warn((p ? ("Parent [" + p.id + "] does not have a show function!") :
						"Do not have a parent for [" + dest + "]"));
					//TODO: need to test this!
					resolve(value);
					return false;
				}
				return true;
			},

			// _showView is called to make the final call to show the view
			_showView: function (p, subEvent, resolve) {
				p.show(subEvent.dest, subEvent).then(function (value) {
					resolve(value);
					return value;
				});
			}
		});
	});
