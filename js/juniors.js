(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function bootJuniors() {
        if (!HCC) return;
        HCC.initJuniorsFixturesFeed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootJuniors);
    } else {
        bootJuniors();
    }
})(window, document);
