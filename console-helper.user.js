// ==UserScript==
// @name McMyAdmin Console Helper
// @description Adds additional functionality to the McMyAdmin console page.
// @author Curtis Oakley
// @version 0.1.1
// @match http://72.249.124.178:25967/*
// @namespace http://72.249.124.178:25967/
// ==/UserScript==

/*
 * Most of this is simply a modified version of the chat-helper code.
 */


/*
Some helpful filters.
- Template -
{regex:"",modifiers:"",replace:"",alert:false,name:""}

- Innapropriate Language -
{regex:"(hentai|ecchi|yaoi|yuri|futa|p[0o]rn|pr[0o]n|[e3]rot[i1]c|rape)",modifiers:"gi",replace:"<b>$1</b>",alert:true,name:"Pornographic Language"}
{regex:"(pussy|cunt|vag|b[0o]+b|breast|p[e3]+n[i1]+s?|d[i1]ck|(?:\\s|^)ass(?:$|[^u])|genital)",modifiers:"gi",replace:"<b>$1</b>",alert:true,name:"Anatomical Terms"}
{regex:"(b[i1]tch|wh[o0]re|jack[ \\-]*ass|arse|n[i1]gger|sh[i1]+t|dam[mn]*|fag|fuck|(?:[^io]|^)f[ \\-]*you|screw)",modifiers:"gi",replace:"<b>$1</b>",alert:true,name:"Curse Words"}
{regex:"((?:[^r]|^)God|Christ|Jesus|hell(?:$|[^o]))",modifiers:"gi",replace:"<b>$1</b>",alert:true,name:"Religious Language"}

- Moderator Words -
{regex:"(h[ea]lp|st[oa]p)",modifiers:"gi",replace:"<b>$1</b>",alert:false,name:"Help Words"}
{regex:"(gr[ei]+f|theft|th[ei]+f|stole|steal|cheat|hack|x[\\- ]*ray)",modifiers:"gi",replace:"<b>$1</b>",alert:true,name:"Grief Alert"}
{regex:"(moved wrongly)",modifiers:"", replace:"<b>$1</b>", alert:false, name:"Misc"}

- URLs -
{regex:"(https?://.*\\.\\w+\\S+)",modifiers:"gi",replace:"<a target='_blank' href=\"$1\">$1</a>",alert:false,name:"URL creator"}

- Name -
{regex:"(fred|waffle|console)",modifiers:"gi",replace:"<i>$1</i>",alert:false,name:"Username"}

*/

// Wrap everything inside of an anymous function
var ch_m = function($) {
    
    /* ----------------------------- *
     *  VARIABLES AND CONFIGURATION  *
     * ----------------------------- */
    
    var
    
    /** A list of commands to add to the right click menu. */
    contextCommands = [
        {cmnd : 'ban',    text : 'Ban Player'},
        {cmnd : 'kick',   text : 'Kick Player'},
        {cmnd : 'mute',   text : 'Mute Player'},
        {cmnd : 'player', text : 'Get Player Info'}
    ],
    
    /** The key used to retrieve and set data from the local storage object. */
    localStorageKey = "cdata",
    
    /** The data object containing the local storage data. */
    data = JSON.parse(localStorage.getItem(localStorageKey)),
          
    /** Stores the name of the player that is being used for the context menu commands. */
    player,
            
    /** Stores if the custom context menu is open. */
    contextMenuOpen = false,
    
    /** Create the context menu HTML element. */
    contextMenu = $('<div>').attr('id', 'ch-contextmenu');
    
    
    /* ----------------------------- *
     *           FUNCTIONS           *
     * ----------------------------- */


    //     Local Storage Helpers     //
    
    /**
     * Clears a value from local storage.
     * key - Optional, deletes the key and it's value from local storage. If
     * not provided removes all data from local storage.
     */
    function clear(key) {
        if (key == null) {
            data = null;
            localStorage.removeItem(localStorageKey);
        } else {
            if(data == null){
                // Do nothing if there is no data
                return;
            }
            delete data[key];
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        }
    }
    
    /**
     * Gets a piece of data from local storage.
     * key - the key for the data. If null returns all data stored.
     * defaultValue - Value to return if the key has no value.
     */
    function get(key, defaultValue) {
        if(key == null){
            return data;
        } else if(data == null){
            return defaultValue;
        } else if(data[key] == null){
            return defaultValue;
        } else {
            return data[key];
        }
    }

    /**
     * Sets a value to local storage.
     * key - The key for the value.
     * value - The data to store.
     */
    function set(key, value) {
        if(data == null){
            data = {};
        }
        data[key] = value;
        localStorage.setItem(localStorageKey, JSON.stringify(data));
    }
    
    
    //       Other Functions         //
    
    
    function addChatEntry(name, message, isChat) {
        // This is a modified verion of the addChatEntry function
        message = processMessage(message);
        
        var newLine = $("<div class=\"chatEntry\"></div>");
        var chatBody = $("<div class=\"chatBody\"></div>");
        chatBody.append($("<div class=\"chatTimestamp\"></div>").text(getTimestamp()));
        chatBody.append($("<div class=\"chatNick\"></div>").text(" " + name + ": "));
        chatBody.append($("<div class=\"chatMessage\"></div>").html(message));

        newLine.append(chatBody);
        newLine.children("div.chatTimestamp:first").text(getTimestamp());
        newLine.children("div.chatNick:first").text();
        newLine.children("div.chatMessage:first").text(message);

        if ($("#chatHistory").children("div").size() > 200) {
            $("#chatHistory").children("div").first().remove();
        }

        $("#chatHistory").append(newLine);

        var hist = document.getElementById("chatHistory");

        if (ScrollChat)
        {
            hist.scrollTop = hist.scrollHeight;
        }
    }
    
    /**
     * Notifies the user of important events by opening a new window.
     * @param {string} message The message to display in the notification.
     */
    function notify(message) {
        window.open('http://c.lan/personal/chat-helper/notify.php?m=' + encodeURIComponent(message),
            'notification','width=300,height=150,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');
    }
    
    /**
     * Proccess a chat message for input into a row.
     * @param {string} message The message to process
     * @return {string} The message ready for input as an HTML message.
     */
    function processMessage(message) {
        var text = message;
		
		// Escape any HTML entities
		text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		
		// Process any message notifications.
        var messages = get("messages", []);
        
        $.each(messages, function(index, m) {
            
            var regex = new RegExp(m.regex, m.modifiers);
            
            if (text.match(regex) != null) {
                // Text contains a match
                
                // Replace the text
                text = text.replace(regex, m.replace);
                
                if (m.alert) {
                    notify("<b>Chat Message Alert:</b><br>" + text);
                }
            }
        });
        
        return text;
    }
    
    function mouseX(evt) {
        var val = 0;
        if (evt.pageX) {
            val = evt.pageX;
        } else if (evt.clientX) {
           val = evt.clientX + (
                // Compensate for horizontal scrolling
                document.documentElement.scrollLeft
                    ? document.documentElement.scrollLeft
                    : document.body.scrollLeft
            );
        }
        // Make sure val is not off the edge of the window
        var window_width = $(window).width();
        if (val - 140 > window_width) {
            val = window_width - 120;
        }
        return val + "px";
    }
    
    function mouseY(evt) {
        var val = 0;
        if (evt.pageY) {
            val = evt.pageY;
        } else if (evt.clientY) {
            val = evt.clientY + (
                // Compensate for vertical scrolling
                document.documentElement.scrollTop
                    ? document.documentElement.scrollTop
                    : document.body.scrollTop
            );
        }
        return val + "px";
    }
    
    function setInputText(text, append) {
        var chat_box = $("#chatEntryBox");
        if (append) {
            text += " " + chat_box.val();
        }
        chat_box.val(text);
    }

    function runCommand(event) {
        var cmnd = $(event.target).attr('data');
        setInputText('/' + cmnd + ' ' + player);
        
        // Close the context menu
        closeMenu();
    }
    
    function closeMenu() {
        contextMenu.hide();
        contextMenuOpen = false;
    }
    
    
    
    /* ----------------------------- *
     *              RUN              *
     * ----------------------------- */
    
    
    // Attach the CSS to the page
    $('head').append($("<link>").attr({
        href  : "http://c.lan/personal/chat-helper/console-helper.css",
        type  : 'text/css',
        rel   : 'stylesheet',
        media : 'screen'
    }));
    
    
    //   Context Menu   //
    // Attach the commands to the context menu
    for (var i=0; i < contextCommands.length; i++) {
        contextMenu.append(
            $('<div>')
                .attr('data', contextCommands[i].cmnd)
                .click(runCommand)
                .text(contextCommands[i].text)
        );
    }
    
    // Attach the context menu to the page
    contextMenu.appendTo('body');
    
    
    // Attach additional functionality to clicking on the player names
    $("#chatNames").click(function(event) {
        // Add the /msg command to the clicked on player
        var player_div = $(event.target);
        if (player_div.hasClass('chatName')) {
            setInputText("/msg " + player_div.text(), true);
        }
    }).bind("contextmenu", function(event) {
        // Display the context menu
        var player_div = $(event.target);
        if (player_div.hasClass('chatName')) {
            player = player_div.text();
            contextMenu.css({
                left    : mouseX(event),
                top     : mouseY(event),
                display : 'block'
            });
            event.preventDefault();
            contextMenuOpen = true;
        }
    });
    
    // Hide the context menu when it is open and the user clicks anything.
    $('body').mousedown(function(event){
        if (contextMenuOpen && $(event.target).parents('#ch-contextmenu').length === 0) {
            closeMenu();
        }
    });
    
    
    // Replace the current add row function with mine
    window.addChatEntry = addChatEntry;
    
    // Expose the local storage helpers
    window.set = set;
    window.get = get;
};

// Inserts the main method into the header of the page so that JQuery works.
var chathelper = document.createElement('script');
chathelper.type = "text/javascript";
chathelper.textContent = '(' + ch_m.toString() + ')(jQuery);';
document.body.appendChild(chathelper);
