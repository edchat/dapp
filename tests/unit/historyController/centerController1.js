define([], function () {
	return {
		name: "",
		_beforeActivateCallCount: 0,
		_beforeDeactivateCallCount: 0,
		_afterActivateCallCount: 0,
		_afterDeactivateCallCount: 0,
		init: function () {
			this.name = this.id;
		},
		beforeActivate: function ( /*previousView, viewData*/ ) {
			//console.log("app-view:", "beforeActivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(previousView ? previousView.id : "") + "] with viewData=", viewData);
			this._beforeActivateCallCount++;
			if (this.id === "center1") {
				this.style.backgroundColor = "cyan";
			} else {
				this.style.backgroundColor = "green";
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
		},
		afterDeactivate: function ( /*nextView*/ ) {
			//console.log("app-view:", "afterDeactivate called for [" + this.viewName + "] with previousView.id =[" +
			//	(nextView ? nextView.id : "") + "]");
			this._afterDeactivateCallCount++;
		}
	};
});
