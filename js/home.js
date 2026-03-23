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

    HCC.initHomepageCountdown = function initHomepageCountdown() {
        var daysEl = document.getElementById("countdown-inline-days");
        var hoursEl = document.getElementById("countdown-inline-hours");
        var minutesEl = document.getElementById("countdown-inline-minutes");
        var badgeTextEl = document.querySelector(".countdown-badge-text");
        var refreshTimeout = null;
        var timer = null;

        if (!daysEl || !hoursEl || !minutesEl || !badgeTextEl) return;

        function clearTimers() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
                refreshTimeout = null;
            }
        }

        function setBadgeHtml(html) {
            badgeTextEl.innerHTML = html;
            daysEl = document.getElementById("countdown-inline-days");
            hoursEl = document.getElementById("countdown-inline-hours");
            minutesEl = document.getElementById("countdown-inline-minutes");
        }

        function setCountdownText(days, hours, minutes) {
            if (daysEl) daysEl.textContent = days + "d";
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0") + "h";
            if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0") + "m";
        }

        function renderBadgePrefix() {
            setBadgeHtml(
                'Next match in ' +
                '<strong id="countdown-inline-days">' + HCC.escapeHtml(daysEl.textContent || "0d") + '</strong>' +
                '<strong id="countdown-inline-hours">' + HCC.escapeHtml(hoursEl.textContent || "00h") + '</strong>' +
                '<strong id="countdown-inline-minutes">' + HCC.escapeHtml(minutesEl.textContent || "00m") + '</strong>'
            );
        }

        function setFallback(message) {
            clearTimers();
            setBadgeHtml(HCC.escapeHtml(message));
        }

        function scheduleRefresh(delayMs) {
            refreshTimeout = window.setTimeout(function () {
                loadNextFixture(true);
            }, delayMs);
        }

        function startCountdown(targetDate) {
            clearTimers();
            renderBadgePrefix();

            function updateCountdown() {
                var now = Date.now();
                var distance = targetDate.getTime() - now;

                if (distance <= 0) {
                    clearTimers();
                    loadNextFixture(true);
                    return;
                }

                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

                if (days === 0 && hours === 0) {
                    setCountdownText(0, 0, minutes);
                } else {
                    setCountdownText(days, hours, minutes);
                }
            }

            updateCountdown();
            timer = window.setInterval(updateCountdown, 30000);
            scheduleRefresh(HCC.COUNTDOWN_REFRESH_MS || (5 * 60 * 1000));
        }

        function loadNextFixture(forceRefresh) {
            HCC.loadClubData({ forceRefresh: !!forceRefresh }).then(function (data) {
                var nextFixture = HCC.getNextFirstXIFixture(data.fixtures);
                var nextFixtureDate = HCC.getFixtureDateTime(nextFixture);

                if (!nextFixture || !nextFixtureDate) {
                    setFallback("No upcoming 1st XI fixture");
                    return;
                }

                startCountdown(nextFixtureDate);
            }).catch(function (err) {
                console.warn("Homepage countdown failed:", err);
                setFallback("Fixture update unavailable");
            });
        }

        loadNextFixture(false);
    };

    function bootHome() {
        HCC.initPlayCricketWidget();
        HCC.initHomepageMatchSummary();
        HCC.initHomeTicker();
        HCC.initLivestreamEmbed();
        HCC.initHomepageCountdown();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHome);
    } else {
        bootHome();
    }
})(window, document);
