/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */

// Globals from Chrome Extension JS API
/* global chrome jQuery */
jQuery(function ($) {
    "use strict";

    var sitesList = $("#sites"),
        updateSites = function () {
            var sites = [], temp;
            $.each($("input", sitesList), function (index, value) {
                temp = $(value).val().trim();
                if (temp !== "") {
                    sites.push(temp);
                }
            });
            chrome.storage.sync.set({"sites": sites}, function () {
                // TODO provide feedback to the page
                console.log("Enabled Sites Updated");
            });
        },
        showDelete = function () {
            var del = $(this).addClass("hide").siblings(".delete");
            del.css("transform", "translate3d(0,0,0)");
        },
        updateRow = function () {
            var $this = $(this);
            var value = $this.val().trim();
            if (value !== "") {
                // Make sure it starts with an http protocol
                if (value.indexOf("http") !== 0) {
                    value = "http://" + value;
                    $this.val(value);
                }
                // Update the list of enabled sites.
                updateSites();
            }
        },
        removeRow = function () {
            $(this).parent().remove();
            updateSites();
        },
        buildSite = function (value) {
            $("<div>").addClass("row").append(
                    $("<input>").attr({"type": "text", "value": value}).on("change", updateRow)
                )
                .append(
                    $("<img>").attr({"src": "minus.png", "alt": "", "title": "Remove"}).click(showDelete)
                )
                .append(
                    $("<span>").addClass("delete").css("transform", "translate3d(62px,0,0)").text("Delete").click(removeRow)
                )
                .appendTo(sitesList);
        },
        addRow = function () {
            buildSite();
        };

    $("#site-add").click(addRow);

    chrome.storage.sync.get("sites", function (items) {
        // Add the existing sites
        $.each(items.sites, function (index, value) {
            buildSite(value);
        });

        // Add a blank row on the end
        buildSite();
    });
});
