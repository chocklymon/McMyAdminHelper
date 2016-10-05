/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015-2016 Curtis Oakley
 * Licensed under the MIT license.
 */

var TabbedModal = (function () {
    "use strict";

    var modalWindow = $("<div id='ch-modal' class='modalbg modalnormal'><div class='modalpanel'></div></div>"),
        tabContents = $("<div class='ch-tabs modalcontents' />").appendTo(modalWindow.children().first()),
        tabTitles = $("<div class='subtabhead' />").appendTo(tabContents),
        saveCallbacks = [],
        contentBuilders = [];

    // Attach the buttons
    modalWindow.children().first().append(
        $("<div class='modalbuttons' />")
            .append($("<button>Save</button>").click(saveTabs))
            .append($("<button>Cancel</button>").click(reset))
            .append($("<button>Close</button>").click(closeModal))
    );

    // Attach the modal to the page
    $("body").append(modalWindow);


    function addTab(title, contentBuilder, saveCallback) {
        // Save the content builder and save callback
        contentBuilders.push(contentBuilder);
        saveCallbacks.push(saveCallback);

        // Build the tabs
        var tabId = "tab-" + contentBuilders.length,
            contents = contentBuilder(),
            tabContent = $("<div class='subtabcontainer'/>").attr("id", tabId).append(contents),
            tabTitle = $("<a class='subtab'/>").text(title).attr("href", "#" + tabId);

        if (contentBuilders.length === 1) {
            tabContent.css("display", "block");
            tabTitle.addClass("picked");
        }

        // Attach the tabs
        tabContents.append(tabContent);
        tabTitles.append(tabTitle);
    }

    function closeModal() {
        modalWindow.hide();
    }

    function empty() {
        tabTitles.empty();
        tabContents.remove("div:gt(0)");

        saveCallbacks = [];
        contentBuilders = [];
    }

    function saveTabs() {
        $.each(saveCallbacks, function (i, saveCallback) {
            saveCallback();
        });
    }

    function reset() {
        $.each(contentBuilders, function (index, contentBuilder) {
            var contents = contentBuilder();
            $("tab-" + index).empty().append(contents);
        });
    }

    return {
        close: closeModal,
        open: function () {
            modalWindow.show();
        },
        addTab: addTab,
        empty: empty
    };
})();
