(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function bootJuniors() {
        HCC.initJuniorsFixturesFeed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootJuniors);
    } else {
        bootJuniors();
    }
})(window, document);
