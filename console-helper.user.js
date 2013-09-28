// ==UserScript==
// @name McMyAdmin Console Helper
// @description Adds additional functionality to the McMyAdmin console page.
// @author Curtis Oakley
// @version 0.0.1
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
{regex:"(hentai|ecchi|yaoi|yuri|futa|p[0o]rn|pr[0o]n|[e3]rot[i1]c|rape)",modifiers:"gi",replace:"<i>$1</i>",alert:true,name:"Pornographic Language"}
{regex:"(pussy|cunt|b[i1]tch|whore|p[e3]+n[i1]+s?|(?:\\s|^)ass|jack[ \\-]*ass|arse|nigger|sh[i1]+t|dam[mn]|vag|fag|fuck|(?:[^io]|^)f[ \\-]*you|d[i1]ck|screw|genital|b[0o]+b|breast)",modifiers:"gi",replace:"<i>$1</i>",alert:true,name:"Curse Words"}
{regex:"(God|Christ|Jesus|hell(?:$|[^o]))",modifiers:"gi",replace:"<i>$1</i>",alert:true,name:"Religious Language"}

- Help Words -
{regex:"(h[ea]lp|st[oa]p)",modifiers:"gi",replace:"<i>$1</i>",alert:false,name:"Help Words"}
{regex:"(gr[ei]+f|theft|th[ei]+f|stole|steal|cheat|hack|x[- ]*ray)",modifiers:"gi",replace:"<i>$1</i>",alert:true,name:"Grief Alert"}

- URLs -
{regex:"(https?://.*\\.\\w+\\S+)",modifiers:"gi",replace:"<a target='_blank' href=\"$1\">$1</a>",alert:false,name:"URL creator"}

- Name -
{regex:"(fred|waffle|console)",modifiers:"gi",replace:"<i>$1</i>",alert:false,name:"Username"}

- Misc -
{regex:"(moved wrongly)",modifiers:"", replace:"<b>$i</b>", alert:false, name:"Misc"}
*/

// Wrap everything inside of an anymous function
var ch_m = function($) {
    
    /* ----------------------------- *
     *  VARIABLES AND CONFIGURATION  *
     * ----------------------------- */
    
    var
    
    /** The key used to retrieve and set data from the local storage object. */
    localStorageKey = "cdata",
    
    /** The data object containing the local storage data. */
    data = JSON.parse(localStorage.getItem(localStorageKey));
    
    
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
        window.open('http://c.lan/personal/chat-helper/notify.php?message=' + encodeURIComponent(message),
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
    
    
    // Replace the current add row function with mine
    window.addChatEntry = addChatEntry;
    
    // Expose the local storage helpers
    window.set = set;
    window.get = get;
    
    // This works to bind events to clicking the players names
    /*
    $("#chatNames").click(function(event) {
        var player_div = $(event.target);
        console.log(player_div.text);//Outputs the clicked on players name
    });
    */
};

// Inserts the main method into the header of the page so that JQuery works.
var chathelper = document.createElement('script');
chathelper.type = "text/javascript";
chathelper.textContent = '(' + ch_m.toString() + ')(jQuery);';
document.body.appendChild(chathelper);
