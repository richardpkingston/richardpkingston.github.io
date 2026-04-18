(function (window, document) {
    "use strict";

    var HCC = window.HCC || {};

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
        var API_KEY = "AIzaSyDolr65SXnr_7tp1EVQl3R7Yyr_fH0cCdM";
        var CHANNEL_ID = "UCEY81pC3tG4_0OaV-svjkwA";

        if (!liveContainer || !API_KEY || API_KEY === "YOUR_API_KEY") return;

        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" +
            encodeURIComponent(CHANNEL_ID) +
            "&eventType=live&type=video&maxResults=1&key=" +
            encodeURIComponent(API_KEY);

        fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error("YouTube API request failed: " + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data.items || !data.items.length || !data.items[0].id || !data.items[0].id.videoId) {
                    return;
                }

                var videoId = data.items[0].id.videoId;

                liveContainer.innerHTML =
                    '<div class="live-embed">' +
                    '  <div class="ratio ratio-16x9">' +
                    '    <iframe ' +
                    '      src="https://www.youtube.com/embed/' + videoId + '?rel=0" ' +
                    '      title="Honley CC livestream" ' +
                    '      loading="lazy" ' +
                    '      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
                    '      referrerpolicy="strict-origin-when-cross-origin" ' +
                    '      allowfullscreen>' +
                    '    </iframe>' +
                    '  </div>' +
                    '</div>';

                if (window.location.hash === "#watch-live") {
                    setTimeout(function () {
                        var el = document.getElementById("watch-live");
                        if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }, 300);
                }
            })
            .catch(function (err) {
                console.warn("Livestream check failed:", err);
            });
    };

    function getMatchDurationMs(fixture) {
        var comp = (fixture && fixture.competition_name ? fixture.competition_name : "").toLowerCase();

        if (comp.indexOf("t20") !== -1 || comp.indexOf("twenty20") !== -1) {
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

    function getFixtureUrl(fixture) {
        return (fixture && (fixture.match_url || fixture.scorecard_url || fixture.url)) ||
            "https://honleycc.play-cricket.com/Matches";
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

    function formatDateOnly(date) {
        if (!date) return "";
        return date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    }

    function formatCountdownHoursMinutes(distanceMs) {
        var totalMinutes = Math.max(1, Math.ceil(distanceMs / (1000 * 60)));
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;

        if (hours <= 0) {
            return totalMinutes + "m";
        }

        // ✅ Add leading zero to minutes
        var minsFormatted = String(minutes).padStart(2, "0");

        if (minutes === 0) {
            return hours + "h";
        }

        return hours + "h " + minsFormatted + "m";
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function getDayDifference(fromDate, toDate) {
        var fromDay = startOfDay(fromDate);
        var toDay = startOfDay(toDate);
        return Math.round((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24));
    }

    function getTeamFixtures(fixtures, teamLabels) {
        var labels = Array.isArray(teamLabels) ? teamLabels : [teamLabels];

        return (fixtures || [])
            .filter(function (item) {
                var label = HCC.getHonleyTeamLabel(item);
                var competition = (item.competition_name || "").toLowerCase();

                if (HCC.teamLabelMatches && HCC.teamLabelMatches(label, labels)) {
                    return true;
                }

                if (labels.indexOf("Sunday XI") !== -1) {
                    return label === "Sunday Section" || competition.indexOf("sunday") !== -1;
                }

                return false;
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
    }

    function getCurrentOrNextTeamFixture(fixtures, teamLabels) {
        var now = new Date().getTime();
        var teamFixtures = getTeamFixtures(fixtures, teamLabels);

        for (var i = 0; i < teamFixtures.length; i++) {
            var fixtureObj = teamFixtures[i];
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

    function getNextUpcomingTeamFixture(fixtures, teamLabels, afterFixture) {
        var teamFixtures = getTeamFixtures(fixtures, teamLabels);

        if (!afterFixture) {
            return teamFixtures.length ? teamFixtures[0] : null;
        }

        var afterId = afterFixture.id || afterFixture.fixture_id || afterFixture.match_url || null;
        var foundCurrent = false;

        for (var i = 0; i < teamFixtures.length; i++) {
            var item = teamFixtures[i];
            var itemId = item.fixture.id || item.fixture.fixture_id || item.fixture.match_url || null;

            if (foundCurrent) {
                return item;
            }

            if (afterId && itemId && afterId === itemId) {
                foundCurrent = true;
            }
        }

        return null;
    }

    function getCurrentOrNextFirstXIFixture(fixtures) {
        return getCurrentOrNextTeamFixture(fixtures, "1st XI");
    }

    function getNextUpcomingFirstXIFixture(fixtures, afterFixture) {
        return getNextUpcomingTeamFixture(fixtures, "1st XI", afterFixture);
    }

    HCC.getCurrentOrNextFirstXIFixture = getCurrentOrNextFirstXIFixture;
    HCC.getNextUpcomingFirstXIFixture = getNextUpcomingFirstXIFixture;

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
            setBadgeHtml(escapeHtml(message));
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
                escapeHtml(text) +
                '</span>' +
                (ctx.opponent
                    ? '<span class="countdown-opponent">v ' + escapeHtml(ctx.opponent) + '</span>'
                    : '')
            );
        }

        function setStructured(text, fixture, isInProgress) {
            setBadgeHtml(buildBadgeHtml(text, fixture, isInProgress));
        }

        function startCountdown(targetDate, fixture, status) {
            clearTimers();

            function updateCountdown() {
                var now = new Date();
                var nowMs = now.getTime();
                var matchDurationMs = getMatchDurationMs(fixture);
                var matchEnd = targetDate.getTime() + matchDurationMs;
                var distance = targetDate.getTime() - nowMs;

                if (status === "in_progress") {
                    if (nowMs < matchEnd) {
                        setStructured("Match in progress", fixture, true);
                        return;
                    }

                    clearTimers();
                    loadRelevantFixture(true);
                    return;
                }

                if (distance <= 0) {
                    if (nowMs < matchEnd) {
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
                    setStructured("Starts in " + formatCountdownHoursMinutes(distance), fixture, false);
                    return;
                }

                var dayDiff = getDayDifference(now, targetDate);
                var time = targetDate.toLocaleTimeString("en-GB", {
                    hour: "numeric",
                    minute: "2-digit"
                });

                if (dayDiff === 0) {
                    setStructured("Today " + time, fixture, false);
                    return;
                }

                if (dayDiff === 1) {
                    setStructured("Tomorrow " + time, fixture, false);
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
            HCC.loadClubData({forceRefresh: !!forceRefresh}).then(function (data) {
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

        function getFixtureStatusLabel(matchInfo) {
            if (!matchInfo) return "Featured";
            if (matchInfo.status === "in_progress") return "Live";
            return "Upcoming ";
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

        function getLiveScoreText(data) {
            var latestFirstXIResult = HCC.getLatestResultForTeamLabel(data.results, "1st XI");
            return latestFirstXIResult ? HCC.getResultText(latestFirstXIResult) : "";
        }

        function renderHero(matchInfo, data) {
            var fixture = matchInfo ? matchInfo.fixture : null;
            var date = matchInfo ? matchInfo.date : null;
            var status = getFixtureStatusLabel(matchInfo);
            var statusClass = matchInfo && matchInfo.status === "in_progress" ? "match-hero-status live" : "match-hero-status";
            var scoreText = matchInfo && matchInfo.status === "in_progress"
                ? getLiveScoreText(data) || "Live score available in widget below"
                : "Next fixture";

            var scorecardUrl = getFixtureUrl(fixture);
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

        HCC.loadClubData({forceRefresh: false}).then(function (data) {
            var matchInfo = getCurrentOrNextFirstXIFixture(data.fixtures);

            if (!matchInfo) {
                heroEl.innerHTML = '<p class="muted">No upcoming senior fixture found.</p>';
                return;
            }

            renderHero(matchInfo, data);
        }).catch(function () {
            heroEl.innerHTML = '<p class="muted">Unable to load match centre right now.</p>';
        });
    };

    HCC.initHomepageMatchSummary = function initHomepageMatchSummary() {
        var latestResultEl = document.getElementById("latestMatchResult");
        var secondXINextEl = document.getElementById("secondXINextMatch");
        var sundayXINextEl = document.getElementById("sundayXINextMatch");
        var womensNextEl = document.getElementById("womensNextMatch");

        if (!latestResultEl && !secondXINextEl && !sundayXINextEl && !womensNextEl) return;

        function renderMatchCard(targetEl, matchObj, emptyText, buttonLabel) {
            if (!targetEl) return;

            if (!matchObj || !matchObj.fixture) {
                targetEl.innerHTML = '<p class="muted">' + escapeHtml(emptyText) + '</p>';
                return;
            }

            var fixture = matchObj.fixture;
            var url = getFixtureUrl(fixture);

            targetEl.innerHTML =
                '<h3 class="match-card-title">' + escapeHtml((fixture.home_club_name || "") + ' v ' + (fixture.away_club_name || "")) + '</h3>' +
                '<p class="match-card-meta">' + escapeHtml(formatDateOnly(matchObj.date)) + '</p>' +
                '<p class="match-card-meta">' +
                escapeHtml((fixture.competition_name || fixture.league_name || fixture.competition_type || "")) +
                (fixture.ground_name ? ' · ' + escapeHtml(fixture.ground_name) : '') +
                '</p>' +
                '<p class="match-card-actions">' +
                '<a class="btn btn-primary" href="' + url + '" target="_blank" rel="noopener">' + escapeHtml(buttonLabel || "Match centre") + '</a>' +
                '</p>';
        }

        function renderLatestResult(data) {
            if (!latestResultEl) return;

            var latest = HCC.getLatestResultForTeamLabel(data.results, "1st XI");

            if (!latest) {
                latestResultEl.innerHTML = '<p class="muted">No recent result available.</p>';
                return;
            }

            latestResultEl.innerHTML = HCC.renderResultCard(latest, {
                title: HCC.getMatchTitle(latest, "Latest result"),
                link: latest.match_url || latest.url || "https://honleycc.play-cricket.com/Matches?tab=Result",
                buttonText: "Scorecard"
            });
        }

        HCC.loadClubData({forceRefresh: false}).then(function (data) {
            renderLatestResult(data);

            renderMatchCard(secondXINextEl, getCurrentOrNextTeamFixture(data.fixtures, "2nd XI"), "No upcoming 2nd XI fixture available.", "Match centre");
            renderMatchCard(sundayXINextEl, getCurrentOrNextTeamFixture(data.fixtures, ["Sunday XI", "Sunday Section"]), "No upcoming Sunday XI fixture available.", "Match centre");
            renderMatchCard(womensNextEl, getCurrentOrNextTeamFixture(data.fixtures, ["Womens 1st XI", "Women's 1st XI", "Womens XI", "Women", "Hawks", "Hawks Women"]), "No upcoming women’s fixture available.", "Match centre");
        }).catch(function (err) {
            console.warn("Homepage match summary failed:", err);
            if (latestResultEl) latestResultEl.innerHTML = '<p class="muted">Result summary unavailable.</p>';
            if (secondXINextEl) secondXINextEl.innerHTML = '<p class="muted">2nd XI unavailable.</p>';
            if (sundayXINextEl) sundayXINextEl.innerHTML = '<p class="muted">Sunday XI unavailable.</p>';
            if (womensNextEl) womensNextEl.innerHTML = '<p class="muted">Women’s fixture unavailable.</p>';
        });
    };

    HCC.initHomeTicker = function initHomeTicker() {
        var trackEl = document.getElementById("heroTickerTrack");
        if (!trackEl || typeof HCC.loadClubData !== "function") return;

        Promise.all([
            HCC.loadClubData({forceRefresh: false}),
            typeof HCC.loadNewsItems === "function" ? HCC.loadNewsItems() : Promise.resolve([])
        ]).then(function (responses) {
            var data = responses[0];
            var newsItems = responses[1] || [];
            var items = [];

            var nextFirstXI = HCC.getNextFixtureForTeamLabel(data.fixtures, "1st XI");
            var latestResult = HCC.getLatestResultForTeamLabel(data.results, "1st XI");
            var nextSecondXI = HCC.getNextFixtureForTeamLabel(data.fixtures, "2nd XI");

            if (nextFirstXI) {
                items.push({
                    icon: "bi-calendar-event-fill",
                    text: "1st XI next: " + HCC.getMatchTitle(nextFirstXI) + " — " + HCC.formatDate(nextFirstXI.match_date || nextFirstXI.date)
                });
            }

            if (latestResult) {
                items.push({
                    icon: "bi-trophy-fill",
                    text: "Latest result: " + HCC.getResultText(latestResult)
                });
            }

            if (nextSecondXI) {
                items.push({
                    icon: "bi-shield-fill",
                    text: "2nd XI next: " + HCC.getMatchTitle(nextSecondXI) + " — " + HCC.formatDate(nextSecondXI.match_date || nextSecondXI.date)
                });
            }

            items = (Array.isArray(newsItems) ? newsItems : []).concat(items);

            HCC.renderTicker(trackEl, items, "Loading fixtures, results and news...");
        }).catch(function () {
            HCC.renderTicker(trackEl, [], "Unable to load fixtures, results and news.");
        });
    };

    function bootHome() {
        HCC.initPlayCricketWidget();
        if (typeof HCC.initHomepageMatchSummary === "function") {
            HCC.initHomepageMatchSummary();
        }
        if (typeof HCC.initHomeTicker === "function") {
            HCC.initHomeTicker();
        }
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
