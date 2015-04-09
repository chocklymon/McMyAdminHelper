/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

define(["$window"], function ($window) {
    "use strict";

    /** The key used to retrieve and set data from the local storage object. */
    var localStorageKey = "cdata",
        get = function (key, defaultValue) {
            var datum = JSON.parse($window.localStorage.getItem(localStorageKey));
            if (!key) {
                return datum;
            } else if (!datum || !datum[key]) {
                return defaultValue;
            } else {
                return datum[key];
            }
        },
        set = function (key, value) {
            var datum = get();
            if (!datum) {
                datum = {};
            }
            datum[key] = value;
            $window.localStorage.setItem(localStorageKey, JSON.stringify(datum));
        },
        clear = function (key) {
            if (!key) {
                $window.localStorage.removeItem(localStorageKey);
            } else {
                var datum = get();
                if (!datum) {
                    // Do nothing if there is no data
                    return;
                }
                delete datum[key];
                $window.localStorage.setItem(localStorageKey, JSON.stringify(datum));
            }
        };

    /** Stores the names of keys used to get and set data from localStorage. */
    return {
        key: {
            generalCommands: "gcmnds",
            quickCommands: "qcmnds",
            playerCommands: "pcmnds",
            filters: "filters"
        },

        /**
         * Clears a value from local storage.
         * @param {string} key Optional, deletes the key and it's value from local
         */
        clear: clear,

        /**
         * Gets a piece of data from local storage.
         * @param {string} key The key for the data. If not provided then this returns
         * all stored data.
         * @param {mixed} defaultValue The value to return if the key has no value.
         * @returns {mixed}
         */
        get: get,

        /**
         * Sets a value to local storage.
         * @param {string} key The key for the value.
         * @param {mixed} value The data to store.
         */
        set: set
    };
});
