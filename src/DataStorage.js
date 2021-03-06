/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015-2016 Curtis Oakley
 * Licensed under the MIT license.
 */

var DataStorage = (function ($window) {
    "use strict";

    var
        /** The key used to retrieve and set data from the local storage object. */
        storageKey = "cdata",
        data,
        storage = $window.localStorage;

    function clear(key) {
        if (!key) {
            storage.removeItem(storageKey);
            data = null;
        } else {
            retrieve();
            if (!data) {
                // Do nothing if there is no data
                return;
            }
            delete data[key];
            persist();
        }
    }

    function get(key, defaultValue, forceRefresh) {
        retrieve(forceRefresh);
        if (!key) {
            return data;
        } else if (!data || !data[key]) {
            return defaultValue;
        } else {
            return data[key];
        }
    }

    function persist() {
        storage.setItem(storageKey, JSON.stringify(data));
    }

    function retrieve(forceRefresh) {
        if (!data || forceRefresh) {
            data = JSON.parse(storage.getItem(storageKey));
            if (!data) {
                data = {};
            }
        }
    }

    function set(key, value) {
        retrieve();
        data[key] = value;
        persist();
    }

    /** Stores the names of keys used to get and set data from localStorage. */
    return {
        key: {
            generalCommands: "gcmnds",
            quickCommands: "qcmnds",
            playerCommands: "pcmnds",
            filters: "filters",
            colorize: "colorize"
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
         * @param {boolean} forceRefresh Force the data to be reloaded from the data store.
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
})(window);
