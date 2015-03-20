/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

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
        contextMenu.empty();
        ch.attachCommands(
            contextMenu,
            data.get(data.key.playerCommands, []),
            ch.runPlayerCommand,
            "<div>"
        );

        // Attach the commands
        var cmndDiv = $("#ch-cmnds");
        cmndDiv.empty();

        // General Commands
        ch.attachCommands(
            cmndDiv,
            data.get(data.key.generalCommands, []),
            ch.runGeneralCommand
        );

        // Insert a spacer between the two command types if we have both types of commands
        if (data.get(data.key.generalCommands, []).length > 0
            && data.get(data.key.quickCommands, []).length > 0
        ) {
            cmndDiv.append($("<div>").addClass("ch-h-spacer"));
        }

        // Quick Commands
        ch.attachCommands(
            cmndDiv,
            data.get(data.key.quickCommands, []),
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
            ch.mergeDefaults(data.get(data.key.filters, []), ch.filterDefaults),
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
        ch.buildTable("ch-pcmnds", data.get(data.key.playerCommands, []), ch.commandTableLayout);
        ch.buildTable("ch-gcmnds", data.get(data.key.generalCommands, []), ch.commandTableLayout);
        ch.buildTable("ch-qcmnds", data.get(data.key.quickCommands, []), ch.commandTableLayout);
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
        var filters = data.get(data.key.filters, []),
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
        contextMenu.close();
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




