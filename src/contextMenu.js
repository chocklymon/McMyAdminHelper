/*!
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

ch.menu = (function () {
    "use strict";

    /** Create the context menu HTML element used for the player commands. */
    var menu = $("<div>").attr("id", "ch-contextmenu"),

        close = function () {
            menu.hide();

            // Unbind the on click listener
            $("body").off("mousedown.ch.menu");
        },

        /**
         * Gets the left position for the player context menu.
         * @param {event} event The event object that triggered the context menu to be
         * opened, used to get the position of the mouse.
         * @returns {String} The left position for the context menu in pixels.
         */
        getLeft = function (event) {
            var val = 0;
            if (event.pageX) {
                val = event.pageX;
            } else if (event.clientX) {
                val = event.clientX + (
                    // Compensate for horizontal scrolling
                    document.documentElement.scrollLeft
                        ? document.documentElement.scrollLeft
                        : document.body.scrollLeft
                );
            }
            // Make sure val is not off the edge of the page
            var pageWidth = $("body").width();
            var menuWidth = menu.width();
            if (val + menuWidth > pageWidth) {
                val -= menuWidth;
            }
            return val + "px";
        },

        /**
         * Gets the top position for the player context menu.
         * @param {event} event The event object that triggered the context menu to be
         * opened, used to get the position of the mouse.
         * @returns {String} The top position for the context menu in pixels.
         */
        getTop = function (event) {
            var val = 0;
            if (event.pageY) {
                val = event.pageY;
            } else if (event.clientY) {
                val = event.clientY + (
                    // Compensate for vertical scrolling
                    document.documentElement.scrollTop
                        ? document.documentElement.scrollTop
                        : document.body.scrollTop
                );
            }
            // Make sure val is not off the bottom of the page
            var pageHeight = $("body").height();
            var menuHeight = menu.height();
            if (val + menuHeight > pageHeight) {
                val -= menuHeight;
            }
            return val + "px";
        };

    // Attach the context menu to the page
    menu.appendTo("body");

    return {

        /**
         * Appends a menu item into the menu.
         * @param content DOM element, array of elements, HTML string, or jQuery object to insert at the end of
         * the current context menu items.
         * @returns {jQuery}
         */
        append: function (content) {
            return menu.append(content);
        },

        /**
         * Closes the player context menu.
         */
        close: close,

        /**
         * Removes all items from the context menu.
         */
        empty: function () {
            menu.empty();
        },

        /**
         * Open the player context menu
         * @param event
         */
        open: function (event) {
            menu.css({
                left: getLeft(event),
                top: getTop(event),
                display: "block"
            });

            // Hide the context menu when it is open and the user clicks anything.
            $("body").on("mousedown.ch.menu", function (bodyClickEvent) {
                if ($(bodyClickEvent.target).parents("#ch-contextmenu").length === 0) {
                    close();
                }
            });
        }
    };
})();
