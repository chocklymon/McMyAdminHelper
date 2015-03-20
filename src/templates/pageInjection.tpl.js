/*!
 * <%= pkg.name %> v<%= pkg.version %>
 * http://chockly.org/
 *
 * Copyright © <%= grunt.template.today('yyyy') %> <%= pkg.author %>
 * Licensed under the <%= pkg.license %> license.
 */
var chMain = function ($) {
    "use strict";
    /*!code injection start*/
    $();
    /*!code injection end*/
};

// Inserts the main method into the page so that it can override javascript
// functions on the page.
var chatHelper = document.createElement("script");
chatHelper.type = "application/javascript";
chatHelper.textContent = "jQuery(" + chMain.toString() + ");";
document.body.appendChild(chatHelper);
