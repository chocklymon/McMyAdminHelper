/*!
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

/*global module*/
"use strict";

module.exports = function (grunt) {

    //-------------------------------
    // Load Templates
    //-------------------------------

    // User Script Header
    var userScriptHeader = grunt.file.read("src/templates/userScriptHeader.tpl.txt");

    // Handles the page injection wrapper
    var injector = (function () {
        var templateParts = null,
            separator = /\/\*!code injection (start|end)\*\//g,
            getTemplate = function () {
                if (!templateParts) {
                    var templateFile = grunt.file.read("src/templates/pageInjection.tpl.js");
                    templateParts = templateFile.split(separator);
                }
                return templateParts;
            };

        return {
            header: function () {
                // Return the first part of the template
                return getTemplate()[0];
            },
            footer: function () {
                // Return the last section of the template
                var template = getTemplate();
                return template[template.length - 1];
            }
        };
    })();


    //-------------------------------
    // Initialize the Configuration
    //-------------------------------

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            options: {
                banner: "/*! <%= pkg.name %> v<%= pkg.version %> | (c) <%= grunt.template.today('yyyy') %> <%= pkg.author %> | License: <%= pkg.license %> */",
                sourceMap: true,
                maxLineLen: 4096,
                screwIE8: true
            },
            dist: {
                files: {
                    "dist/console-helper.min.js": ["dist/console-helper.js"]
                }
            },
            userScript: {
                files: {
                    "dist/console-helper.min.user.js": ["dist/console-helper.user.js"]
                },
                options: {
                    banner: userScriptHeader,
                    sourceMap: false
                }
            }
        },
        jasmine: {
            base: {
                src: "src/*.js",
                options: {
                    specs: "tests/*Test.js"
                }
            }
        },
        requirejs: {
            compile: {
                options: {
                    baseUrl: "src",
                    findNestedDependencies: true,
                    optimize: "none",
                    paths: {
                        "jQuery": "wrappers/jQuery",
                        "$window": "wrappers/$window"
                    },
                    mainConfigFile: "src/console-helper.js",
                    name: "console-helper",
                    out: "dist/console-helper.js",
                    onModuleBundleComplete: function (data) {
                        // Run AMD clean to remove the need to for the AMD function definitions
                        var fs = module.require("fs"),
                            amdclean = module.require("amdclean"),
                            outputFile = data.path,
                            cleanedCode = amdclean.clean({
                                "filePath": outputFile,
                                "wrap": {
                                    "start": grunt.template.process(injector.header()),
                                    "end": grunt.template.process(injector.footer())
                                }
                            });

                        fs.writeFileSync(outputFile, cleanedCode);
                    }
                }
            },
            userScript: {
                options: {
                    baseUrl: "src",
                    findNestedDependencies: true,
                    optimize: "none",
                    paths: {
                        "jQuery": "wrappers/jQuery",
                        "$window": "wrappers/$window"
                    },
                    mainConfigFile: "src/console-helper.js",
                    name: "console-helper",
                    out: "dist/console-helper.user.js",
                    onModuleBundleComplete: function (data) {
                        // Run AMD clean to remove the need to for the AMD function definitions
                        var fs = module.require("fs"),
                            amdclean = module.require("amdclean"),
                            outputFile = data.path,
                            cleanedCode = amdclean.clean({
                                "filePath": outputFile,
                                "wrap": {
                                    "start": grunt.template.process(userScriptHeader) + "\n" + grunt.template.process(injector.header()),
                                    "end": grunt.template.process(injector.footer())
                                }
                            });

                        fs.writeFileSync(outputFile, cleanedCode);
                    }
                }
            }
        },
        eslint: {
            target: ["src/**/*.js", "tests/**/*.js", "Gruntfile.js"]
        }
    });


    //-------------------------------
    // Setup the Tasks
    //-------------------------------

    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-jasmine");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-eslint");

    grunt.registerTask("dist", "Build the files for use", ["requirejs:compile", "requirejs:userScript", "uglify:dist", "uglify:userScript"]);
    grunt.registerTask("lint", "Alias for eslint task", ["eslint"]);
    grunt.registerTask("default", ["eslint", "dist"]);
};
