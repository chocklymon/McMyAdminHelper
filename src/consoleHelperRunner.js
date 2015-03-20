/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

/* ----------------------------- *
 *              RUN              *
 * ----------------------------- */

if (!data.get()) {
    // Initialize Defaults

    // General Commands
    data.set(data.key.generalCommands, [
        {cmnd: "say", text: "Say"}
    ]);

    // Quick Commands
    data.set(data.key.quickCommands, [
        {cmnd: "who", text: "Who"}
    ]);

    // Player Commands
    data.set(data.key.playerCommands, [
        {cmnd: "ban", text: "Ban"},
        {cmnd: "kick", text: "Kick"},
        {cmnd: "mute", text: "Mute"}
    ]);

    // Filters
    data.set(data.key.filters, [
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
        contextMenu.open(event);
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
    $.each(data.key, function (tabIndex, key) {
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
        data.set(key, contents);
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