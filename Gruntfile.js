/*global module */
module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: [
				"Gruntfile.js",
				"*.js", // this will get things in dapp directory
				"controllers/**/*.js",
				"utils/**/*.js",
				"modules/**/*.js",
				"widgets/**/*.js" //,
				//"tests/**/*.js",
				//"samples/**/*.js"
			],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		// Before generating any new files, remove any previously-created files.
		clean: {
			tests: ["tmp"]
		},

		jsbeautifier: {
			files: ["Gruntfile.js",
				"*.js", // this will get things in dapp directory
				//"controllers/delite/*.js"
				"controllers/*.js", // jsbeautifier was causing a problem with HistoryHash
				"utils/**/*.js",
				"modules/**/*.js",
				"widgets/**/*.js",
				"tests/**/*.js",
				"samples/**/*.js"
			],
			options: {
				config: ".jshintrc",
				js: {
					jslintHappy: true,
					indentWithTabs: true
				}
			}
		}
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jsbeautifier");

	// By default, lint and run all tests.
	grunt.registerTask("default", ["jsbeautifier", "jshint"]);

};
