(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function bootHawks() {
        if (!HCC) return;
        HCC.initHawksFixturesFeed();
        HCC.initHawksTicker();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHawks);
    } else {
        bootHawks();
    }
})(window, document);
