/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
define(["jQuery"], function ($) {
    "use strict";

    return {
        /**
         * Creates a hash from a string. This is not a cryptographically safe,
         * just a very basic hash generation function.
         * @param {string} input The string to get the has for.
         */
        hash: function (input) {
            var hash = 0,
                l = input.length,
                character;

            for (var i = 0; i < l; i++) {
                character = input.charCodeAt(i);
                hash = ((hash << 5) - hash) + character;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        },


        /**
         * Merges each of the objects in the data array with the provided defaults.
         * @param {array} data
         * @param {object} defaults
         * @returns {array}
         */
        mergeDefaults: function (data, defaults) {
            var merged = [];
            for (var i = 0; i < data.length; i++) {
                merged[i] = $.extend({}, defaults, data[i]);
            }
            return merged;
        }
    };
});
