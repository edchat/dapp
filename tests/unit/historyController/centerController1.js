define([], function () {
	return {
		name: "",
		_beforeActivateCallCount: 0,
		_beforeDeactivateCallCount: 0,
		_afterActivateCallCount: 0,
		_afterDeactivateCallCount: 0,
		init: function () {
			this.domNode.name = this.id;
		},
		beforeActivate: function ( /*previousView, viewData*/ ) {
			//console.log("app-view:", "beforeActivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(previousView ? previousView.id : "") + "] with viewData=", viewData);
			this._beforeActivateCallCount++;
			if (this.id === "center1") {
				this.domNode.style.backgroundColor = "cyan";
			} else {
				this.domNode.style.backgroundColor = "green";
			}
		},
		beforeDeactivate: function ( /*nextView*/ ) {
			//console.log("app-view:", "beforeDeactivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(nextView ? nextView.id : "") + "]");
			this._beforeDeactivateCallCount++;
		},
		afterActivate: function ( /*previousView, viewData*/ ) {
			//console.log("app-view:", "afterActivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(previousView ? previousView.id : "") + "] with viewData=", viewData);
			this._afterActivateCallCount++;
			this.app.emit("afterActivateCalled", {
				view: this
			});
		},
		afterDeactivate: function ( /*nextView*/ ) {
			//console.log("app-view:", "afterDeactivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(nextView ? nextView.id : "") + "]");
			this._afterDeactivateCallCount++;
		},
		destroy: function () {
			//console.log("app-view:", " in [" + this.viewName + "] destroy called for [" + this.id + "]");
		}
	};
});