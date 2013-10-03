// ==UserScript==
// @name McMyAdmin Console Helper
// @description Adds additional functionality to the McMyAdmin console page.
// @author Curtis Oakley
// @version 0.1.11
// @match http://72.249.124.178:25967/*
// @namespace http://72.249.124.178:25967/
// ==/UserScript==

/* TODO:
 * - Add a count so if a message filter is triggered repeatedly in a short enough time it can trigger an alert.
 *    - Will need a variable to store the filter ID (What to use for the ID? the array index? some sort of hash? the regex?)
 *    - Will need a configurable variable to specify how long the count should be stored before being cleared.
 * - Store the last 10 (configurable) commands, have pressing up trigger the message
 * to be entered into the input box.
 *     This will require a way to hook into the command being sent from the input box, before the input boxes value is cleared (possibly unbind keypress and use custom version of McMyAdmin's on keypress enter event code)
 *     $("#chatEntryBox").keyup(function(event) {
 *         if (event.keyCode == 38) {// 38 is the keycode for the up arrow
 *              // Code for commands here
 *              // This should store any text into a temporary variable, so that arrow down can bring it back up.
 *         } else if (event.keyCode == 40) {// 40 is keycode for down arrow
 *              // Code for previous command here
 *         }
 *     });
 * - Add interface for editing, removing, and adding filters.
 * - Add an interface for editing, removing, and adding buttons.
 *    - Will store the current commands into local storage, have defaults for when absent to first populate the local storage.
 */

/*
Some helpful filters.
- Template -
{regex:"",modifiers:"",replace:"",alert:false,name:""}

- Innapropriate Language -
{regex:"(hentai|ecchi|yaoi|yuri|futa|p[0o]rn|pr[0o]n|[e3]rot[i1]c|rape)",alert:true,name:"Pornographic Language"}
{regex:"(pussy|cunt|vag|b[0o]+b|breast|p[e3]+n[i1]+s?|d[i1]ck|(?:\\s|^)ass(?:$|[^u])|arse|genital)",alert:true,name:"Anatomical Terms"}
{regex:"(b[i1]tch|wh[o0]re|jack[ \\-]*ass|n[i1]gger|sh[i1]+t|dam[mn]*(?:[^a])|fag|fuck|(?:\\s|^)f[ \\-]*(?:yo)?u+(?:\\s|$)|f[ \\-]*u{3,}|screw)",alert:true,name:"Curse Words"}
{regex:"((?:[^r]|^)God|Christ|Jesus|hell(?:$|[^o]))",alert:true,name:"Religious Language"}

- Moderator Words -
{regex:"(h[ea]lp|st[oa]p)",name:"Help Words"}
{regex:"(gr[ei]+f|theft|th[ei]+f|stole|steal|cheat|hack|x[\\- ]*ray)",alert:true,name:"Grief Alert"}
{regex:"(moved wrongly)",count:3,name:"Misc"}

- URLs -
{regex:"(https?://\\w+\\.\\w+\\S+)",replace:"<a target='_blank' href=\"$1\">$1</a>",name:"URL creator"}

- Name -
{regex:"(fred|waffle|console)",replace:"<i>$1</i>",name:"Username"}

*/

// Wrap everything inside of an anymous function
var ch_m = function($) {
    
    /* ----------------------------- *
     *  VARIABLES AND CONFIGURATION  *
     * ----------------------------- */
    
    var
    
    // Commands //
    /**
     * A list of commands. These commands are simply set into the input box
     * as specified.
     * @type Array
     */
    generalCommands = [
        {cmnd : 's Fred',       text : 'Say'},
        {cmnd : 'msg ~console', text : 'Msg Self'}
    ],
    
    /**
     * A list of quick commands. These commands are executed immediately when
     * the user clicks on the command button.
     * @type Array
     */
    quickCommands = [
        {cmnd : 'ss',  text : 'Server Status'},
        {cmnd : 'mvw', text : 'MV Who'},
        {cmnd : 'who', text : 'Who'}
    ],
            
    /**
     * A list of commands to be run on a player. These are added to the player
     * context menu. The name of the currently selected player is added
     * after the command.
     * @type Array
     */
    playerCommands = [
        {cmnd : 'ban',    text : 'Ban Player'},
        {cmnd : 'kick',   text : 'Kick Player'},
        {cmnd : 'mute',   text : 'Mute Player'},
        {cmnd : 'player', text : 'Get Player Info'}
    ],
    
    // Other //
    /** The defaults for message filter proccessing. */
    filterDefaults = {
        modifiers : 'gi',
        alert     : false,
        count     : false,
        replace   : "<b>$1</b>"
    },
    
    /** Stores if the custom context menu is open. */
    contextMenuOpen = false,
    
    /** Create the context menu HTML element used for the player commands. */
    contextMenu = $('<div>').attr('id', 'ch-contextmenu'),
    
    /** The key used to retrieve and set data from the local storage object. */
    localStorageKey = "cdata",
    
    /** The data object containing the local storage data. */
    data = JSON.parse(localStorage.getItem(localStorageKey)),
          
    /**
     * Stores the name of the player that is being used for the player context
     * menu commands.
     */
    player;
    
    
    /* ----------------------------- *
     *           FUNCTIONS           *
     * ----------------------------- */


    //     Local Storage Helpers     //
    
    /**
     * Clears a value from local storage.
     * @param {string} key Optional, deletes the key and it's value from local
     */
    function clear(key) {
        if (!key) {
            data = null;
            localStorage.removeItem(localStorageKey);
        } else {
            if (!data) {
                // Do nothing if there is no data
                return;
            }
            delete data[key];
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        }
    }
    
    /**
     * Gets a piece of data from local storage.
     * @param {string} key The key for the data. If not provided then this returns
     * all stored data.
     * @param {mixed} defaultValue The value to return if the key has no value.
     * @returns {mixed}
     */
    function get(key, defaultValue) {
        if (!key) {
            return data;
        } else if(!data || !data[key]) {
            return defaultValue;
        } else {
            return data[key];
        }
    }

    /**
     * Sets a value to local storage.
     * @param {string} key The key for the value.
     * @param {mixed} value The data to store.
     */
    function set(key, value) {
        if (!data) {
            data = {};
        }
        data[key] = value;
        localStorage.setItem(localStorageKey, JSON.stringify(data));
    }
    
    
    //       Other Functions         //
    
    
    function addChatEntry(name, message, isChat) {
        // This is a modified verion of the addChatEntry function found in
        // MyMcAdmin.js (version 2.4.4.0).
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
     * Appends a series of HTML elements to run the supplied commands to a
     * jQuery HTML Element.
     * @param {jQuery} el The jQuery to append the commands to.
     * @param {array} commands The array of command objects. Each command
     * object is attached to the element. The command objects should contain
     * a cmnd that specifies the command to run, and a text that is the
     * text to display to the user.
     * @param {function} callback The function to call when the command element
     * is clicked. Defaults to runGeneralCommand
     * @param {string} type The html element type to use when appending.
     * Defaults to '&lt;button&gt;'.
     */
    function attachCommands(el, commands, callback, type) {
        if (!callback) {
            callback = runGeneralCommand;
        }
        if (!type) {
            type = '<button>';
        }
        for (var i=0; i<commands.length; i++) {
            el.append(
                $(type)
                    .text(commands[i].text)
                    .attr('data', commands[i].cmnd)
                    .click(callback)
            );
        }
    }
    
    /**
     * Closes the player context menu.
     */
    function closeMenu() {
        contextMenu.hide();
        contextMenuOpen = false;
    }
    
    /**
     * Gets the left position for the player context menu.
     * @param {event} evt The event object that triggered the context menu to be
     * opened, used to get the position of the mouse.
     * @returns {String} The left position for the context menu in pixels.
     */
    function getContextMenuLeft(evt) {
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
        // Make sure val is not off the edge of the page
        var page_width = $('body').width();
        var menu_width = contextMenu.width();
        if (val + menu_width > page_width) {
            val -= menu_width;
        }
        return val + "px";
    }
    
    /**
     * Gets the top position for the player context menu.
     * @param {event} evt The event object that triggered the context menu to be
     * opened, used to get the position of the mouse.
     * @returns {String} The top position for the context menu in pixels.
     */
    function getContextMenuTop(evt) {
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
        // Make sure val is not off the bottom of the page
        var page_height = $('body').height();
        var menu_height = contextMenu.height();
        if (val + menu_height > page_height) {
            val -= menu_height;
        }
        return val + "px";
    }
    
    /**
     * Notifies the user of important events by opening a new window.
     * @param {string} message The message to display in the notification.
     */
    function notify(message) {
        window.open(
            'http://chockly.org/ch/?m=' + encodeURIComponent(message),
            'notification',
            'width=300,height=150,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0'
        );
    }
    
    /**
     * Proccess a chat message for input into a row.
     * @param {string} text The message to process
     * @return {string} The message ready for input as an HTML message.
     */
    function processMessage(text) {
        var filters = get("filters", []),
            filter,
            regex;
		
		// Escape any HTML entities
		text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		
		// Process any message notifications.
        for (var i=0; i<filters.length; i++) {            
            filter = $.extend({}, filterDefaults, filters[i]);
            
            regex = new RegExp(filter.regex, filter.modifiers);
            
            // See if we have a match
            if (text.match(regex) !== null) {
                // Replace the text
                text = text.replace(regex, filter.replace);
                
                // Pop a notification if needed
                if (filter.alert) {
                    notify("<b>Chat Message Alert:</b><br>" + text);
                }
            }
        }
        
        return text;
    }
    
    /**
     * Sets a command into the input text and then focuses on the input text
     * field.
     * @param {mixed} cmnd The command to input as a string, or the HTML
     * element that has a command in it's data attribute.
     * @param {boolean} append When true the text is placed at the beginning of
     * any existing input text, otherwise the text is replaced. See setInputText.
     */
    function runCommand(cmnd, append) {
        if (typeof cmnd === 'object') {
            // Try to get the command from the objects data attribute
            cmnd = $(cmnd).attr('data');
        }
        setInputText(cmnd, append, false);
        
        // Focus on the input field
        $("#chatEntryBox").focus();
    }
    
    /**
     * Sets a command into the input box, and then immediatly runs the command.
     * @param {Event} event The event triggering this function.
     */
    function runQuickCommand(event) {
        runCommand(this);
        
        // Fire the 'onenter' event for the chat entry box
        var e = $.Event('keypress');
        e.keyCode = '13';
        $("#chatEntryBox").trigger(e);
    }

    /**
     * Sets a command into the input box, removing any current text.
     * @param {Event} event The event triggering this function.
     */
    function runGeneralCommand(event) {
        runCommand(this);
    }

    /**
     * Sets a command into the input box, and then closes the player context
     * menu.
     * @param {Event} event The event triggering this function.
     */
    function runPlayerCommand(event) {
        var cmnd = $(event.target).attr('data');
        runCommand(cmnd + ' ' + player);
        
        // Close the context menu
        closeMenu();
    }
    
    /**
     * Sets the input text.
     * @param {string} text The text to put into the input box.
     * @param {boolean} append When true the text is placed at the beginning of
     * any existing input text, otherwise the text is replaced.
     * @param {boolean} notCommand When true, the slash ('/') is not added
     * to the beginning of the text.
     * @returns {undefined}
     */
    function setInputText(text, append, notCommand) {
        var chat_box = $("#chatEntryBox");
        if (!notCommand) {
            text = '/' + text;
        }
        if (append) {
            text += ' ' + chat_box.val();
        }
        chat_box.val(text + ' ');
    }
    
    
    
    /* ----------------------------- *
     *              RUN              *
     * ----------------------------- */
    
    
    // Attach the CSS to the page
    $('head').append($("<link>").attr({
        href  : 'http://chockly.org/ch/console-helper.css',
        type  : 'text/css',
        rel   : 'stylesheet',
        media : 'screen'
    }));
    
    
    //   Context Menu   //
    // Attach the commands to the player context menu
    attachCommands(contextMenu, playerCommands, runPlayerCommand, '<div>');
    
    // Attach the context menu to the page
    contextMenu.appendTo('body');
    
    
    // Attach additional functionality to clicking on the player names
    $("#chatNames").click(function(event) {
        // Add the /msg command to the clicked on player
        var player_div = $(event.target);
        if (player_div.hasClass('chatName')) {
            runCommand("msg " + player_div.text(), true);
        }
    }).bind("contextmenu", function(event) {
        // Display the context menu
        var player_div = $(event.target);
        if (player_div.hasClass('chatName')) {
            player = player_div.text();
            contextMenu.css({
                left    : getContextMenuLeft(event),
                top     : getContextMenuTop(event),
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
    
    
    //   Command Buttons   //
    // Attach the command button holder
    $("#chatArea").append(
        $('<div>').attr('id', 'ch-cmnds')
    );
    
    // Attach the commands
    attachCommands($("#ch-cmnds"), generalCommands, runGeneralCommand);
    if (generalCommands.length > 0 && quickCommands.length > 0) {
        // Insert a spacer between the two command types
        $("#ch-cmnds").append($('<div>').addClass('ch-h-spacer'));
    }
    attachCommands($("#ch-cmnds"), quickCommands, runQuickCommand);
    
    
    //  Helper Manager Interface  //
    $('body').append(
"<div id='ch-manager' class='modalbg modalnormal' style='display:none'>"
+   "<div class='modalpanel'>"
+       "<ul class='ch-tab-navigation'>"
+           "<li><a href='#ch-filters'>Filters</a></li>"
+           "<li><a href='#ch-pcmnds'>Player Commands</a></li>"
+           "<li><a href='#ch-gcmnds'>General Commands</a></li>"
+           "<li><a href='#ch-qcmnds'>Quick Commands</a></li>"
+       "</ul>"
+       "<div class='ch-tabs'>"
+           "<div id='ch-filters'></div>"
+           "<div id='ch-pcmnds'></div>"
+           "<div id='ch-gcmnds'></div>"
+           "<div id='ch-qcmnds'></div>"
+       "</div>"
+       "<div class='modalbuttons'>"
+           "<button id='ch-save'>Save</button>"
+           "<button id='ch-cancel'>Cancel</button>"
+       "</div>"
+   "</div>"
+"</div>"
    );
    
    
    
    // Replace the current add chat row function with the modified one
    window.addChatEntry = addChatEntry;
    
    // Expose the local storage helpers
    window.set = set;
    window.get = get;
    window.clear = clear;
};

// Inserts the main method into the page so that JQuery works.
var chathelper = document.createElement('script');
chathelper.type = "text/javascript";
chathelper.textContent = '(' + ch_m.toString() + ')(jQuery);';
document.body.appendChild(chathelper);
