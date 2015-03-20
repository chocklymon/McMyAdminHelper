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

    // Handles the page injection wrapper
    var injector = (function () {
        var templateFile = null,
            separator = "/*!code*/",
            getTemplate = function () {
                if (!templateFile) {
                    templateFile = grunt.file.read("src/templates/pageInjection.tpl.js");
                }
                return templateFile;
            };

        return {
            header: function () {
                return getTemplate().split(separator)[0];
            },
            footer: function () {
                return getTemplate().split(separator)[1];
            }
        };
    })();


    //-------------------------------
    // Initialize the Configuration
    //-------------------------------

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        concat: {
            options: {
                process: function (src, filepath) {
                    // Remove all "use strict" flags in the processed files. There should be one in the banner only.
                    // Regex, capture "use strict" and replace it with just whitespace (if any).
                    var useStrictRegex = /(^|\n)[ \t]*('use strict'|"use strict");?\s*/g;
                    return "// Source: " + filepath + "\n" + src.replace(useStrictRegex, "$1");
                }
            },
            dist: {
                options: {
                    banner: injector.header(),
                    footer: injector.footer()
                },
                files: {
                    "dist/console-helper.js": ["src/*.js"]
                }
            }
        },
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
                    "dist/console-helper.min.user.js": ["dist/console-helper.js"]
                },
                options: {
                    banner: grunt.file.read("src/templates/userScriptHeader.tpl.txt"),
                    sourceMap: false
                }
            }
        },
        eslint: {
            target: ["src/**/*.js", "Gruntfile.js"]
        }
    });


    //-------------------------------
    // Setup the Tasks
    //-------------------------------

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-eslint");
};
