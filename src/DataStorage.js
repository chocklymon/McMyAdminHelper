/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

define(["$window"], function ($window) {
    "use strict";

    var
        /** The key used to retrieve and set data from the local storage object. */
        storageKey = "cdata",
        storage = $window.localStorage,
        get = function (key, defaultValue) {
            var data = JSON.parse(storage.getItem(storageKey));
            if (!key) {
                return data;
            } else if (!data || !data[key]) {
                return defaultValue;
            } else {
                return data[key];
            }
        },
        set = function (key, value) {
            var data = get();
            if (!data) {
                data = {};
            }
            data[key] = value;
            storage.setItem(storageKey, JSON.stringify(data));
        },
        clear = function (key) {
            if (!key) {
                storage.removeItem(storageKey);
            } else {
                var data = get();
                if (!data) {
                    // Do nothing if there is no data
                    return;
                }
                delete data[key];
                storage.setItem(storageKey, JSON.stringify(data));
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
