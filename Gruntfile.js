/**
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
/*global module*/
"use strict";
module.exports = function (grunt) {
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
                    "dist/console-helper.min.js": ["src/console-helper.js"]
                }
            }
        },
        eslint: {
            target: ["src/**/*.js", "Gruntfile.js"]
        }
    });

    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-eslint");
};
