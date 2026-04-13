(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function bootResults() {
        if (!HCC || typeof HCC.initResultsPageFeed !== "function") {
            console.warn("HCC.initResultsPageFeed is not available.");
            return;
        }
        HCC.initResultsPageFeed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootResults);
    } else {
        bootResults();
    }
})(window, document);