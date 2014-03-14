
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo['status'] === 'complete') {
        // Page has loaded
        if (tab.url === 'http://72.249.124.178:25967/') {// TODO get this from storage
            console.log("Injecting Content Script");
            chrome.tabs.insertCSS(tabId, {file: "console-helper.css"});
            chrome.tabs.executeScript(tabId, {file: "console-helper.js"});
        }
    }
});
