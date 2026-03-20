(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function boot() {
        HCC.setLastModified();
        HCC.setCurrentYears();
        HCC.normaliseExternalLinks();
        HCC.initPlayCricketWidget();
        HCC.initHomepageMatchSummary();
        HCC.initResultsPageFeed();
        HCC.initHawksFixturesFeed();
        HCC.initJuniorsFixturesFeed();
        HCC.initHomeTicker();
        HCC.initHawksTicker();
        HCC.initMembershipPage();
        HCC.initLivestreamEmbed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(window, document);
