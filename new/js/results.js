(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function bootResults() {
        HCC.initResultsPageFeed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootResults);
    } else {
        bootResults();
    }
})(window, document);
