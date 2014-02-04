define(["dojo/dom", "dojo/on"], function (dom, on) {
    return {
        init: function (previousView, data) {
            console.log("in main.js init called");
        },
        beforeActivate: function (previousView, data) {
            console.log("in main.js beforeActivate called");
        }
    };
});
