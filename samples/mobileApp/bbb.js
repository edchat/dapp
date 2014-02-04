define(["dojo/dom", "dojo/on", "delite/register"], function (dom, on, register) {
    return {
        attributes: {
            testStringReplace: "xAZZZZed",
            "beforeActivateStatus": "none",
            "beforeDeactivateStatus": "none",
            "afterActivateStatus": "none",
            "afterDeactivateStatus": "none",
            "currentStatus": "test"
        },
        currentStatus: "testxxx",
        beforeActivateCallCount: 0,
        beforeDeactivateCallCount: 0,
        afterActivateCallCount: 0,
        afterDeactivateCallCount: 0,
        constructor: function (params) { // jshint unused:false
            console.log("dapp/View:constructor called for " + this.id);
        },

        init: function (previousView, data) {
            console.log("in bbb.js init called");
            //	this.attributes.testStringReplace="yyyyed";
            //	this.domNode.currentStatus = this.domNode.currentStatus + "-init called";
        },
        beforeActivate: function (previousView, data) {
            console.log("in bbb.js beforeActivate called");
            //	this.beforeActivateCallCount++;
            //	this.domNode.beforeActivateStatus = "called "+this.beforeActivateCallCount+" times";
        },
        beforeDeactivate: function (previousView, data) {
            console.log("in bbb.js beforeDeactivate called previousView=", previousView);
            //	this.beforeDeactivateCallCount++;
            //	this.domNode.beforeDeactivateStatus = "called "+this.beforeDeactivateCallCount+" times";
        },
        afterActivate: function (previousView) {
            console.log("in bbb.js afterActivate called");
            //	this.afterActivateCallCount++;
            //	this.domNode.afterActivateStatus = "called "+this.afterActivateCallCount+" times";
        },
        afterDeactivate: function (previousView) {
            console.log("in bbb.js afterDeactivate called previousView=", previousView);
            //	this.afterDeactivateCallCount++;
            //	this.domNode.afterDeactivateStatus = "called "+this.afterDeactivateCallCount+" times";
        }
    };
});
