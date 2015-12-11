// ==UserScript==
// @name FSMC Chat Helper
// @description Adds additional functionality to the final score mc live map chat.
// @author Curtis Oakley
// @version 0.1.43
// @match http://mc.finalscoremc.com:25966/*
// @namespace http://mc.finalscoremc.com:25966/
// ==/UserScript==

/*
- Message Filter Template -
{regex:"",modifiers:"",replace:"",alert:false,name:""}

See console-helper.user.js for some example filters.
*/

// Globals from DynMap
/* global dynmap getMinecraftHead chat_encoder */
"use strict";

/* ----------------------------- *
 *           FUNCTIONS           *
 * ----------------------------- */

//       Other Functions         //

/**
 * Adds a row to the dynmap chat box.
 * Removes older rows as needed.
 * @param row The row to add, accepts anything the jQuery appends accepts.
 */
function addrow(row) {
    // Modified from dynamp chatbox.js addrow function
    var configuration = dynmap.options.components[2];// Is this consistent?
    var messageList = $("div.messagelist");// TODO cache this lookup

    if (configuration.scrollback) {
        var c = messageList.children();
        c.slice(0, Math.max(0, c.length - configuration.scrollback)).each(function (index, elem) {
            $(elem).remove();
        });
    } else {
        setTimeout(function () {
            row.remove();
        }, (configuration.messagettl * 1000));
    }
    messageList.append(row);
    messageList.show();
    messageList.scrollTop(messageList.scrollHeight()); // TODO don"t scroll if the mouse is over the message box
}

/**
 * Generates the table listing the messages.
 */
function generateMessageTable() {
    /* Text Highlight Object.
     var message = {
     alert    : <boolean|Indicates if the user should be alerted>
     modifiers: <string|The regex modifiers>
     regex    : <string|The regex string>
     replace  : <string|The string to replace the regex with>
     }
     */

    var table = $("<table>").attr("id", "cmt");// C Message Table
    var tbody = $("<tbody>");
    table.append(
        $("<thead>")
            .append($("<th>").text("Regex"))
            .append($("<th>").text("Modifiers"))
            .append($("<th>").text("Replace"))
            .append($("<th>").text("Alert"))
            .append($("<th>").text(" "))// buttons column
    );

    $.each(DataStorage.get("messages", []), function (index, value) {
        // Create a new row for each message
        tbody.append(
            $("<tr>").attr("id", "m" + index).dblclick(function () {
                // Double click to go into edit mode
                // this is the row.

            })
                .append($("<td>").text(value.regex))
                .append($("<td>").text(value.modifiers))
                .append($("<td>").text(value.replace))
                .append($("<td>").text(value.alert))
                .append($("<td>").text(" "))
        );
    });

    return table.append(tbody);
}

function getTimeStamp() {
    var date = new Date();

    var hour = date.getHours();
    if (hour > 12) {
        hour -= 12;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }

    var minute = date.getMinutes();
    if (minute < 10) {
        minute = "0" + minute;
    }

    return $("<span/>")
        .addClass("timestamp")
        .text(hour + ":" + minute);
}

/**
 * Takes a row of the message table and makes it editable
 */
function editRow(id) {
    // Replace the text in each column of the row with a input field
    var columns = $("#" + id + " td");
    for(var i = 0; i < columns.length - 2; i++) {
        columns.eq(i).html("<input type='text' value='" + columns.eq(i).text() + "' />");
    }// TODO checkbox and save button
}

/**
 * Adds a new row to the filter table
 */
function addNewFilterRow() {
    // Attach a row to the table body
    $("#cmt tbody").append($("<tr>").attr("id", "cadd")
            // Attach columns for each of the input fields to the row
            .append($("<td>").append($("<input>").attr({id: "ca-regex", type: "text"})))
            .append($("<td>").append($("<input>").attr({id: "ca-modifiers", type: "text"})))
            .append($("<td>").append($("<input>").attr({id: "ca-replace", type: "text"})))
            .append($("<td>").append($("<input>").attr({id: "ca-alert", type: "checkbox"})))
            // Attach the add new message filter button
            .append($("<td>").append($("<button>").text("Add").click(function () {
                // TODO
                // var regex = $("#ca-regex").val();
                // var modifiers = $("#ca-modifiers").val();
                // var replace = $("#ca-replace").val();
                // var alert = $("#ca-alert").is(":selected");
            })))
    );
}

/**
 * Process a chat message for input into a row.
 */
function processMessage(message) {
    // Get the text from the message in it"s properly encoded format
    var text = chat_encoder(message);

    // Escape any HTML entities
    text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Process any message notifications.
    var messages = DataStorage.get("messages", []);

    $.each(messages, function (index, m) {
        var regex = new RegExp(m.regex, m.modifiers);

        if (text.match(regex) != null) {
            // Text contains a match

            // Replace the text
            text = text.replace(regex, m.replace);

            if (m.alert) {
                Notify.alert('Chat Message Alert',  message.name + ": " + text);
            }
        }
    });

    return text;
}

function showDialog(contents) {
    $("#cdialog").html(contents);
    $("#coverlay").show();
}



/* ----------------------------- *
 *  VARIABLES AND CONFIGURATION  *
 * ----------------------------- */

var
    /** The height of the controller trough. */
    ctrlHeight = 30,

    /** Handles a incoming chat message. */
    handleChat = function (event, message) {
        var configuration = dynmap.options.components[2];// Is this consistent? TODO cache this
        /* Modified version of the dynamp chat event handler.
         * Changed to allow HTML in the text messages.
         */
        var playerName = message.name;
        var playerAccount = message.account;
        var messageRow = $("<div/>")
            .addClass("messagerow");

        var playerIconContainer = $("<span/>")
            .addClass("messageicon");

        if (message.source === "player" && configuration.showplayerfaces && playerAccount) {
            getMinecraftHead(playerAccount, 16, function (head) {
                messageRow.icon = $(head)
                    .addClass("playerMessageIcon")
                    .appendTo(playerIconContainer);
            });
        }

        var playerChannelContainer = "";
        if (message.channel) {
            playerChannelContainer = $("<span/>").addClass("messagetext")
                .text("[" + message.channel + "] ")
                .appendTo(messageRow);
        }

        if (message.source === 'player' && configuration.showworld && playerAccount) {
            var playerWorldContainer = $('<span/>')
                .addClass("messagetext")
                .text("[" + dynmap.players[playerAccount].location.world.name + "]")
                .appendTo(messageRow);
        }

        var playerNameContainer = "";
        if (playerName) {
            playerNameContainer = $("<span/>").addClass("messagetext").append(" " + playerName + ": ");
        }

        var playerMessageContainer = $("<span/>")
            .addClass("messagetext")
            .html(processMessage(message));

        var timeStamp = getTimeStamp();

        messageRow.append(timeStamp, playerIconContainer, playerChannelContainer, playerNameContainer, playerMessageContainer);
        addrow(messageRow);
    },

    /** Handles a player joining. */
    handlePlayerJoin = function (event, playername) {
        // Modified from the dynmap playerjoin event handler.
        // Changed to check for player join alerts and provide HTML output
        if ((dynmap.options.joinmessage.length > 0) && (playername.length > 0)) {
            var text = dynmap.options.joinmessage.replace('%playername%', playername);

            // Check if we need to alert for this player
            var players = DataStorage.get("player.alert", []);
            if (players.indexOf(playername) != -1) {
                // Player on the alert list, pop an alert.
                Notify.alert("User log in", playername + " just logged in.");
            }

            // Check for players on the highlight (warn) list
            players = DataStorage.get("player.warn", []);
            if (players.indexOf(playername) != -1) {
                // Highlight the player
                text = "<img src='http://c.lan/personal/imgs/control-record.png' />" + text;
            }

            addrow(
                $('<div/>')
                    .addClass('messagerow')
                    .append(getTimeStamp())
                    .append($("<span/>").html(text))
            );
        } else if ((dynmap.options['msg-hiddennamejoin'].length > 0) && (playername.length == 0)) {
            addrow(
                $('<div/>')
                    .addClass('messagerow')
                    .append(dynmap.options['msg-hiddennamejoin'])
            );
        }
    };



/* ----------------------------- *
 *              RUN              *
 * ----------------------------- */

// Delay running this so we can be sure that dynmap has finished setting up
setTimeout(function () {
    var messageList = $("div.messagelist");

    //  Unbind the dynamp events  //
    $(dynmap).unbind("chat");
    $(dynmap).unbind("playerjoin");
    messageList.unbind("click");// Remove the chat close function


    //     Bind into Dynamap     //

    // Bind to the chat event
    $(dynmap).bind("chat", handleChat);

    // Bind to the player join event
    $(dynmap).bind("playerjoin", handlePlayerJoin);

    // Make the chat list only close on double click
    messageList.dblclick(function () {
        $(this).hide();
    });


    //      Import the CSS        //
    $("head").append($("<link>").attr({
        "href": "http://chockly.org/ch/live-map-helper.css",
        "type": "text/css",
        "rel": "stylesheet",
        "media": "screen"
    }));


    //   Attach the controller   //
    $("<div>")
        .attr("id", "ctrough")
        .css("top", "-" + (ctrlHeight - 8) + "px") // Leave eight pixels of the controller visible
        // Animate the controller up and down
        .mouseenter( function () {
            $(this).animate( { top: "0" } );
        })
        .mouseleave( function () {
            $(this).animate( { top: "-" + (ctrlHeight - 8) + "px" } );
        })
        // Attach the inner div
        .append(
            $("<div>")
            .addClass("inner")
            // Attach the edge divs
            .append($("<div>").addClass("corner-left"))
            .append($("<div>").addClass("corner-right"))
            // Attach the controls trough
            .append($("<div>").attr("id", "cbuttons")
                // Attach the controls
                // Message Alerts
                .append($("<div>")
                    .css("background-image", "url(http://c.lan/personal/imgs/bell.png)")
                    .append($("<span>").text("Alerts"))
                    .click(function () {
                        showDialog(generateMessageTable());
                    })
                )
                // Player Alerts
                .append($("<div>")
                    .css({
                        "background-image": "url(http://c.lan/personal/imgs/user.png)",
                        "margin-right": "0"
                    })
                    .append($("<span>").text("Players"))
                    .click(function () {
                        // TODO
                    })
                )
            )
        )
        // Attach to the page
        .appendTo("body");

    // Attach the dialog box //
    $("<div>")
        .attr("id", "coverlay")
        .append($("<div>").addClass("inner")
            .append($("<div>")
                .attr("id", "cdialog")
                .css({
                    "position": "fixed",
                    "top": "40px"
                })
            )
        )
        .appendTo("body");

}, 500);

//*
// DEBUG:  reveal certain methods
window.ch = {
    dataStorage: DataStorage,
    editRow: editRow,
    addNewFilterRow: addNewFilterRow
};
// */
