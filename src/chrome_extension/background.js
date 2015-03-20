// Globals from Chrome Extension JS API
/* global chrome */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    "use strict";

    if (changeInfo.status === "complete") {
        // Page has loaded
        chrome.storage.sync.get("sites", function (items) {
            // See if we need to inject the console helper into the page
            if (items && items.sites) {
                var sites = items.sites;
                for (var i = 0; i < sites.length; i++) {
                    if (tab.url.indexOf(sites[i]) === 0) {
                        // Should run.
                        chrome.tabs.insertCSS(tabId, {file: "console-helper.css"});
                        chrome.tabs.executeScript(tabId, {file: "console-helper.js"});
                    }
                }
            }
        });
    }
});
