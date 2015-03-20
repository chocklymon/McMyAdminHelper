/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

ch.data = (function () {

    /** The key used to retrieve and set data from the local storage object. */
    var localStorageKey = "cdata";

    /** Stores the names of keys used to get and set data from localStorage. */
    return {
        key: {
            generalCommands: "gcmnds",
            quickCommands: "qcmnds",
            playerCommands:  "pcmnds",
            filters: "filters"
        },

        /**
         * Clears a value from local storage.
         * @param {string} key Optional, deletes the key and it's value from local
         */
        clear: function (key) {
            if (!key) {
                localStorage.removeItem(localStorageKey);
            } else {
                var data = ch.data.get();
                if (!data) {
                    // Do nothing if there is no data
                    return;
                }
                delete data[key];
                localStorage.setItem(localStorageKey, JSON.stringify(data));
            }
        },

        /**
         * Gets a piece of data from local storage.
         * @param {string} key The key for the data. If not provided then this returns
         * all stored data.
         * @param {mixed} defaultValue The value to return if the key has no value.
         * @returns {mixed}
         */
        get: function (key, defaultValue) {
            var data = JSON.parse(localStorage.getItem(localStorageKey));
            if (!key) {
                return data;
            } else if (!data || !data[key]) {
                return defaultValue;
            } else {
                return data[key];
            }
        },

        /**
         * Sets a value to local storage.
         * @param {string} key The key for the value.
         * @param {mixed} value The data to store.
         */
        set: function (key, value) {
            var data = ch.data.get();
            if (!data) {
                data = {};
            }
            data[key] = value;
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        }
    };
})();