// ==UserScript==
// @name McMyAdmin Console Helper
// @description Adds additional functionality to the McMyAdmin console page.
// @author Curtis Oakley
// @version 0.1.33
// @match http://72.249.124.178:25967/*
// @namespace http://72.249.124.178:25967/
// ==/UserScript==

/* TODO:
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
 * - Prevent chat message parsing when first loading?
 */

/*
Message Filters
- Template -
{regex:"",modifiers:"",replace:"",alert:false,name:""}

- Name -
{regex:"(fred|waffle|console)",replace:"<i>$1</i>",name:"Username"}

See the default generator for more.
Note that the name parameter is only to help categorize the filters and is not used.
*/

// Wrap everything inside of an anymous function
var ch_m = function($) {
    
    /* ----------------------------- *
     *  VARIABLES AND CONFIGURATION  *
     * ----------------------------- */
    
    var
    
    /** The defaults for message filter proccessing. */
    filterDefaults = {
        modifiers : 'gi',
        alert     : false,
        count     : false,
        replace   : "<b>$1</b>"
    },
    
    /** Defines the tables layout used to display commands. */
    commandTableLayout = {
        'Command' : {
            value  : 'cmnd',
            append : '/'
        },
        'Name' : 'text'
    },
    
    /** Stores if the custom context menu is open. */
    contextMenuOpen = false,
    
    /** Create the context menu HTML element used for the player commands. */
    contextMenu = $('<div>').attr('id', 'ch-contextmenu'),
    
    /** Stores the counts for counted filters. */
    count = {},
    
    /** Stores how long counts should be stored in seconds. */
    countDuration = 300, // 5 minutes
    
    /** The key used to retrieve and set data from the local storage object. */
    localStorageKey = "cdata",
    
    /** The data object containing the local storage data. */
    data = JSON.parse(localStorage.getItem(localStorageKey)),
          
    /**
     * Stores the name of the player that is being used for the player context
     * menu commands.
     */
    player,
    
    /** Stores the names of keys used to get and set data from localStorage. */
    storageKeys = {
        generalCommands: 'gcmnds',
        quickCommands : 'qcmnds',
        playerCommands : 'pcmnds',
        filters : 'filters'
    };
    
    
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
     * Attaches the commands to the page. Call this to build/rebuild the command buttons
     * and player context menu.
     */
    function buildCommands() {
        // Attach the context menu commands
        contextMenu.empty();
        attachCommands(contextMenu, get(storageKeys.playerCommands, []), runPlayerCommand, '<div>');
        
        // Attach the below chat input commands
        var cmndDiv = $("#ch-cmnds");
        cmndDiv.empty();
        attachCommands(cmndDiv, get(storageKeys.generalCommands, []), runGeneralCommand);
        if (get(storageKeys.generalCommands, []).length > 0 && get(storageKeys.quickCommands, []).length > 0) {
            // Insert a spacer between the two command types
            cmndDiv.append($('<div>').addClass('ch-h-spacer'));
        }
        attachCommands(cmndDiv, get(storageKeys.quickCommands, []), runQuickCommand);
    }
    
    /**
     * Builds each of the contents of the tabs.
     */
    function buildTabContents() {
        // Filters tab
        buildTable(
            'ch-filters',
            mergeDefaults(get(storageKeys.filters, []), filterDefaults),
            {
                'Match'  : {
                    'value' : 'regex',
                    'class' : 'ch-large'
                },
                'Match All' : {
                    'type'    : 'checkbox',
                    'value'   : function(data) {
                        if (data && data.indexOf('g') > -1) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    'data'    : 'modifiers',
                    'default' : true,
                    'class'   : 'ch-global-mod-flag'
                },
                'Ignore Case' : {
                    'type'    : 'checkbox',
                    'value'   : function(data) {
                        if (data && data.indexOf('i') > -1) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    'data'    : 'modifiers',
                    'default' : true
                },
                'Replace' : {
                    'value' : 'replace',
                    'class' : 'ch-medium'
                },
                'Alert' : {
                    type  : 'checkbox',
                    value : 'alert'
                },
                'Count' : {
                    'value' : function(data) {
                        if (data) {
                            return data;
                        } else {
                            return '';
                        }
                    },
                    'data'  : 'count',
                    'class' : 'ch-tiny'
                }
            }
        );
        
        // Command Tabs
        buildTable('ch-pcmnds', get(storageKeys.playerCommands,  []), commandTableLayout);
        buildTable('ch-gcmnds', get(storageKeys.generalCommands, []), commandTableLayout);
        buildTable('ch-qcmnds', get(storageKeys.quickCommands,   []), commandTableLayout);
    }
    
    /**
     * Builds a table into the given component. Note: any existing tables inside of the
     * html element will be removed and replaced with this one.
     * @param {string} tableId The HTML id of the element.
     * @param {object} data The data to put into the table.
     * @param {object} layout The table headers and content definitions. Used
     * to map the data to the table. Consists of labels : column definition.
     * @returns {undefined}
     */
    function buildTable(tableId, data, layout) {
        // Initialize the variables
        var table = $('<table>'),
            header = $('<thead>'),
            body = $('<tbody>'),
            row,
            definitions = [],
            td;
        
        //   Construct the Header   //
        row = $('<tr>');
        
        // Add the actions column
        row.append('<th> </th>');
        // Add the headers
        $.each(layout, function(index, value) {
            row.append($('<th>').text(index));
            definitions.push(value);
        });
        header.append(row);
        
        //    Construct the Body    //
        if (data) {
            // Add the data
            $.each(data, function(index, value) {
                body.append(
                    buildRow(definitions, value)
                );
            });
        }
        
        // Attach the add new row
        row = $('<tr>');
        td = $('<td>').attr('colspan', definitions.length + 1);
        td.append(
            $('<img>').attr({
                'src'   : 'http://chockly.org/ch/plus.png',// Modified Fuque Icon
                'alt'   : 'Add',
                'class' : 'ch-add-new',
                'title' : 'Add'
            })
            .data('columns', definitions)
            .click(function(event) {
                var jThis = $(this);
                var tr = jThis.parent().parent(),
                    columns = jThis.data('columns');
               
                tr.before(buildRow(columns));
            })
        );
        body.append(row.append(td));
        
        
        // Put it all together and attach to the page
        table.append(header);
        table.append(body);
        
        $("#" + tableId).find('table').remove();
        $("#" + tableId).append(table);
    }
    
    /**
     * Builds a row for the console helper manager interface's tables.
     * @param {array} columnDefinitions An array containing definitions for
     * each of the columns in the row.
     * @param {mixed} data The data to be inserted into the row. Optional, when
     * not set the default values for the inputs are used.
     * @returns {jQuery} The jQuery HTML element for the row.
     */
    function buildRow(columnDefinitions, data) {
        var row = $('<tr>'),
            td,
            input,
            name,
            numColumns = columnDefinitions.length,
            definition,
            column,
            result;
    
        // Attach the delete row button
        row.append($('<td>').append(
            $('<img>')
                .attr({
                    'src'   : 'http://chockly.org/ch/minus.png',// Modified Fuque Icon
                    'alt'   : 'Delete',
                    'class' : 'ch-delete',
                    'title' : 'Delete'
                })
                .click(removeRow)
            )
        );

        // Loop through the layout values
        for (var i=0; i<numColumns; i++) {
            td = $('<td>');
            input = $('<input>');
            definition = columnDefinitions[i];

            if (typeof definition === 'object') {
                column = $.extend({}, {
                    // Defaults
                    'type'   : 'text',
                    'data'   : '',
                    'value'  : '',
                    'append' : '',
                    'class'  : false,
                    'default': false
                }, definition);

                input.attr('type', column.type);

                // Get the value for the input field //
                if (data) {
                    // Value from the provided data
                    if (typeof column.value === 'function') {
                        result = column.value(data[column.data]);
                    } else {
                        result = data[column.value];
                    }
                    
                // No value provided, get the default value
                } else if (column['default']) {
                    // Use the default
                    result = column['default'];
                    
                // No default provided
                } else if (column.type === 'checkbox') {
                    // Checkboxes default to false
                    result = false;
                } else {
                    // Other inputs default to an empty value
                    result = '';
                }
                
                input.attr(
                    'name',
                    (typeof column.value === 'function') ? column.data : column.value
                );

                if (column.type === 'checkbox') {
                    // Checkbox type
                    input.prop('checked', result);
                } else {
                    // Assume string type
                    input.attr('value', result);
                }

                // Append the pre-message
                td.text(column.append);

                // Attach the input class
                if (column.class) {
                    input.addClass(column.class);
                }
            } else {
                // Simple text field
                
                // Get the value
                if (data) {
                    // Use the provided value
                    result = data[definition];
                } else {
                    // Set the value to empty
                    result = '';
                }
                
                input.attr({
                    type : 'text',
                    value: result,
                    name : definition
                });
            }
            td.append(input);
            row.append(td);
        }

        return row;
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
     * Creates a hash from a string. This is not a cryptographically safe,
     * just a very basic hash generation function.
     * @param {string} input The string to get the has for.
     */
    function hash(input) {
        var hash = 0,
            l = input.length,
            character;
        
        for (var i = 0; i < l; i++) {
            character = input.charCodeAt(i);
            hash = ((hash<<5)-hash) + character;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
    /**
     * Increments the count for the provided message filter.
     * @param {object} filter The message filter.
     * @param {string} message The message causing the increment.
     */
    function incrementCount(filter, message) {
        // Use the hexadecimal hash of the regex as the key
        var key = hash(filter.regex).toString(16),
            // Get the current timestamp in seconds.
            now = Math.round(Date.now() / 1000);
        
        // Make sure we have an array.
        if (!count[key]) {
            count[key] = [];
        }
        
        count[key].push({msg:message, time: now});
        
        // Remove old values
        $.each(count, function(index, value) {
            for (var i=0; i<value.length; i++) {
                if (value[i].time < now - countDuration) {
                    // Remove the value
                    value.splice(i,1);
                }
            }
        });
        
        // Notify the user if the count for the filter has been met or exceeded.
        if (count[key].length >= filter.count) {
            notify("<b>Count Alert:</b><br>" + message);
            
            // Remove the first element to help prevent message spamming.
            count[key].shift();
        }
    }
    
    /**
     * Merges each of the objects in the data array with the provided defaults.
     * @param {array} data
     * @param {object} defaults
     * @returns {array}
     */
    function mergeDefaults(data, defaults) {
        var merged = [];
        for (var i=0; i<data.length; i++) {
            merged[i] = $.extend({}, defaults, data[i]);
        }
        return merged;
    }
    
    /**
     * Notifies the user of important events by opening a new window.
     * @param {string} message The message to display in the notification.
     */
    function notify(message) {
        var id = hash(message);
        window.open(
            'http://chockly.org/ch/?m=' + encodeURIComponent(message),
            'notify-'+id,
            'width=300,height=150,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0'
        );
    }
    
    /**
     * Proccess a chat message for input into a row.
     * @param {string} text The message to process
     * @return {string} The message ready for input as an HTML message.
     */
    function processMessage(text) {
        var filters = get(storageKeys.filters, []),
            filter,
            regex;
        
        // Escape any HTML entities
        text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Process any message notifications.
        for (var i=0; i<filters.length; i++) {
            filter = $.extend({}, filterDefaults, filters[i]);
            
            regex = new RegExp(filter.regex, filter.modifiers);
            
            // See if we have a match
            if (regex.test(text)) {
                // Replace the text
                text = text.replace(regex, filter.replace);
                
                // Pop a notification if needed
                if (filter.alert) {
                    notify("<b>Chat Message Alert:</b><br>" + text);
                }
                // Increment the count of this filter if needed.
                if(filter.count) {
                    incrementCount(filter, text);
                }
            }
        }
        
        return text;
    }
    
    /**
     * Click event handler for delete buttons. Removes the row.
     * @param {object} event The event data.
     * @param {object} row The jQuery object for the row to remove.
     * When passed in this row will be removed without confirmation.
     */
    function removeRow(event, row) {
        if (!row) {
            // No row provided, get the row from the image
            row = $(this).parent().parent();
            
            // If the row's first input method has data in it, confirm the deletion.
            if (row.find('input').first().val() != '') {
                // Use the show modal method from McMyAdmin for the confirmation
                showModal(
                    'Confirm Delete',
                    'Are you sure you wish to delete this row?',
                    Icons.Question,
                    function() {
                        removeRow(null, row);
                        hideModal();
                    },
                    hideModal
                );
                return;
            }
        }
        // Remove the row
        row.remove();
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
        text += ' ';
        if (append) {
            text += chat_box.val();
        }
        chat_box.val(text);
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
    
    
    // Build the default commands and filters if needed
    if (!get()) {
        // Nothing stored, build the defaults
        // General Commands
        set(storageKeys.generalCommands, [
            {cmnd : 's ' + localStorage.getItem('SAVEUSER'), text : 'Say'},
            {cmnd : 'msg ~console', text : 'Msg Self'}
        ]);
        // Quick Commands
        set(storageKeys.quickCommands, [
            {cmnd : 'ss',  text : 'Server Status'},
            {cmnd : 'mvw', text : 'MV Who'},
            {cmnd : 'who', text : 'Who'}
        ]);
        // Player Commands
        set(storageKeys.playerCommands, [
            {cmnd : 'ban',    text : 'Ban Player'},
            {cmnd : 'kick',   text : 'Kick Player'},
            {cmnd : 'mute',   text : 'Mute Player'},
            {cmnd : 'player', text : 'Get Player Info'}
        ]);
        
        // Filters
        set(storageKeys.filters, [
            {regex:"(hentai|ecchi|yaoi|yuri|futa|p[0o]rn|pr[0o]n|[e3]rot[i1]c|rape)",alert:true,name:"Pornographic Language"},
            {regex:"(pussy|cunt|vag|b[0o]{2,}b|breast|p[e3]+n[i1]+s?|d[i1]ck|(?:\\s|^)ass(?:$|[^u])|arse|genital)",alert:true,name:"Anatomical Terms"},
            {regex:"(b[i1]tch|wh[o0]re|jack[ \\-]*ass|n[i1]gger|sh[i1]+t|dam[mn]*(?:[^a])|fag|fuck|(?:\\s|^)f[ \\-]*(?:yo)?u+(?:\\s|$)|f[ \\-]*u{3,}|screw)",alert:true,name:"Curse Words"},
            {regex:"((?:[^r]|^)God|Christ|Jesus|hell(?:$|[^o]))",alert:true,name:"Religious Language"},
            {regex:"(h[ea]lp|st[oa]p)",name:"Help Words"},
            {regex:"(gr[ei]+f|theft|th[ei]+f|stole|steal|cheat|hack|x[\\- ]*ray)",alert:true,name:"Grief Alert"},
            {regex:"(moved wrongly)",count:3,name:"Bad Movement"},
            {regex:"(https?://\\w+\\.\\w+\\S+)",replace:"<a target='_blank' href=\"$1\">$1</a>",name:"URL creator"}
        ]);
    }
    
    
    //   Context Menu   //
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
    buildCommands();
    
    
    //  Helper Manager Interface  //
    // Insert the helper manager interface into the page, with the filters tab selected by default.
    $('body').append(
"<div id='ch-manager' class='modalbg modalnormal'>"
+   "<div class='modalpanel'>"
+       "<div class='ch-tabs'>"
+           "<div class='subtabhead'>"
+               "<a href='#ch-filters' class='subtab picked'>Filters</a>"
+               "<a href='#ch-pcmnds'  class='subtab'>Player Commands</a>"
+               "<a href='#ch-gcmnds'  class='subtab'>General Commands</a>"
+               "<a href='#ch-qcmnds'  class='subtab'>Quick Commands</a>"
+           "</div>"
+           "<div id='ch-filters' class='subtabcontainer' style='display:block'><p>Create regular expression filters that are applied to the console messages.<br/>Help with regular expressions: <a href='http://net.tutsplus.com/tutorials/javascript-ajax/you-dont-know-anything-about-regular-expressions/' target='_blank'>Regular Expression Tutorial</a> &mdash; <a href='http://regexpal.com/' target='_blank'>Regular Expression Tester</a></p></div>"
+           "<div id='ch-pcmnds'  class='subtabcontainer'><p>These commands are available when right clicking on a player name in the sidebar. The player's name is added after the command.</p></div>"
+           "<div id='ch-gcmnds'  class='subtabcontainer'><p>These commands are added as buttons below the console input box.</p></div>"
+           "<div id='ch-qcmnds'  class='subtabcontainer'><p>These commands are added as buttons below the console input box and run when they are clicked on.</p></div>"
+       "</div>"
+       "<div class='modalbuttons'>"
+           "<button id='ch-save'>Save</button>"
+           "<button id='ch-cancel'>Cancel</button>"
+       "</div>"
+   "</div>"
+"</div>"
    );
    
    // Build the tab contents
    buildTabContents();
    
    // Save/Cancel button click event handlers
    $("#ch-save").click(function(event) {
        $("#ch-manager").hide();
        
        // Serialize and store the tabs
        var obj, contents, jobj, value, name, modifiers = '';
        
        // Loop through each tab
        $.each(storageKeys, function(i, key) {
            contents = [];
            
            // Loop through each row
            $.each($("#ch-" + key + " tr"), function(i, row) {
                obj = {};
                
                // Loop through each input on the row
                $.each($(row).find('input'), function(i, input) {
                    jobj = $(input);
                    name = jobj.attr('name');
                    
                    // Get the value of the input box
                    if (jobj.attr('type') == 'checkbox') {
                        value = jobj.prop('checked');
                    } else {
                        value = jobj.val();
                    }
                    
                    if (key == 'filters') {
                        // Filters have special serialization needs
                        
                        if (name == 'count') {
                            // Count should be a number or false
                            value = (value == '') ? false : value*1;
                            if (isNaN(value) || value <= 0) {
                                value = false;
                            }
                        } else if (name == 'modifiers' && value) {
                            // Regex Modifier Flag
                            if (jobj.hasClass('ch-global-mod-flag')) {
                                // Global
                                modifiers += 'g';
                            } else {
                                // Case Insensitive
                                modifiers += 'i';
                            }
                            // Modifiers are handled later, exit for now
                            return;
                        }
                        
                        // If the value is the same as the default, don't store it.
                        if (filterDefaults[name] == value) {
                            return;
                        }
                    }
                    // Store the value
                    obj[name] = value;
                });
                if (!$.isEmptyObject(obj)) {
                    if (key == 'filters' && modifiers != filterDefaults.modifiers) {
                        // Merge in the modifiers now
                        obj.modifiers = modifiers;
                    }
                    contents.push(obj);
                }
                modifiers = '';
            });
            
            // Store the serialized tab
            set(key, contents);
        });
        
        // Rebuild the commands incase they have changed
        buildCommands();
    });
    $("#ch-cancel").click(function(event) {
        $("#ch-manager").hide();
        
        // Rebuild the tabs so that any changes are lost
        buildTabContents();
    });
    
    
    // Attach a user info link for opening the manager
    $("#userinfo")
        .append($('<span>').text(" | "))
        .append(
            $("<a>")
            .attr('href', '#console-helper')
            .click(function(event){
                $("#ch-manager").show();
                event.preventDefault();
            })
            .text('Console Helper')
        );
    
    
    // Replace the current add chat row function with the modified one
    window.addChatEntry = addChatEntry;
    
    // Debugging helpers //
    // Expose the local storage helpers
    window.set = set;
    window.get = get;
    window.clear = clear;
    window.addFilter = function(filter) {
        var filters = get(storageKeys.filters);
        filters.push(filter);
        set(storageKeys.filters, filters);
    };
    window.updateFilter = function(index, value, key) {
        var filters = get(storageKeys.filters);
        if (key) {
            filters[index][key] = value;
        } else {
            filters[index] = value;
        }
        set(storageKeys.filters, filters);
    };
};

// Inserts the main method into the page so that JQuery works.
var chathelper = document.createElement('script');
chathelper.type = "text/javascript";
chathelper.textContent = '(' + ch_m.toString() + ')(jQuery);';
document.body.appendChild(chathelper);
