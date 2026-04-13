(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    function initHawksTicker() {
        var trackEl = document.getElementById("hawksTickerTrack");
        if (!trackEl || !HCC || typeof HCC.loadClubData !== "function") return;

        function isWomen(item) {
            return HCC.teamLabelMatches(
                HCC.getHonleyTeamLabel(item),
                ["Womens 1st XI", "Women's 1st XI", "Womens XI", "Women", "Hawks", "Hawks Women"]
            );
        }

        function isGirls(item) {
            return HCC.teamLabelMatches(
                HCC.getHonleyTeamLabel(item),
                ["Girls Under 15", "Honley CC - Girls Under 15", "U15 Girls", "Girls U15", "U15 Girls XI", "Girls"]
            );
        }

        Promise.all([
            HCC.loadClubData({ forceRefresh: false }),
            typeof HCC.loadNewsItems === "function" ? HCC.loadNewsItems() : Promise.resolve([])
        ]).then(function (responses) {
            var data = responses[0];
            var newsItems = responses[1] || [];
            var items = [];

            var womenNext = HCC.getUpcoming(data.fixtures, 1, isWomen)[0];
            var girlsNext = HCC.getUpcoming(data.fixtures, 1, isGirls)[0];
            var womenRes = HCC.getRecent(data.results, 1, isWomen)[0];
            var girlsRes = HCC.getRecent(data.results, 1, isGirls)[0];

            if (womenNext) {
                items.push({
                    icon: "bi-calendar-event-fill",
                    text: "Women: " +
                        HCC.getMatchTitle(womenNext) +
                        " — " +
                        HCC.formatDate(womenNext.match_date || womenNext.date)
                });
            }

            if (girlsNext) {
                items.push({
                    icon: "bi-calendar-heart-fill",
                    text: "Girls: " +
                        HCC.getMatchTitle(girlsNext) +
                        " — " +
                        HCC.formatDate(girlsNext.match_date || girlsNext.date)
                });
            }

            if (womenRes) {
                items.push({
                    icon: "bi-trophy-fill",
                    text: "Women result: " + HCC.getResultText(womenRes)
                });
            }

            if (girlsRes) {
                items.push({
                    icon: "bi-award-fill",
                    text: "Girls result: " + HCC.getResultText(girlsRes)
                });
            }

            items = (newsItems || []).concat(items);
            HCC.renderTicker(trackEl, items, "Loading Women and U15 Girls updates...");
        }).catch(function (err) {
            console.warn("Hawks ticker failed:", err);
            HCC.renderTicker(trackEl, [], "Unable to load Women and U15 Girls updates.");
        });
    }

    function bootHawks() {
        if (!HCC) return;

        if (typeof HCC.initHawksFixturesFeed === "function") {
            HCC.initHawksFixturesFeed();
        }

        initHawksTicker();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHawks);
    } else {
        bootHawks();
    }
})(window, document);