/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
/* globals DataStorage Utils */
var Notify = (function ($window) {
    "use strict";

    // TODO chrome notifications, play sound, popup option.
    // TODO have a better way to identify notifications to prevent duplicates?

    var noOp = function () {},
        logs = [],
        lastHash,

        addLog = function (type, message) {
            // Push a new log
            logs.push({
                "type": type,
                "message": message,
                "timestamp": Date.now() // Unix timestamp in milliseconds
            });

            // Remove old logs if needed
            var maxLogSize = DataStorage.get("maxLogSize", 20);
            while (logs.length >= maxLogSize) {
                logs.shift();
            }
        },

        // Default alert function - Opens a pop-up window.
        alertUser = function (title, message, id) {
            // Generate the popup window
            var popup = $window.open(
                "",
                "ch-alert-" + id,
                "width=300,height=150,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0"
            );

            // Write the notification
            if (popup && popup.document) {
                popup.document.write("<!DOCTYPE HTML>"
                    + "<html>"
                    + "<head>"
                    + "<title>Notification - " + title + "</title>"
                    + "<link href='http://chockly.org/ch/notify.css' rel='stylesheet' type='text/css' />"
                    + "</head>"
                    + "<body>"
                    + "<div class='wrapper'><div class='message'>"
                    + message
                    + "</div></div>"
                    + "</body>"
                    + "</html>"
                );
            }
        },

        Notification = (function () {
            // Standard notifications
            if ("Notification" in $window) {
                return $window.Notification;

            // Mozilla Firefox < 22 fallback
            } else if (navigator && "mozNotification" in navigator) {
                return navigator.mozNotification;

            // Old webkit browsers fallback
            } else if ("webkitNotification" in $window) {
                return $window.webkitNotification;

            // No notifications
            } else {
                return null;
            }
        })(),

        cnsl = (function () {
            if ($window.console) {
                return $window.console;
            } else {
                // No console, return a mock one that does nothing
                return {
                    log: noOp,
                    info: noOp,
                    warn: noOp,
                    error: noOp
                };
            }
        })(),

        logger = function (type, args) {
            if (args.length && args.length == 1) {
                addLog(type, args[0]);
            } else {
                addLog(type, args);
            }

            cnsl[type].apply(null, args);
        };


    // See if we can use the Web Notifications API
    if (Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function (permission) {
            if (permission === "granted") {
                // Notification permission is granted.
                // Replace the alert function with the notifications ones
                alertUser = function (title, msg, id) {
                    var n = new Notification(title, {
                        body: msg,
                        tag: "ch" + id,
                        icon: "/Images/Logo256.png"
                    });
                    n.addEventListener("error", function (error) {
                        cnsl.log(error);
                    });
                };
            }
        });
    }

    return {
        /**
         * Alert the user of important events.
         * @param {string} title The title of the message.
         * @param {string} message The message to display in the notification.
         */
        "alert": function (title, message) {
            // Generate a unique ID for the alert
            var id = Utils.hash(title + message);

            // Only open the alert if the ID is different from the last, helps to prevent duplicates
            if (id !== lastHash) {
                lastHash = id;
                addLog("alert", title + ": " + message);
                alertUser(title, message, id);
            }
        },

        /**
         * Log a debug message
         */
        "log": function () {
            logger("log", arguments);
        },

        /**
         * Log an information message
         */
        "info": function () {
            logger("info", arguments);
        },

        /**
         * Log an warning message
         */
        "warn": function () {
            logger("warn", arguments);
        },

        /**
         * Log an error message
         */
        "error": function () {
            logger("error", arguments);
        },

        /**
         * Gets the logged messages.
         * @returns {object}
         */
        "getLogs": function () {
            return logs;
        }
    };
})(window);
