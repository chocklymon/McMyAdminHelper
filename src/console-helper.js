// ==UserScript==
// @name McMyAdmin Console Helper
// @description Adds additional functionality to the McMyAdmin console page.
// @author Curtis Oakley
// @version 0.2.3
// @match http://72.249.124.178:25967/*
// @namespace http://72.249.124.178:25967/
// ==/UserScript==

/* TODO:
 * - Prevent chat message parsing when first loading?
 *
 * - Notification API http://davidwalsh.name/notifications-api
 */

/*
Message Filters
- Template -
{regex:"",modifiers:"",replace:"",alert:false,count:false}

- My User Name -
{regex:"(fred|waffle|console)",replace:"<i>$1</i>"}

See the default generator for more.
*/

// Globals from McMyAdmin JS
/* global parseDate parseBool ScrollChat showModal Icons hideModal requestData APICommands */
// Wrap everything inside of an anonymous function
var chMain = function ($) {
    "use strict";

    // Create the console helper object
    var ch = {

        /* ----------------------------- *
         *  VARIABLES AND CONFIGURATION  *
         * ----------------------------- */

        /** The defaults for message filter processing. */
        filterDefaults: {
            modifiers: "gi",
            alert: false,
            count: false,
            replace: "<b>$1</b>"
        },

        /** Defines the tables layout used to display commands. */
        commandTableLayout: {
            "Command": {
                value: "cmnd",
                append: "/"
            },
            "Name": "text"
        },

        /** Stores the counts for counted filters. */
        count: {},

        /** Stores how long counts should be stored in seconds. */
        countDuration: 300, // 5 minutes

        /**
         * Stores the name of the player that is being used for the player context
         * menu commands.
         */
        player: "",


        /* ----------------------------- *
         *            OBJECTS            *
         * ----------------------------- */

        history: {

            /** Stores what command in the sent commands is currently being looked at. */
            current: 0,

            /** Used to store any text currently in the input box. */
            tempCommand: "",

            /** The maximum number of commands to store. */
            maxCommands: 20,

            /** Store commands and messages that have been sent to the server. */
            sentCommands: [],

            /**
             * Add a command to the list of used commands.
             * @param {string} command The command to add.
             */
            add: function (command) {
                // Don't store a command that is the same as the last one.
                if (ch.history.sentCommands[ch.history.sentCommands.length - 1] === command) {
                    return;
                }

                // Store the command
                ch.history.sentCommands.push(command);

                // Remove old commands as needed
                if (ch.history.sentCommands.length > ch.history.maxCommands) {
                    ch.history.sentCommands.shift();
                }

                // Reset the current command pointer
                ch.history.current = ch.history.sentCommands.length;
            },

            /**
             * Indicates if the history has a previous command.
             * @returns {Boolean} True if there is a previous command.
             */
            hasPrev: function () {
                return ch.history.current > 0;
            },

            /**
             * Incdicates if the history has a next command.
             * @returns {Boolean} True if the history has a next command
             */
            hasNext: function () {
                return ch.history.current < ch.history.sentCommands.length;
            },

            /**
             * The previous entered command.
             * @returns {string} The previous command.
             */
            prev: function () {
                if (ch.history.current === ch.history.sentCommands.length) {
                    // Store the current command into history
                    ch.history.tempCommand = $("#chatEntryBox").val();
                }

                if (ch.history.hasPrev()) {
                    ch.history.current--;
                }

                return ch.history.sentCommands[ch.history.current];
            },

            /**
             * The next command that was entered.
             * @returns {string} The next command.
             */
            next: function () {
                if (ch.history.hasNext()) {
                    ch.history.current++;
                }

                if (ch.history.current === ch.history.sentCommands.length) {
                    return ch.history.tempCommand;
                }

                return ch.history.sentCommands[ch.history.current];
            }
        },

        data: {

            /** The key used to retrieve and set data from the local storage object. */
            localStorageKey: "cdata",

            /** Stores the names of keys used to get and set data from localStorage. */
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
            clear: function (key) {
                if (!key) {
                    localStorage.removeItem(ch.data.localStorageKey);
                } else {
                    var data = ch.data.get();
                    if (!data) {
                        // Do nothing if there is no data
                        return;
                    }
                    delete data[key];
                    localStorage.setItem(ch.data.localStorageKey, JSON.stringify(data));
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
                var data = JSON.parse(localStorage.getItem(ch.data.localStorageKey));
                if (!key) {
                    return data;
                } else if(!data || !data[key]) {
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
                localStorage.setItem(ch.data.localStorageKey, JSON.stringify(data));
            }
        },

        menu: (function () {

            /** Create the context menu HTML element used for the player commands. */
            var contextMenu = $("<div>").attr("id", "ch-contextmenu"),

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
                    var menuWidth = contextMenu.width();
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
                    var menuHeight = contextMenu.height();
                    if (val + menuHeight > pageHeight) {
                        val -= menuHeight;
                    }
                    return val + "px";
                };

            // Attach the context menu to the page
            contextMenu.appendTo("body");

            return {

                /**
                 * Appends a menu item into the menu.
                 * @param content DOM element, array of elements, HTML string, or jQuery object to insert at the end of
                 * the current context menu items.
                 * @returns {jQuery}
                 */
                append: function (content) {
                    return contextMenu.append(content);
                },

                /**
                 * Closes the player context menu.
                 */
                close: function () {
                    contextMenu.hide();

                    // Unbind the on click listener
                    $("body").off("mousedown.ch.menu");
                },

                /**
                 * Removes all items from the context menu.
                 */
                empty: function () {
                    contextMenu.empty();
                },

                /**
                 * Open the player context menu
                 * @param event
                 */
                open: function (event) {
                    contextMenu.css({
                        left: getLeft(event),
                        top: getTop(event),
                        display: "block"
                    });

                    // Hide the context menu when it is open and the user clicks anything.
                    $("body").on("mousedown.ch.menu", function (bodyClickEvent) {
                        if ($(bodyClickEvent.target).parents("#ch-contextmenu").length === 0) {
                            ch.menu.close();
                        }
                    });
                }
            };
        })(),


        /* ----------------------------- *
         *           FUNCTIONS           *
         * ----------------------------- */

        addChatEntry: function (name, message, time, isChat) {
            // This is a modified version of the addChatEntry function found in
            // MyMcAdmin.js (version 2.4.9.4).
            message = ch.processMessage(message);

            if (message !== "") {
                var dateString = (typeof time === "string") ? parseDate(time).toLocaleTimeString() : (new Date()).toLocaleTimeString();

                var newLine = $("<div class=\"chatEntry\"></div>");
                newLine.data("isChat", parseBool(isChat));

                var chatBody = $("<div class=\"chatBody\"></div>");
                chatBody.append($("<div class=\"chatTimestamp\"></div>").text(dateString));
                chatBody.append($("<div class=\"chatNick\"></div>").text(" " + name + ": "));
                chatBody.append($("<div class=\"chatMessage\"></div>").html(message));

                newLine.append(chatBody);
                newLine.children("div.chatTimestamp:first").text(dateString);
                newLine.children("div.chatNick:first").text();
                newLine.children("div.chatMessage:first").html(message);

                if ($("#chatHistory").children("div").size() > 200) {
                    $("#chatHistory").children("div").first().remove();
                }

                $("#chatHistory").append(newLine);

                var hist = document.getElementById("chatHistory");

                if (ScrollChat) {
                    hist.scrollTop = hist.scrollHeight;
                }
            }
        },

        /**
         * Appends a series of HTML elements to run the supplied commands to a
         * jQuery HTML Element.
         * @param {jQuery} el The jQuery element to append the commands to.
         * @param {array} commands The array of command objects. Each command
         * object is attached to the element. The command objects should contain
         * a cmnd that specifies the command to run, and a text that is the
         * text to display to the user.
         * @param {function} callback The function to call when the command element
         * is clicked. Defaults to runGeneralCommand
         * @param {string} type The html element type to use when appending.
         * Defaults to "&lt;button&gt;".
         */
        attachCommands: function (el, commands, callback, type) {
            if (!callback) {
                callback = ch.runGeneralCommand;
            }
            if (!type) {
                type = "<button>";
            }
            for (var i = 0; i < commands.length; i++) {
                el.append(
                    $(type)
                        .text(commands[i].text)
                        .attr("data", commands[i].cmnd)
                        .click(callback)
                );
            }
        },

        /**
         * Attach the commands to the page. Call this to build/rebuild the command buttons
         * and player context menu.
         */
        buildCommands: function () {
            // Attach the context menu commands
            ch.menu.empty();
            ch.attachCommands(
                ch.menu,
                ch.data.get(ch.data.key.playerCommands, []),
                ch.runPlayerCommand,
                "<div>"
            );

            // Attach the commands
            var cmndDiv = $("#ch-cmnds");
            cmndDiv.empty();

            // General Commands
            ch.attachCommands(
                cmndDiv,
                ch.data.get(ch.data.key.generalCommands, []),
                ch.runGeneralCommand
            );

            // Insert a spacer between the two command types if we have both types of commands
            if (ch.data.get(ch.data.key.generalCommands, []).length > 0
                && ch.data.get(ch.data.key.quickCommands, []).length > 0
            ) {
                cmndDiv.append($("<div>").addClass("ch-h-spacer"));
            }

            // Quick Commands
            ch.attachCommands(
                cmndDiv,
                ch.data.get(ch.data.key.quickCommands, []),
                ch.runQuickCommand
            );
        },

        /**
         * Builds each of the contents of the tabs.
         */
        buildTabContents: function () {
            // Filters tab
            ch.buildTable(
                "ch-filters",
                ch.mergeDefaults(ch.data.get(ch.data.key.filters, []), ch.filterDefaults),
                {
                    "Match": {
                        "value": "regex",
                        "class": "ch-large"
                    },
                    "Match All": {
                        "type": "checkbox",
                        "value": function (data) {
                            return (data && data.indexOf("g") > -1);
                        },
                        "data": "modifiers",
                        "default": true,
                        "class": "ch-global-mod-flag"
                    },
                    "Ignore Case": {
                        "type": "checkbox",
                        "value": function (data) {
                            return (data && data.indexOf("i") > -1);
                        },
                        "data": "modifiers",
                        "default": true
                    },
                    "Replace": {
                        "value": "replace",
                        "class": "ch-medium"
                    },
                    "Alert": {
                        type: "checkbox",
                        value: "alert"
                    },
                    "Count": {
                        "value": function (data) {
                            if (data) {
                                return data;
                            } else {
                                return "";
                            }
                        },
                        "data": "count",
                        "class": "ch-tiny"
                    }
                }
            );

            // Command Tabs
            ch.buildTable("ch-pcmnds", ch.data.get(ch.data.key.playerCommands, []), ch.commandTableLayout);
            ch.buildTable("ch-gcmnds", ch.data.get(ch.data.key.generalCommands, []), ch.commandTableLayout);
            ch.buildTable("ch-qcmnds", ch.data.get(ch.data.key.quickCommands, []), ch.commandTableLayout);
        },

        /**
         * Builds a table into the given component. Note: any existing tables inside of the
         * html element will be removed and replaced with this one.
         * @param {string} tableId The HTML id of the element.
         * @param {object} data The data to put into the table.
         * @param {object} layout The table headers and content definitions. Used
         * to map the data to the table. Consists of labels : column definition.
         * @returns {undefined}
         */
        buildTable: function (tableId, data, layout) {
            // Initialize the variables
            var table = $("<table>"),
                header = $("<thead>"),
                body = $("<tbody>"),
                row,
                definitions = [],
                td;

            //   Construct the Header   //
            row = $("<tr>");

            // Add the actions column
            row.append("<th> </th>");
            // Add the headers
            $.each(layout, function (index, value) {
                row.append($("<th>").text(index));
                definitions.push(value);
            });
            header.append(row);

            //    Construct the Body    //
            if (data) {
                // Add the data
                $.each(data, function (index, value) {
                    body.append(
                        ch.buildRow(definitions, value)
                    );
                });
            }

            // Attach the add new row
            row = $("<tr>");
            td = $("<td>").attr("colspan", definitions.length + 1);
            td.append(
                $("<img>").attr({
                    "src": "http://chockly.org/ch/plus.png",// Modified Fuque Icon
                    "alt": "Add",
                    "class": "ch-add-new",
                    "title": "Add"
                })
                .data("columns", definitions)
                .click(function () {
                    var jThis = $(this);
                    var tr = jThis.parent().parent(),
                        columns = jThis.data("columns");

                    tr.before(ch.buildRow(columns));
                })
            );
            body.append(row.append(td));


            // Put it all together and attach to the page
            table.append(header);
            table.append(body);

            $("#" + tableId).find("table").remove();
            $("#" + tableId).append(table);
        },

        /**
         * Builds a row for the console helper manager interface's tables.
         * @param {array} columnDefinitions An array containing definitions for
         * each of the columns in the row.
         * @param {mixed} data The data to be inserted into the row. Optional, when
         * not set the default values for the inputs are used.
         * @returns {jQuery} The jQuery HTML element for the row.
         */
        buildRow: function (columnDefinitions, data) {
            var row = $("<tr>"),
                td,
                input,
                numColumns = columnDefinitions.length,
                definition,
                column,
                result;

            // Attach the delete row button
            row.append($("<td>").append(
                $("<img>")
                    .attr({
                        "src": "http://chockly.org/ch/minus.png",// Modified Fuque Icon
                        "alt": "Delete",
                        "class": "ch-delete",
                        "title": "Delete"
                    })
                    .click(ch.removeRow)
                )
            );

            // Loop through the layout values
            for (var i = 0; i < numColumns; i++) {
                td = $("<td>");
                input = $("<input>");
                definition = columnDefinitions[i];

                if (typeof definition === "object") {
                    column = $.extend({}, {
                        // Defaults
                        "type": "text",
                        "data": "",
                        "value": "",
                        "append": "",
                        "class": false,
                        "default": false
                    }, definition);

                    input.attr("type", column.type);

                    // Get the value for the input field //
                    if (data) {
                        // Value from the provided data
                        if (typeof column.value === "function") {
                            result = column.value(data[column.data]);
                        } else {
                            result = data[column.value];
                        }

                    // No value provided, get the default value
                    } else if (column["default"]) {
                        // Use the default
                        result = column["default"];

                    // No default provided
                    } else if (column.type === "checkbox") {
                        // Checkboxes default to false
                        result = false;
                    } else {
                        // Other inputs default to an empty value
                        result = "";
                    }

                    input.attr(
                        "name",
                        (typeof column.value === "function") ? column.data : column.value
                    );

                    if (column.type === "checkbox") {
                        // Checkbox type
                        input.prop("checked", result);
                    } else {
                        // Assume string type
                        input.attr("value", result);
                    }

                    // Append the pre-message
                    td.text(column.append);

                    // Attach the input class
                    if (column["class"]) {
                        input.addClass(column["class"]);
                    }
                } else {
                    // Simple text field

                    // Get the value
                    if (data) {
                        // Use the provided value
                        result = data[definition];
                    } else {
                        // Set the value to empty
                        result = "";
                    }

                    input.attr({
                        type: "text",
                        value: result,
                        name: definition
                    });
                }
                td.append(input);
                row.append(td);
            }

            return row;
        },

        closeManager: function () {
            $("#ch-manager").hide();
        },

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
         * Increments the count for the provided message filter.
         * @param {object} filter The message filter.
         * @param {string} message The message causing the increment.
         */
        incrementCount: function (filter, message) {
            // Use the hexadecimal hash of the regex as the key
            var key = ch.hash(filter.regex).toString(16),
                // Get the current timestamp in seconds.
                now = Math.round(Date.now() / 1000);

            // Make sure we have an array.
            if (!ch.count[key]) {
                ch.count[key] = [];
            }

            ch.count[key].push({msg: message, time: now});

            // Remove old values
            $.each(ch.count, function (index, value) {
                for (var i = 0; i < value.length; i++) {
                    if (value[i].time < (now - ch.countDuration)) {
                        // Remove the value
                        value.splice(i, 1);
                    }
                }
            });

            // Notify the user if the count for the filter has been met or exceeded.
            if (ch.count[key].length >= filter.count) {
                ch.notify("<b>Count Alert:</b><br>" + message);

                // Remove all values for the count so the count resets to 0
                delete ch.count[key];
            }
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
        },

        /**
         * Notifies the user of important events by opening a new window.
         * @param {string} message The message to display in the notification.
         */
        notify: function (message) {
            // TODO chrome notifications, play sound, popup option.
            // TODO have a better way to ID notifications to prevent duplicates?
            var id = ch.hash(message);

            // Generate the popup window
            var popup = window.open(
                "",
                "notify-" + id,
                "width=300,height=150,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0"
            );

            // Write the notification
            if (popup && popup.document) {
                popup.document.write("<!DOCTYPE HTML>"
                    + "<html>"
                    + "<head>"
                    + "<title>Alert</title><link href='http://chockly.org/ch/notify.css' rel='stylesheet' type='text/css' />"
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

        /**
         * Process a chat message for input into a row.
         * @param {string} text The message to process
         * @return {string} The message ready for input as an HTML message.
         */
        processMessage: function (text) {
            var filters = ch.data.get(ch.data.key.filters, []),
                filter,
                regex;

            // Escape any HTML entities
            text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // Process any message notifications.
            for (var i = 0; i < filters.length; i++) {
                filter = $.extend({}, ch.filterDefaults, filters[i]);

                regex = new RegExp(filter.regex, filter.modifiers);

                // See if we have a match
                if (regex.test(text)) {
                    // Replace the text
                    text = text.replace(regex, filter.replace);

                    // Pop a notification if needed
                    if (filter.alert) {
                        ch.notify("<b>Chat Message Alert:</b><br>" + text);
                    }

                    // Increment the count of this filter if needed.
                    if(filter.count) {
                        ch.incrementCount(filter, text);
                    }
                }
            }
            return text;
        },

        /**
         * Click event handler for delete buttons. Removes the row.
         * @param {object} event The event data.
         * @param {object} row The jQuery object for the row to remove.
         * When passed in this row will be removed without confirmation.
         */
        removeRow: function (event, row) {
            if (!row) {
                // No row provided, get the row from the image
                row = $(this).parent().parent();

                // If the row's first input method has data in it, confirm the deletion.
                if (row.find("input").first().val() !== "") {
                    // Use the show modal method from McMyAdmin for the confirmation
                    showModal(
                        "Confirm Delete",
                        "Are you sure you wish to delete this row?",
                        Icons.Question,
                        function () {
                            ch.removeRow(null, row);
                            hideModal();
                        },
                        hideModal
                    );
                    return;
                }
            }

            // Remove the row
            row.remove();
        },

        /**
         * Sets a command into the input text and then focuses on the input text
         * field.
         * @param {mixed} cmnd The command to input as a string, or the HTML
         * element that has a command in it's data attribute.
         * @param {boolean} append When true the text is placed at the beginning of
         * any existing input text, otherwise the text is replaced. See setInputText.
         */
        runCommand: function (cmnd, append) {
            if (typeof cmnd === "object") {
                // Try to get the command from the objects data attribute
                cmnd = $(cmnd).attr("data");
            }
            ch.setInputText(cmnd, append, false);

            // Focus on the input field
            $("#chatEntryBox").focus();
        },

        /**
         * Sets a command into the input box, and then immediatly runs the command.
         * @param {Event} event The event triggering this function.
         */
        runQuickCommand: function () {
            ch.sendCommand("/" + $(this).attr("data"));
        },

        /**
         * Sets a command into the input box, removing any current text.
         * @param {Event} event The event triggering this function.
         */
        runGeneralCommand: function () {
            ch.runCommand(this);
        },

        /**
         * Sets a command into the input box, and then closes the player context
         * menu.
         * @param {Event} event The event triggering this function.
         */
        runPlayerCommand: function (event) {
            var cmnd = $(event.target).attr("data");
            ch.runCommand(cmnd + " " + ch.player);

            // Close the context menu
            ch.menu.close();
        },


        /**
         * Send a command to the server.
         * @param {string} message The message to send to the server.
         */
        sendCommand: function (message) {
            // Use the McMyAdmin requestData function
            requestData(APICommands.SendChat, { Message: message }, null);
        },

        /**
         * Sets the input text.
         * @param {string} text The text to put into the input box.
         * @param {boolean} append When true the text is placed at the beginning of
         * any existing input text, otherwise the text is replaced.
         * @param {boolean} notCommand When true, the slash ('/') is not added
         * to the beginning of the text.
         * @returns {undefined}
         */
        setInputText: function (text, append, notCommand) {
            var chatBox = $("#chatEntryBox");
            if (!notCommand) {
                text = "/" + text;
            }
            text += " ";
            if (append) {
                text += chatBox.val();
            }
            chatBox.val(text);
        }

    };


    /* ----------------------------- *
     *              RUN              *
     * ----------------------------- */

    // USER SCRIPT SPECIFIC
    // Attach the CSS to the page
    $("head").append($("<link>").attr({
        href: "http://chockly.org/ch/console-helper.css",
        type: "text/css",
        rel: "stylesheet",
        media: "screen"
    }));
    // END - USER SCRIPT SPECIFIC

    if (!ch.data.get()) {
        // Initialize Defaults

        // General Commands
        ch.data.set(ch.data.key.generalCommands, [
            {cmnd: "say", text: "Say"}
        ]);

        // Quick Commands
        ch.data.set(ch.data.key.quickCommands, [
            {cmnd: "who", text: "Who"}
        ]);

        // Player Commands
        ch.data.set(ch.data.key.playerCommands, [
            {cmnd: "ban", text: "Ban"},
            {cmnd: "kick", text: "Kick"},
            {cmnd: "mute", text: "Mute"}
        ]);

        // Filters
        ch.data.set(ch.data.key.filters, [
            {   // URL creator
                regex: "(https?://\\w+\\.\\w+\\S+)",
                replace: "<a target='_blank' href=\"$1\">$1</a>"
            }
        ]);
    }


    //   Context Menu   //
    // Attach additional functionality to clicking on the player names
    $("#chatNames").click(function (event) {
            // Add the /msg command to the clicked on player
            var playerDiv = $(event.target);
            if (playerDiv.hasClass("chatName")) {
                ch.runCommand("msg " + playerDiv.text(), true);// TODO make this configurable
            }
        }).bind("contextmenu", function (event) {
            // Display the context menu
            var playerDiv = $(event.target);
            if (playerDiv.hasClass("chatName")) {
                ch.player = playerDiv.text();
                ch.menu.open(event);
                event.preventDefault();
            }
        });

    //   Command Buttons   //
    // Attach the command button holder
    $("#chatArea").append(
            $("<div>").attr("id", "ch-cmnds")
        );
    ch.buildCommands();


    //  Helper Manager Interface  //
    // Insert the helper manager interface into the page, with the filters tab selected by default.
    $("body").append(
  "<div id='ch-manager' class='modalbg modalnormal'>"
    + "<div class='modalpanel'>"
        + "<div class='ch-tabs modalcontents'>"
            + "<div class='subtabhead'>"
                + "<a href='#ch-filters' class='subtab picked'>Filters</a>"
                + "<a href='#ch-pcmnds'  class='subtab'>Player Commands</a>"
                + "<a href='#ch-gcmnds'  class='subtab'>General Commands</a>"
                + "<a href='#ch-qcmnds'  class='subtab'>Quick Commands</a>"
            + "</div>"
            + "<div id='ch-filters' class='subtabcontainer' style='display:block'><p>Create regular expression filters that are applied to the console messages. Checking alert will cause a window to popup when a message matches the filter. Count will cause an alert to display if the message is matched that many times in a five minute period.<br/>Help with regular expressions: <a href='http://net.tutsplus.com/tutorials/javascript-ajax/you-dont-know-anything-about-regular-expressions/' target='_blank'>Regular Expression Tutorial</a> &mdash; <a href='http://regexpal.com/' target='_blank'>Regular Expression Tester</a></p></div>"
            + "<div id='ch-pcmnds'  class='subtabcontainer'><p>These commands are available when right clicking on a player name in the sidebar. The player's name is added after the command.</p></div>"
            + "<div id='ch-gcmnds'  class='subtabcontainer'><p>These commands are added as buttons below the console input box.</p></div>"
            + "<div id='ch-qcmnds'  class='subtabcontainer'><p>These commands are added as buttons below the console input box and run when they are clicked on.</p></div>"
        + "</div>"
        + "<div class='modalbuttons'>"
            + "<button id='ch-save'>Save</button>"
            + "<button id='ch-cancel'>Cancel</button>"
            + "<button id='ch-close'>Close</button>"
        + "</div>"
    + "</div>"
+ "</div>"
    );

    // Build the tab contents
    ch.buildTabContents();

    // Save/Cancel button click event handlers
    $("#ch-save").click(function () {
        ch.closeManager();

        // Serialize and store the tabs
        var obj, jobj, value, name, modifiers = "";

        // Loop through each tab
        $.each(ch.data.key, function (tabIndex, key) {
            var contents = [];

            // Loop through each row
            $.each($("#ch-" + key + " tr"), function (rowIndex, row) {
                obj = {};

                // Loop through each input on the row
                $.each($(row).find("input"), function (inputIndex, input) {
                    jobj = $(input);
                    name = jobj.attr("name");
                    // TODO check for empty, we don"t need to store blank rows.

                    // Get the value of the input box
                    if (jobj.attr("type") === "checkbox") {
                        value = jobj.prop("checked");
                    } else {
                        value = jobj.val();
                    }

                    if (key === "filters") {
                        // Filters have special serialization needs

                        if (name === "count") {
                            // Count should be a number or false
                            value = (value === "") ? false : value * 1;
                            if (isNaN(value) || value <= 0) {
                                value = false;
                            }
                        } else if (name === "modifiers" && value) {
                            // Regex Modifier Flag
                            if (jobj.hasClass("ch-global-mod-flag")) {
                                // Global
                                modifiers += "g";
                            } else {
                                // Case Insensitive
                                modifiers += "i";
                            }
                            // Modifiers are handled later, exit for now
                            return;
                        }

                        // If the value is the same as the default, don't store it.
                        if (ch.filterDefaults[name] === value) {
                            return;
                        }
                    }
                    // Store the value
                    obj[name] = value;
                });
                if (!$.isEmptyObject(obj)) {
                    if (key === "filters" && modifiers !== ch.filterDefaults.modifiers) {
                        // Merge in the modifiers now
                        obj.modifiers = modifiers;
                    }
                    contents.push(obj);
                }
                modifiers = "";
            });

            // Store the serialized tab
            ch.data.set(key, contents);
        });

        // Rebuild the commands and tabs
        ch.buildCommands();
        ch.buildTabContents();
    });
    $("#ch-cancel").click(function () {
        ch.closeManager();

        // Rebuild the tabs so that any changes are lost
        ch.buildTabContents();
    });
    $("#ch-close").click(ch.closeManager);

    // Attach a user info link for opening the manager
    $("#userinfo")
        .append($("<span>").text(" | "))
        .append(
            $("<a>")
            .attr("href", "#console-helper")
            .click(function (event) {
                $("#ch-manager").show();
                event.preventDefault();
            })
            .text("Console Helper")
        );


    // Modify McMyAdmin Functionality //
    function modifyMcMyAdmin() {
        // Make sure that the add chat entry box has an event tied to it
        if ($._data($("#chatEntryBox")[0]).events) {
            // Replace the chat entry box event handler with our own
            $("#chatEntryBox").unbind("keypress").keypress(function (event) {
                    // This is a modified version of McMyAdmins event handler for this
                    // input box (v 2.4.4.0).
                    if (event.keyCode == "13") {
                        event.preventDefault();

                        var message = $(this).val();

                        ch.sendCommand(message);
                        ch.history.add(message);

                        $(this).val("");

                        if (message[0] === "/") {
                            ch.addChatEntry("Server", message, null, true);
                        }
                    }
                }).keyup(function (event) {
                    // Arrow UP
                    if (event.keyCode == 38 && ch.history.hasPrev()) {
                        $(this).val(ch.history.prev());

                    // Down Arrow
                    } else if (event.keyCode == 40 && ch.history.hasNext()) {
                        $(this).val(ch.history.next());
                    }
                });

            // Replace the current add chat row function with the modified one
            window.addChatEntry = ch.addChatEntry;

            // Bind the console helper's tabs to use McMyAdmins' tabbing functionality
            $("#ch-manager .subtab").mousedown(window.subTabClick);
            $("#ch-manager .subtab").click(window.nopFalse);

            console.log("Console Helper Loaded!");
        } else {
            // Wait half a second and try again
            setTimeout(modifyMcMyAdmin, 500);
        }
    }
    // This timeout is to help prevent the keypress event not being correctly unbound
    setTimeout(modifyMcMyAdmin, 2000);

    //*
    // Debugging Help
    // Uncomment to reveal the command helper to the window
    window.ch = ch;

    // */
};

// Inserts the main method into the page so that it can override javascript
// functions on the page.
var chathelper = document.createElement("script");
chathelper.type = "application/javascript";
chathelper.textContent = "jQuery(" + chMain.toString() + ");";
document.body.appendChild(chathelper);
