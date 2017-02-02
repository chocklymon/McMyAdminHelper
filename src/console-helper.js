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

//        [ - Globals from McMyAdmin JS                                                  ] [ - Local Globals                                                 ]
/* global parseDate parseBool ScrollChat Icons showModal hideModal requestData APICommands CommandHistory ContextMenu DataStorage Notify TableGenerator Utils */
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

    maxScrollBack: DataStorage.get("maxScrollBack", 200),


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

            if ($("#chatHistory").children("div").size() > ch.maxScrollBack) {
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
        ContextMenu.empty();
        ch.attachCommands(
            ContextMenu,
            DataStorage.get(DataStorage.key.playerCommands, []),
            ch.runPlayerCommand,
            "<div>"
        );

        // Attach the commands
        var cmndDiv = $("#ch-cmnds");
        cmndDiv.empty();

        // General Commands
        ch.attachCommands(
            cmndDiv,
            DataStorage.get(DataStorage.key.generalCommands, []),
            ch.runGeneralCommand
        );

        // Insert a spacer between the two command types if we have both types of commands
        if (DataStorage.get(DataStorage.key.generalCommands, []).length > 0
            && DataStorage.get(DataStorage.key.quickCommands, []).length > 0
        ) {
            cmndDiv.append($("<div>").addClass("ch-h-spacer"));
        }

        // Quick Commands
        ch.attachCommands(
            cmndDiv,
            DataStorage.get(DataStorage.key.quickCommands, []),
            ch.runQuickCommand
        );
    },

    /**
     * Builds each of the contents of the tabs.
     */
    buildTabContents: function () {
        // Filters tab
        TableGenerator.table(
            "ch-filters",
            Utils.mergeDefaults(DataStorage.get(DataStorage.key.filters, []), ch.filterDefaults),
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
        TableGenerator.table("ch-pcmnds", DataStorage.get(DataStorage.key.playerCommands, []), ch.commandTableLayout);
        TableGenerator.table("ch-gcmnds", DataStorage.get(DataStorage.key.generalCommands, []), ch.commandTableLayout);
        TableGenerator.table("ch-qcmnds", DataStorage.get(DataStorage.key.quickCommands, []), ch.commandTableLayout);
    },

    closeManager: function () {
        $("#ch-manager").hide();
    },

    /**
     * Increments the count for the provided message filter.
     * @param {object} filter The message filter.
     * @param {string} message The message causing the increment.
     */
    incrementCount: function (filter, message) {
        // Use the hexadecimal hash of the regex as the key
        var key = Utils.hash(filter.regex).toString(16),
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
            Notify.alert("Count Alert", message);

            // Remove all values for the count so the count resets to 0
            delete ch.count[key];
        }
    },

    colorize: function (text) {
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
    },

    /**
     * Process a chat message for input into a row.
     * @param {string} text The message to process
     * @return {string} The message ready for input as an HTML message.
     */
    processMessage: function (text) {
        var filters = DataStorage.get(DataStorage.key.filters, []),
            filter,
            regex;

        // Escape any HTML entities
        text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Process any message notifications.
        for (var i = 0; i < filters.length; i++) {
            try {
                filter = $.extend({}, ch.filterDefaults, filters[i]);

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
                        ch.incrementCount(filter, text);
                    }
                }
            } catch (exception) {
                Notify.error("Problem processing message", exception);
            }
        }

        if (DataStorage.get(DataStorage.key.colorize, false)) {
            text = ch.colorize(text);
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
        ContextMenu.close();
    },


    /**
     * Send a command to the server.
     * @param {string} message The message to send to the server.
     */
    sendCommand: function (message) {
        // Use the McMyAdmin requestData function
        requestData(APICommands.SendChat, {Message: message}, null);
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

/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

/* global contextMenu data commandHistory */

/* ----------------------------- *
 *              RUN              *
 * ----------------------------- */

if (!DataStorage.get()) {
    // Initialize Defaults

    // General Commands
    DataStorage.set(DataStorage.key.generalCommands, [
        {cmnd: "say", text: "Say"}
    ]);

    // Quick Commands
    DataStorage.set(DataStorage.key.quickCommands, [
        {cmnd: "who", text: "Who"}
    ]);

    // Player Commands
    DataStorage.set(DataStorage.key.playerCommands, [
        {cmnd: "ban", text: "Ban"},
        {cmnd: "kick", text: "Kick"},
        {cmnd: "mute", text: "Mute"}
    ]);

    // Filters
    DataStorage.set(DataStorage.key.filters, [
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
        ContextMenu.open(event);
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
TableGenerator.removeRowAction(ch.removeRow);
ch.buildTabContents();

// Save/Cancel button click event handlers
$("#ch-save").click(function () {
    ch.closeManager();

    // Serialize and store the tabs
    var obj, jobj, value, name, modifiers = "";

    // Loop through each tab
    $.each(DataStorage.key, function (tabIndex, key) {
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
        DataStorage.set(key, contents);
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
                CommandHistory.add(message);

                $(this).val("");

                if (message[0] === "/") {
                    ch.addChatEntry("Server", message, null, true);
                }
            }
        }).keyup(function (event) {
            // Arrow UP
            if (event.keyCode == 38 && CommandHistory.hasPrev()) {
                var textField = $(this);
                textField.val(CommandHistory.prev(textField.val()));

                // Down Arrow
            } else if (event.keyCode == 40 && CommandHistory.hasNext()) {
                $(this).val(CommandHistory.next());
            }
        });

        // Replace the current add chat row function with the modified one
        window.addChatEntry = ch.addChatEntry;

        // Bind the console helper's tabs to use McMyAdmins' tabbing functionality
        $("#ch-manager .subtab").mousedown(window.subTabClick);
        $("#ch-manager .subtab").click(window.nopFalse);

        Notify.log("Console Helper Loaded!");
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
window.ch.data = DataStorage;
window.ch.history = CommandHistory;
window.ch.notify = Notify;
window.ch.getLogs = Notify.getLogs;// Shortcut to get logs in notify

// */
