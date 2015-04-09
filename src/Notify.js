/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
define(["$window", "Utils"], function ($window, Utils) {
    "use strict";

    // TODO chrome notifications, play sound, popup option.
    // TODO have a better way to ID notifications to prevent duplicates?

    var noOp = function () {},

        // Default alert function - Opens a pop-up window.
        alert = function (title, message) {
            var id = Utils.hash(message);

            // Generate the popup window
            var popup = $window.open(
                "",
                "alert-" + id,
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
            if ($window.Notification) {
                return $window.Notification;

            // Firefox < 22 fallback
            } else if (navigator && "mozNotification" in navigator) {
                return navigator.mozNotification;

            // No notifications
            } else {
                return null;
            }
        })(),

        cnsle = (function () {
            if ($window.console) {
                return $window.console;
            } else {
                return {
                    log: noOp,
                    error: noOp,
                    info: noOp
                };
            }
        })(),

        // User notification handler
        notify = {
            "alert": alert,
            "log": function () {
                cnsle.log.apply(null, arguments);
            }
        };



    // See if we can use the notifications api
    if(Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function (permission) {
            if (permission === "granted") {
                // Notification permission is granted.
                // Replace the alert function with the notifications ones
                notify.alert = function (title, msg) {
                    var n = new Notification(title, {
                        body: msg,
                        tag: Utils.hash(title)
                    });
                    n.onerror(function (error) {
                        notify.log(error);
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
        alert: notify.alert,

        /**
         * Log a message
         */
        log: notify.log
    };
});
