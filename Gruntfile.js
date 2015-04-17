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
        concat: {
            options: {
                stripBanners: true,
                process: function (src, filepath) {
                    // Remove all "use strict" flags in the processed files. There should be one in the banner only.
                    // Regex, capture "use strict" and replace it with just whitespace (if any).
                    var useStrictRegex = /(^|\n)[ \t]*('use strict'|"use strict");?\s*/g;
                    return "\n// Source: " + filepath + "\n" + src.replace(useStrictRegex, "$1");
                }
            },
            dist: {
                options: {
                    banner: injector.header(),
                    footer: injector.footer()
                },
                src: ["src/Utils.js", "src/DataStorage.js", "src/CommandHistory.js", "src/ContextMenu.js", "src/Notify.js", "src/console-helper.js"],
                dest: "dist/console-helper.js"
            },
            userScript: {
                options: {
                    banner: userScriptHeader + "\n" + injector.header(),
                    footer: injector.footer()
                },
                src: ["src/Utils.js", "src/DataStorage.js", "src/CommandHistory.js", "src/ContextMenu.js", "src/Notify.js", "src/user_script/*.js", "src/console-helper.js"],
                dest: "dist/console-helper.user.js"
            }
        },
        uglify: {
            options: {
                banner: "/*! <%= pkg.name %> v<%= pkg.version %> | (c) <%= grunt.template.today('yyyy') %> <%= pkg.author %> | License: <%= pkg.license %> */",
                sourceMap: true,
                maxLineLen: 4096,
                mangle: {
                    toplevel: true
                },
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
        compress: {
            chromeExtension: {
                options: {
                    archive: "dist/chrome-extension.zip",
                    mode: "zip"
                },
                files: [
                    {
                        src: ["console-helper.js", "console-helper.min.js", "console-helper.min.js.map", "manifest.json"],
                        cwd: "dist",
                        expand: true
                    },
                    {
                        src: ["**", "!**.tpl.*"],
                        cwd: "src/chrome_extension",
                        expand: true
                    },
                    {
                        src: ["**/*"],
                        cwd: "src/assets/css",
                        expand: true
                    },
                    {
                        src: ["**/*"],
                        cwd: "src/assets/images",
                        expand: true
                    }
                ]
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
        eslint: {
            target: ["src/**/*.js", "tests/**/*.js", "Gruntfile.js"]
        }
    });

    grunt.registerTask("chromeExtension", "Prepares the chrome extension manifest", function () {
        var manifestFile = grunt.file.read("src/chrome_extension/manifest.tpl.json");
        manifestFile = grunt.template.process(manifestFile);
        grunt.file.write("dist/manifest.json", manifestFile);
    });


    //-------------------------------
    // Setup the Tasks
    //-------------------------------

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-jasmine");
    grunt.loadNpmTasks("grunt-eslint");

    grunt.registerTask(
        "dist",
        "Build the files for use",
        ["chromeExtension", "concat:dist", "concat:userScript", "uglify:dist", "uglify:userScript", "compress:chromeExtension"]
    );
    grunt.registerTask("lint", "Alias for eslint task", ["eslint"]);
    grunt.registerTask("default", ["eslint", "dist"]);
};
