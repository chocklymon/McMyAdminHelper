/*!
 * <%= pkg.name %> v<%= pkg.version %>
 * http://chockly.org/
 *
 * Copyright © <%= grunt.template.today('yyyy') %> <%= pkg.author %>
 * Licensed under the <%= pkg.license %> license.
 */
var chMain = function () {
    "use strict";
    /*!code injection start*/
    // Anything placed here will be replaced with the actual code
    /*!code injection end*/
};

// Inserts the main method into the page so that it can override javascript
// functions on the page.
var chatHelper = document.createElement("script");
chatHelper.type = "application/javascript";
chatHelper.id = "chMain";
chatHelper.setAttribute("data-version", "<%= pkg.version %>");
chatHelper.setAttribute("data-build-date", "<%= grunt.template.today('yyyy-mm-dd HH:MM:ss') %>");
chatHelper.textContent = "jQuery(" + chMain.toString() + ");";
document.body.appendChild(chatHelper);
