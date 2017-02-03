/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2017 Curtis Oakley
 * Licensed under the MIT license.
 */
/* global DataStorage:false Notify:false Utils:false */

var Filters = (function () {
    "use strict";

    var filterDefaults = {
        modifiers: "gi",
        alert: false,
        count: false,
        replace: "<b>$1</b>"
    };

    /** Stores the counts for counted filters. */
    var count = {};

    /** Stores how long counts should be stored in seconds. */
    var countDuration = 300; // 5 minutes


    function colorize(text) {
        var regex = /(&[0-9a-fk-or])[^;]{3}/g,
            result,
            style,
            styleTag,
            resetCount = 0;

        while ((result = regex.exec(text)) != null) {
            switch (result[1]) {
                case "&0":
                    style = "black";
                    break;

                case "&1":
                    style = "dark-blue";
                    break;

                case "&2":
                    style = "dark-green";
                    break;

                case "&3":
                    style = "dark-aqua";
                    break;

                case "&4":
                    style = "dark-red";
                    break;

                case "&5":
                    style = "dark-purple";
                    break;

                case "&6":
                    style = "gold";
                    break;

                case "&7":
                    style = "gray";
                    break;

                case "&8":
                    style = "dark-gray";
                    break;

                case "&9":
                    style = "blue";
                    break;

                case "&a":
                    style = "green";
                    break;

                case "&b":
                    style = "aqua";
                    break;

                case "&c":
                    style = "red";
                    break;

                case "&d":
                    style = "light-purple";
                    break;

                case "&e":
                    style = "yellow";
                    break;

                case "&f":
                    style = "white";
                    break;

                case "&k":
                    style = "obfuscated";
                    break;
                case "&l":
                    style = "bold";
                    break;

                case "&m":
                    style = "strikethrough";
                    break;

                case "&n":
                    style = "underline";
                    break;

                case "&o":
                    style = "italic";
                    break;

                case "&r":
                    style = false;
                    break;
            }
            if (style === false) {
                // Reset
                styleTag = "";
                for (; resetCount > 0; resetCount--) {
                    styleTag += "</span>";
                }
            } else {
                styleTag = '<span class="ch-' + style + '">';
                resetCount++;
            }
            text = text.substring(0, result.index) + styleTag + "<small>§" + result[1][1] + "</small>" + text.substring(result.index + 2);
        }

        // Close any open style tags
        for (; resetCount > 0; resetCount--) {
            text += "</span>";
        }
        return text;
    }

    /**
     * Increments the count for the provided message filter.
     * @param {object} filter The message filter.
     * @param {string} message The message causing the increment.
     */
    function incrementCount(filter, message) {
        // Use the hexadecimal hash of the regex as the key
        var key = Utils.hash(filter.regex).toString(16),
            // Get the current timestamp in seconds.
            now = Math.round(Date.now() / 1000);

        // Make sure we have an array.
        if (!count[key]) {
            count[key] = [];
        }

        count[key].push({msg: message, time: now});

        // Remove old values
        $.each(count, function (index, value) {
            for (var i = 0; i < value.length; i++) {
                if (value[i].time < (now - countDuration)) {
                    // Remove the value
                    value.splice(i, 1);
                }
            }
        });

        // Notify the user if the count for the filter has been met or exceeded.
        if (count[key].length >= filter.count) {
            Notify.alert("Count Alert", message);

            // Remove all values for the count so the count resets to 0
            delete count[key];
        }
    }

    /**
     * Process a chat message for input into a row.
     * @param {string} text The message to process
     * @return {string} The message ready for input as an HTML message.
     */
    function processMessage(text) {
        var filters = DataStorage.get(DataStorage.key.filters, []),
            filter,
            regex;

        // Escape any HTML entities
        text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Process any message notifications.
        for (var i = 0; i < filters.length; i++) {
            try {
                filter = $.extend({}, filterDefaults, filters[i]);

                regex = new RegExp(filter.regex, filter.modifiers);

                // See if we have a match
                if (regex.test(text)) {
                    // Replace the text
                    text = text.replace(regex, filter.replace);

                    // Pop a notification if needed
                    if (filter.alert) {
                        Notify.alert("Chat Message Alert", text);
                    }

                    // Increment the count of this filter if needed.
                    if (filter.count) {
                        incrementCount(filter, text);
                    }
                }
            } catch (exception) {
                Notify.error("Problem processing message", exception);
            }
        }

        if (DataStorage.get(DataStorage.key.colorize, false)) {
            text = colorize(text);
        }

        return text;
    }

    return {
        processMessage: processMessage,
        defaults: filterDefaults
    };
})();
