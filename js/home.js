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

        /**
     * Countdown clock
     */
    (function () {
        const matchDate = new Date("2026-04-18T12:30:00").getTime();

        const daysEl = document.getElementById("countdown-inline-days");
        const hoursEl = document.getElementById("countdown-inline-hours");
        const minutesEl = document.getElementById("countdown-inline-minutes");
        const secondsEl = document.getElementById("countdown-inline-seconds");

        function updateCountdownBadge() {
            const now = new Date().getTime();
            const distance = matchDate - now;

            if (distance <= 0) {
                daysEl.textContent = "0d";
                hoursEl.textContent = "00h";
                minutesEl.textContent = "00m";
                secondsEl.textContent = "00s";
                clearInterval(timer);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            daysEl.textContent = `${days}d`;
            hoursEl.textContent = `${String(hours).padStart(2, "0")}h`;
            minutesEl.textContent = `${String(minutes).padStart(2, "0")}m`;
            secondsEl.textContent = `${String(seconds).padStart(2, "0")}s`;
        }

        updateCountdownBadge();
        const timer = setInterval(updateCountdownBadge, 1000);
    })();
    
})(window, document);
