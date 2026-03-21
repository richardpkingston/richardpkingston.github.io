(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    HCC.initPlayCricketWidget = function initPlayCricketWidget() {
        var widgetLink = document.querySelector("a.lsw");
        if (!widgetLink) return;

        var cssHref = "https://www.play-cricket.com/live_scorer.css";
        var jsHref = "https://www.play-cricket.com/live_scorer.js";

        var alreadyLoaded = Array.prototype.some.call(document.styleSheets, function (sheet) {
            return sheet.href === cssHref;
        });

        if (!alreadyLoaded) {
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = cssHref;
            document.head.appendChild(link);
        }

        if (!document.getElementById("lsw-wjs")) {
            var js = document.createElement("script");
            js.id = "lsw-wjs";
            js.src = jsHref;
            document.body.appendChild(js);
        }
    };

    HCC.initLivestreamEmbed = function initLivestreamEmbed() {
        var liveContainer = HCC.byId("live-container");
        var API_KEY = "YOUR_API_KEY";
        var CHANNEL_ID = "UCEY81pC3tG4_0OaV-svjkwA";

        if (!liveContainer || !API_KEY || API_KEY === "YOUR_API_KEY") return;

        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" +
            CHANNEL_ID +
            "&eventType=live&type=video&key=" +
            API_KEY;

        fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error("YouTube API request failed");
                return res.json();
            })
            .then(function (data) {
                if (!data.items || !data.items.length) return;

                var videoId = data.items[0].id.videoId;

                liveContainer.innerHTML = '' +
                    '<div class="live-embed">' +
                    '    <div class="ratio ratio-16x9">' +
                    '        <iframe ' +
                    '                src="https://www.youtube.com/embed/' + videoId + '" ' +
                    '                title="Honley CC livestream" ' +
                    '                allowfullscreen ' +
                    '                loading="lazy">' +
                    '        </iframe>' +
                    '    </div>' +
                    '</div>';
            })
            .catch(function (err) {
                console.warn("Livestream check failed:", err);
            });
    };

    function bootHome() {
        HCC.initPlayCricketWidget();
        HCC.initHomepageMatchSummary();
        HCC.initHomeTicker();
        HCC.initLivestreamEmbed();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHome);
    } else {
        bootHome();
    }
})(window, document);
