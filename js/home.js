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

    function getMatchDurationMs(fixture) {
        var comp = (fixture && fixture.competition_name ? fixture.competition_name : "").toLowerCase();

        if (comp.includes("t20") || comp.includes("twenty20")) {
            return 3 * 60 * 60 * 1000;
        }

        return 6 * 60 * 60 * 1000;
    }

    function getFixtureContext(fixture) {
        if (!fixture) return {};

        var isHome = fixture.home_club_name === "Honley CC";

        return {
            isHome: isHome,
            opponent: isHome ? fixture.away_club_name : fixture.home_club_name,
            venueIcon: isHome ? "🏠" : "🚗",
            venueText: isHome ? "Home" : "Away"
        };
    }

    function getCurrentOrNextFirstXIFixture(fixtures) {
        var now = new Date().getTime();

        var firstXIFixtures = (fixtures || [])
            .filter(function (item) {
                return HCC.getHonleyTeamLabel(item) === "1st XI";
            })
            .map(function (item) {
                return {
                    fixture: item,
                    date: HCC.getFixtureDateTime(item)
                };
            })
            .filter(function (item) {
                return item.date && !isNaN(item.date.getTime());
            })
            .sort(function (a, b) {
                return a.date.getTime() - b.date.getTime();
            });

        for (var i = 0; i < firstXIFixtures.length; i++) {
            var fixtureObj = firstXIFixtures[i];
            var start = fixtureObj.date.getTime();
            var matchDurationMs = getMatchDurationMs(fixtureObj.fixture);
            var end = start + matchDurationMs;

            if (now >= start && now < end) {
                return {
                    fixture: fixtureObj.fixture,
                    date: fixtureObj.date,
                    status: "in_progress"
                };
            }

            if (now < start) {
                return {
                    fixture: fixtureObj.fixture,
                    date: fixtureObj.date,
                    status: "upcoming"
                };
            }
        }

        return null;
    }

    HCC.getCurrentOrNextFirstXIFixture = getCurrentOrNextFirstXIFixture;

    HCC.initHomepageCountdown = function initHomepageCountdown() {
        var badgeTextEl = document.querySelector(".countdown-badge-text");
        var refreshTimeout = null;
        var timer = null;

        if (!badgeTextEl) return;

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
        }

        function setSimpleMessage(message) {
            setBadgeHtml(HCC.escapeHtml(message));
        }

        function setFallback(message) {
            clearTimers();
            setSimpleMessage(message);
        }

        function scheduleRefresh(delayMs) {
            refreshTimeout = window.setTimeout(function () {
                loadRelevantFixture(true);
            }, delayMs);
        }

        function buildBadgeHtml(text, fixture, isInProgress) {
            var ctx = getFixtureContext(fixture);
            var statusClass = isInProgress ? " countdown-live" : "";

            return (
                '<span class="countdown-prefix">' +
                (ctx.venueIcon || "") +
                '</span>' +
                '<span class="countdown-main' + statusClass + '">' +
                HCC.escapeHtml(text) +
                '</span>' +
                (ctx.opponent
                    ? '<span class="countdown-opponent"> v ' + HCC.escapeHtml(ctx.opponent) + '</span>'
                    : '')
            );
        }

        function setStructured(text, fixture, isInProgress) {
            setBadgeHtml(buildBadgeHtml(text, fixture, isInProgress));
        }

        function startCountdown(targetDate, fixture, status) {
            clearTimers();

            function updateCountdown() {
                var now = new Date().getTime();
                var matchDurationMs = getMatchDurationMs(fixture);
                var matchEnd = targetDate.getTime() + matchDurationMs;
                var distance = targetDate.getTime() - now;

                if (status === "in_progress") {
                    if (now < matchEnd) {
                        setStructured("Match in progress", fixture, true);
                        return;
                    }

                    clearTimers();
                    loadRelevantFixture(true);
                    return;
                }

                if (distance <= 0) {
                    if (now < matchEnd) {
                        setStructured("Match in progress", fixture, true);
                        return;
                    }

                    clearTimers();
                    loadRelevantFixture(true);
                    return;
                }

                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

                if (distance < 2 * 60 * 60 * 1000) {
                    var mins = Math.max(1, Math.ceil(distance / (1000 * 60)));
                    setStructured("Starts in " + mins + "m", fixture, false);
                    return;
                }

                var currentDate = new Date(now);
                var sameDay =
                    currentDate.getFullYear() === targetDate.getFullYear() &&
                    currentDate.getMonth() === targetDate.getMonth() &&
                    currentDate.getDate() === targetDate.getDate();

                if (sameDay || distance < 24 * 60 * 60 * 1000) {
                    var time = targetDate.toLocaleTimeString("en-GB", {
                        hour: "numeric",
                        minute: "2-digit"
                    });

                    setStructured("Today " + time, fixture, false);
                    return;
                }

                setStructured(
                    days + "d " +
                    String(hours).padStart(2, "0") + "h " +
                    String(minutes).padStart(2, "0") + "m",
                    fixture,
                    false
                );
            }

            updateCountdown();
            timer = window.setInterval(updateCountdown, 30000);
            scheduleRefresh(HCC.COUNTDOWN_REFRESH_MS || (5 * 60 * 1000));
        }

        function loadRelevantFixture(forceRefresh) {
            HCC.loadClubData({ forceRefresh: !!forceRefresh }).then(function (data) {
                var matchInfo = getCurrentOrNextFirstXIFixture(data.fixtures);

                if (!matchInfo || !matchInfo.date) {
                    setFallback("No upcoming 1st XI fixture");
                    return;
                }

                startCountdown(matchInfo.date, matchInfo.fixture, matchInfo.status);
            }).catch(function (err) {
                console.warn("Homepage countdown failed:", err);
                setFallback("Fixture update unavailable");
            });
        }

        loadRelevantFixture(false);
    };

    HCC.initHomepageMatchHero = function initHomepageMatchHero() {
        var heroEl = document.getElementById("homeMatchHero");
        if (!heroEl) return;

        function escapeHtml(value) {
            return HCC.escapeHtml(value || "");
        }

        function formatDateTime(date) {
            if (!date) return "";
            return date.toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        function getFixtureStatusLabel(matchInfo) {
            if (!matchInfo) return "Upcoming";
            if (matchInfo.status === "in_progress") return "Live";
            return "Upcoming";
        }

        function getFixtureTitle(fixture) {
            if (!fixture) return "No fixture available";
            return escapeHtml((fixture.home_club_name || "") + " v " + (fixture.away_club_name || ""));
        }

        function getFixtureMeta(fixture, date) {
            var parts = [];
            if (fixture && fixture.competition_name) parts.push(escapeHtml(fixture.competition_name));
            if (date) parts.push(escapeHtml(formatDateTime(date)));
            if (fixture && fixture.ground_name) parts.push(escapeHtml(fixture.ground_name));
            return parts.join(" · ");
        }

        function getLiveScoreText(data, fixture) {
            if (data && data.latestResult && data.latestResult.result_summary) {
                return escapeHtml(data.latestResult.result_summary);
            }
            if (fixture && fixture.result_summary) {
                return escapeHtml(fixture.result_summary);
            }
            if (fixture && fixture.status_text) {
                return escapeHtml(fixture.status_text);
            }
            return "";
        }

        function renderHero(matchInfo, data) {
            var fixture = matchInfo ? matchInfo.fixture : null;
            var date = matchInfo ? matchInfo.date : null;
            var status = getFixtureStatusLabel(matchInfo);
            var statusClass = matchInfo && matchInfo.status === "in_progress" ? "match-hero-status live" : "match-hero-status";
            var scoreText = matchInfo && matchInfo.status === "in_progress"
                ? getLiveScoreText(data, fixture) || "Live score available in widget below"
                : "Next fixture";

            var scorecardUrl = fixture && fixture.match_url ? fixture.match_url : "https://honleycc.play-cricket.com/Matches";
            var fixturesUrl = "https://honleycc.play-cricket.com/Matches?tab=Fixture";

            heroEl.innerHTML =
                '<div class="match-hero-top">' +
                    '<span class="' + statusClass + '">' + escapeHtml(status) + '</span>' +
                    '<span class="match-hero-competition">' +
                        (fixture && fixture.competition_name ? escapeHtml(fixture.competition_name) : "") +
                    '</span>' +
                '</div>' +
                '<h3 class="match-hero-title">' + getFixtureTitle(fixture) + '</h3>' +
                '<p class="match-hero-score">' + scoreText + '</p>' +
                '<p class="match-hero-meta">' + getFixtureMeta(fixture, date) + '</p>' +
                '<div class="match-hero-actions">' +
                    '<a class="btn btn-primary" href="' + scorecardUrl + '" target="_blank" rel="noopener">Match centre</a>' +
                    '<a class="btn btn-primary" href="' + fixturesUrl + '" target="_blank" rel="noopener">Fixtures list</a>' +
                '</div>';
        }

        HCC.loadClubData({ forceRefresh: false }).then(function (data) {
            var matchInfo = HCC.getCurrentOrNextFirstXIFixture
                ? HCC.getCurrentOrNextFirstXIFixture(data.fixtures)
                : null;

            if (!matchInfo) {
                heroEl.innerHTML = '<p class="muted">No upcoming senior fixture found.</p>';
                return;
            }

            renderHero(matchInfo, data);
        }).catch(function () {
            heroEl.innerHTML = '<p class="muted">Unable to load match centre right now.</p>';
        });
    };

    function bootHome() {
        HCC.initPlayCricketWidget();
        HCC.initHomepageMatchSummary();
        HCC.initHomeTicker();
        HCC.initLivestreamEmbed();
        HCC.initHomepageCountdown();
        HCC.initHomepageMatchHero();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootHome);
    } else {
        bootHome();
    }
})(window, document);