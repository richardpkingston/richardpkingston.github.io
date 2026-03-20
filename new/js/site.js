/* =========================================================
   Honley Cricket Club - Site JavaScript
   ---------------------------------------------------------
   Handles:
   1. Footer last-modified date
   2. Play-Cricket widget loader
   3. Homepage match summary (next + latest)
   4. Fixtures/results page feeds
   5. Membership page accordion shortcuts
   6. YouTube livestream embed
   ========================================================= */

(function () {
    "use strict";

    /* ==========================================
       Utility: Last modified footer
    ========================================== */

    var lastModifiedEl = document.getElementById("lastModified");

    if (lastModifiedEl) {
        var modifiedDate = new Date(document.lastModified);

        lastModifiedEl.textContent = new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(modifiedDate);
    }

    /* ==========================================
       Utility: Date helpers
    ========================================== */

    function formatDate(value) {
        if (!value) return "Date TBC";

        var parts = String(value).split("/");

        if (parts.length === 3) {
            var dt = new Date(parts[2], parts[1] - 1, parts[0]);

            if (!isNaN(dt.getTime())) {
                return dt.toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                });
            }
        }

        var parsed = new Date(value);

        if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short"
            });
        }

        return value;
    }

    function parseDate(value) {
        if (!value) return null;

        var parts = String(value).split("/");

        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }

        return new Date(value);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function buildUrl(endpoint) {
        return "https://www.play-cricket.com/api/v2/" + endpoint +
            "?site_id=" + SITE_ID +
            "&season=" + season +
            "&api_token=" + API_TOKEN;
    }

    function loadJson(url) {
        return fetch(url, {cache: "no-store"}).then(function (response) {
            if (!response.ok) {
                throw new Error("Request failed: " + response.status);
            }
            return response.json();
        });
    }

    function loadClubData() {
        return Promise.all([
            loadJson(buildUrl("matches.json")).catch(function () {
                return {matches: []};
            }),
            loadJson(buildUrl("result_summary.json")).catch(function () {
                return {result_summary: []};
            })
        ]).then(function (responses) {
            return {
                fixtures: responses[0].matches || [],
                results: responses[1].result_summary || []
            };
        });
    }

    /* ==========================================
       Play-Cricket widget loader
       Loads the Live Scorer assets once if a page
       contains one of the widget placeholder links.
    ========================================== */

    (function loadPlayCricketWidget() {
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
    })();

    /* ==========================================
       Play-Cricket API configuration
    ========================================== */

    var SITE_ID = 3463;
    var API_TOKEN = "e3dc2fd497532bd833fd0a96b2697680";
    var season = new Date().getFullYear();

    /* ==========================================
       Homepage: next match + latest result
    ========================================== */

    (function initHomepageMatchSummary() {
        var nextMatchEl = document.getElementById("nextMatch");
        var latestMatchEl = document.getElementById("latestMatchResult");

        if (!nextMatchEl || !latestMatchEl) return;

        loadClubData()
            .then(function (data) {
                var fixtures = data.fixtures;
                var results = data.results;

                var today = new Date();
                today.setHours(0, 0, 0, 0);

                var next = fixtures
                    .filter(function (item) {
                        var d = parseDate(item.match_date || item.date);
                        return d && d >= today;
                    })
                    .sort(function (a, b) {
                        return parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                    })[0];

                var latest = results
                    .slice()
                    .sort(function (a, b) {
                        return parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                    })[0];

                if (next) {
                    nextMatchEl.innerHTML =
                        '<h4>' + escapeHtml(next.home_club_name || "") + ' v ' + escapeHtml(next.away_club_name || "") + '</h4>' +
                        '<p class="match-meta">' + escapeHtml(formatDate(next.match_date || next.date)) + '</p>' +
                        '<a class="btn btn-outline btn-sm" rel="noopener" href="' + escapeHtml(next.match_url || "results.html") + '">Match centre</a>';
                } else {
                    nextMatchEl.innerHTML =
                        '<p class="match-meta">No upcoming fixture found.</p>' +
                        '<a class="btn btn-outline btn-sm" rel="noopener" href="results.html">Fixtures &amp; results</a>';
                }

                if (latest) {
                    latestMatchEl.innerHTML =
                        '<h4>' + escapeHtml(latest.home_club_name || "") + ' v ' + escapeHtml(latest.away_club_name || "") + '</h4>' +
                        '<p class="match-meta">' + escapeHtml(latest.result_description || "Latest completed match") + '</p>' +
                        '<a class="btn btn-outline btn-sm" rel="noopener" href="' + escapeHtml(latest.match_url || "results.html") + '">Scorecard</a>';
                } else {
                    latestMatchEl.innerHTML =
                        '<p class="match-meta">No recent result found.</p>' +
                        '<a class="btn btn-outline btn-sm" rel="noopener" href="results.html">Latest results</a>';
                }
            })
            .catch(function () {
                nextMatchEl.innerHTML =
                    '<p class="match-meta">Fixture data is unavailable right now.</p>' +
                    '<a class="btn btn-outline btn-sm" href="results.html">Fixtures &amp; results</a>';

                latestMatchEl.innerHTML =
                    '<p class="match-meta">Result data is unavailable right now.</p>' +
                    '<a class="btn btn-outline btn-sm" href="results.html">Fixtures &amp; results</a>';
            });
    })();

    /* ==========================================
       Results page: fixtures + results feed
    ========================================== */

    (function initResultsPageFeed() {
        var statusEl = document.getElementById("resultsStatus");
        var upcomingEl = document.getElementById("upcomingFixtures");
        var resultsEl = document.getElementById("latestResults");

        if (!upcomingEl || !resultsEl) return;

        function asArray(obj, key) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj[key])) return obj[key];
            return [];
        }

        function fixtureItem(item) {
            var title = item.home_club_name && item.away_club_name
                ? item.home_club_name + " v " + item.away_club_name
                : (item.match_name || "Upcoming fixture");

            var dateText = formatDate(item.match_date || item.date);
            var comp = item.competition_name || item.competition || "";
            var ground = item.ground_name || item.ground || "";
            var link = item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Fixture";

            return [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date">', escapeHtml(dateText), '</span></div>',
                '<h4>', escapeHtml(title), '</h4>',
                comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '',
                ground ? '<p class="match-meta">Ground: ' + escapeHtml(ground) + '</p>' : '',
                '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">Open fixture</a></p>',
                '</article>'
            ].join("");
        }

        function resultItem(item) {
            var title = item.home_club_name && item.away_club_name
                ? item.home_club_name + " v " + item.away_club_name
                : (item.match_name || "Latest result");

            var dateText = formatDate(item.match_date || item.date);
            var comp = item.competition_name || item.competition || "";
            var resultText = item.result_description || item.result || "";
            var homeAway = "";

            if (item.home_result && item.away_result) {
                homeAway = item.home_result + " / " + item.away_result;
            }

            var link = item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Result";

            return [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date">', escapeHtml(dateText), '</span></div>',
                '<h4>', escapeHtml(title), '</h4>',
                comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '',
                resultText ? '<p class="match-result">' + escapeHtml(resultText) + '</p>' : '',
                homeAway ? '<p class="match-meta">' + escapeHtml(homeAway) + '</p>' : '',
                '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">Open result</a></p>',
                '</article>'
            ].join("");
        }

        function renderEmpty(target, icon, title, text, links, buttonText) {
            var linkItems = Array.isArray(links)
                ? links
                : [{href: links, label: buttonText || "Open"}];

            var buttonsHtml = linkItems.map(function (link) {
                return '<a class="btn btn-outline btn-sm" href="' +
                    escapeHtml(link.href) +
                    '" rel="noopener" target="_blank">' +
                    escapeHtml(link.label) +
                    '</a>';
            }).join(' ');

            target.innerHTML = [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date"><i class="bi ', icon, '"></i></span></div>',
                '<h4>', title, '</h4>',
                '<p class="match-meta">', text, '</p>',
                '<p class="match-actions">', buttonsHtml, '</p>',
                '</article>'
            ].join("");
        }

        loadClubData()
            .then(function (data) {
                var fixtures = asArray(data.fixtures, "matches");
                var results = asArray(data.results, "result_summary");

                var today = new Date();
                today.setHours(0, 0, 0, 0);

                var upcoming = fixtures
                    .filter(function (item) {
                        var d = parseDate(item.match_date || item.date);
                        return d && d >= today;
                    })
                    .sort(function (a, b) {
                        return parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                    })
                    .slice(0, 3);

                var recent = results
                    .slice()
                    .sort(function (a, b) {
                        return parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                    })
                    .slice(0, 3);

                if (upcoming.length) {
                    upcomingEl.innerHTML = upcoming.map(fixtureItem).join("");
                } else {
                    renderEmpty(
                        upcomingEl,
                        "bi-calendar-event-fill",
                        "No upcoming fixtures found",
                        "Use the full fixtures list on Play-Cricket for the latest schedule.",
                        "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                        "Open fixtures"
                    );
                }

                if (recent.length) {
                    resultsEl.innerHTML = recent.map(resultItem).join("");
                } else {
                    renderEmpty(
                        resultsEl,
                        "bi-trophy-fill",
                        "No recent results found",
                        "A full results list is on Play-Cricket.",
                        "https://honleycc.play-cricket.com/Matches?tab=Result",
                        "Open results"
                    );
                }

                if (statusEl) {
                    statusEl.textContent = "Showing the next 3 fixtures and latest 3 completed results for season " + season + ".";
                }
            })
            .catch(function () {
                if (statusEl) {
                    statusEl.textContent = "Unable to load live Play-Cricket data just now.";
                }

                renderEmpty(
                    upcomingEl,
                    "bi-calendar-event-fill",
                    "Fixtures unavailable",
                    "Open the full fixtures list on Play-Cricket.",
                    "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                    "Open fixtures"
                );

                renderEmpty(
                    resultsEl,
                    "bi-trophy-fill",
                    "Results unavailable",
                    "Open the full results list on Play-Cricket.",
                    "https://honleycc.play-cricket.com/Matches?tab=Result",
                    "Open results"
                );
            });
    })();

    /* ==========================================
       Hawks page ticker: Women + U15 Girls only
       Team IDs:
       407977 = Women
       407978 = U15 Girls
   ========================================== */
    (function initHawksTicker() {
        var tickerTrack = document.getElementById("hawksTickerTrack");
        if (!tickerTrack) return;

        var HAWKS_TEAM_IDS = ["407977", "407978"];

        function renderTicker(items) {
            if (!items || !items.length) {
                tickerTrack.innerHTML =
                    '<span class="ticker-item">' +
                    '<i class="bi bi-info-circle-fill" aria-hidden="true"></i>' +
                    '<span class="ticker-text">No Women or U15 Girls updates available</span>' +
                    '</span>';
                return;
            }

            tickerTrack.innerHTML = items.map(function (item, index) {
                var separator = index < items.length - 1
                    ? '<span class="ticker-separator" aria-hidden="true">•</span>'
                    : '';

                return (
                    '<span class="ticker-item">' +
                    '<i class="bi ' + escapeHtml(item.icon || 'bi-calendar-event-fill') + '" aria-hidden="true"></i>' +
                    '<span class="ticker-text">' + escapeHtml(item.text) + '</span>' +
                    '</span>' +
                    separator
                );
            }).join('');
        }

        function isHawksMatch(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            return HAWKS_TEAM_IDS.indexOf(homeTeamId) !== -1 ||
                HAWKS_TEAM_IDS.indexOf(awayTeamId) !== -1;
        }

        function getHawksTeamLabel(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            if (homeTeamId === "407977" || awayTeamId === "407977") {
                return "Women";
            }

            if (homeTeamId === "407978" || awayTeamId === "407978") {
                return "U15 Girls";
            }

            return "";
        }

        function getTeamPriority(item) {
            var label = getHawksTeamLabel(item);
            if (label === "Women") return 1;
            if (label === "U15 Girls") return 2;
            return 9;
        }

        function buildTickerItems(fixtures, results) {
            var items = [];
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            var upcoming = (fixtures || [])
                .filter(function (item) {
                    var d = parseDate(item.match_date || item.date);
                    return d && d >= today && isHawksMatch(item);
                })
                .sort(function (a, b) {
                    var dateDiff = parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                    if (dateDiff !== 0) return dateDiff;
                    return getTeamPriority(a) - getTeamPriority(b);
                })
                .slice(0, 3);

            var recent = (results || [])
                .filter(function (item) {
                    return isHawksMatch(item);
                })
                .slice()
                .sort(function (a, b) {
                    return parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                });

            var latest = recent[0];

            if (latest) {
                var latestLabel = getHawksTeamLabel(latest);
                items.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") +
                        "Latest result: " +
                        (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = getHawksTeamLabel(fixture);
                var title = fixture.home_club_name && fixture.away_club_name
                    ? fixture.home_club_name + " v " + fixture.away_club_name
                    : (fixture.match_name || "Upcoming fixture");

                items.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date) +
                        ": " +
                        (label ? label + " – " : "") +
                        title
                });
            });

            return items;
        }

        function getFallbackItems() {
            return [
                { icon: "bi-person-hearts", text: "Women and U15 Girls fixtures on Play-Cricket" },
                { icon: "bi-calendar-event-fill", text: "See the latest Women fixtures and results" },
                { icon: "bi-calendar-event-fill", text: "See the latest U15 Girls fixtures and results" }
            ];
        }

        loadClubData()
            .then(function (data) {
                var fixtures = data.fixtures;
                var results = data.results;

                var items = buildTickerItems(fixtures, results);

                if (!items.length) {
                    items = getFallbackItems();
                }

                renderTicker(items);
            })
            .catch(function () {
                renderTicker(getFallbackItems());
            });
    })();

    /* ==========================================
       Women's team fixtures and results feed
       Hawks page: fixtures + results feed
       Team ID: 407977 (women) 407977 (u15 girls)
    ========================================== */
    (function initHawksFixturesFeed() {
        var statusEl = document.getElementById("hawksResultsStatus");
        var upcomingEl = document.getElementById("hawksUpcomingFixtures");
        var resultsEl = document.getElementById("hawksLatestResults");

        if (!upcomingEl || !resultsEl) return;

        var HAWKS_TEAM_IDS = ["407977", "407978"];
        var WOMENS_TEAM_URL = "https://honleycc.play-cricket.com/Teams/407977";
        var U15_TEAM_URL = "https://honleycc.play-cricket.com/Teams/407978";
        var DEFAULT_TEAM_URL = WOMENS_TEAM_URL;

        function asArray(obj, key) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj[key])) return obj[key];
            return [];
        }

        function isHawksMatch(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            return HAWKS_TEAM_IDS.indexOf(homeTeamId) !== -1 ||
                HAWKS_TEAM_IDS.indexOf(awayTeamId) !== -1;
        }

        function getHawksTeamLabel(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            if (homeTeamId === "407977" || awayTeamId === "407977") {
                return "Women";
            }

            if (homeTeamId === "407978" || awayTeamId === "407978") {
                return "U15 Girls";
            }

            return "";
        }

        function getHawksTeamUrl(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            if (homeTeamId === "407978" || awayTeamId === "407978") {
                return U15_TEAM_URL;
            }

            if (homeTeamId === "407977" || awayTeamId === "407977") {
                return WOMENS_TEAM_URL;
            }

            return DEFAULT_TEAM_URL;
        }

        function fixtureItem(item) {
            var teamLabel = getHawksTeamLabel(item);
            var title = item.home_club_name && item.away_club_name
                ? item.home_club_name + " v " + item.away_club_name
                : (item.match_name || "Upcoming fixture");

            if (teamLabel) {
                title = teamLabel + " – " + title;
            }

            var dateText = formatDate(item.match_date || item.date);
            var comp = item.competition_name || item.competition || "";
            var ground = item.ground_name || item.ground || "";
            var link = item.match_url || item.url || getHawksTeamUrl(item);

            return [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date">', escapeHtml(dateText), '</span></div>',
                '<h4>', escapeHtml(title), '</h4>',
                comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '',
                ground ? '<p class="match-meta">Ground: ' + escapeHtml(ground) + '</p>' : '',
                '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">Open fixture</a></p>',
                '</article>'
            ].join("");
        }

        function resultItem(item) {
            var teamLabel = getHawksTeamLabel(item);
            var title = item.home_club_name && item.away_club_name
                ? item.home_club_name + " v " + item.away_club_name
                : (item.match_name || "Latest result");

            if (teamLabel) {
                title = teamLabel + " – " + title;
            }

            var dateText = formatDate(item.match_date || item.date);
            var comp = item.competition_name || item.competition || "";
            var resultText = item.result_description || item.result || "";
            var scores = "";
            var link = item.match_url || item.url || getHawksTeamUrl(item);

            if (item.home_result && item.away_result) {
                scores = item.home_result + " / " + item.away_result;
            }

            return [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date">', escapeHtml(dateText), '</span></div>',
                '<h4>', escapeHtml(title), '</h4>',
                comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '',
                resultText ? '<p class="match-result">' + escapeHtml(resultText) + '</p>' : '',
                scores ? '<p class="match-meta">' + escapeHtml(scores) + '</p>' : '',
                '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">Open result</a></p>',
                '</article>'
            ].join("");
        }

        function renderEmpty(target, icon, title, text, href, buttonText) {
            target.innerHTML = [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date"><i class="bi ', icon, '"></i></span></div>',
                '<h4>', title, '</h4>',
                '<p class="match-meta">', text, '</p>',
                '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', href, '" rel="noopener" target="_blank">', buttonText, '</a></p>',
                '</article>'
            ].join("");
        }

        loadClubData()
            .then(function (data) {
                var fixtures = asArray(data.fixtures, "matches").filter(isHawksMatch);
                var results = asArray(data.results, "result_summary").filter(isHawksMatch);

                var today = new Date();
                today.setHours(0, 0, 0, 0);

                var upcoming = fixtures
                    .filter(function (item) {
                        var d = parseDate(item.match_date || item.date);
                        return d && d >= today;
                    })
                    .sort(function (a, b) {
                        return parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                    })
                    .slice(0, 4);

                var recent = results
                    .slice()
                    .sort(function (a, b) {
                        return parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                    })
                    .slice(0, 4);

                if (upcoming.length) {
                    upcomingEl.innerHTML = upcoming.map(fixtureItem).join("");
                } else {
                    renderEmpty(
                        upcomingEl,
                        "bi-calendar-event-fill",
                        "No upcoming Women or U15 Girls fixtures found",
                        "Use the Play-Cricket team pages for the full fixture list.",
                        [
                            {href: WOMENS_TEAM_URL, label: "Open Women's team"},
                            {href: U15_TEAM_URL, label: "Open U15 Girls team"}
                        ]
                    );
                }

                if (recent.length) {
                    resultsEl.innerHTML = recent.map(resultItem).join("");
                } else {
                    renderEmpty(
                        resultsEl,
                        "bi-trophy-fill",
                        "No recent Women or U15 Girls results found",
                        "Use the Play-Cricket team pages for the latest results.",
                        [
                            {href: WOMENS_TEAM_URL, label: "Open Women's team"},
                            {href: U15_TEAM_URL, label: "Open U15 Girls team"}
                        ]
                    );
                }

                if (statusEl) {
                    statusEl.textContent = "Showing the latest Women and U15 Girls fixtures and results from Play-Cricket.";
                }
            })
            .catch(function (err) {
                console.warn("Hawks fixtures feed failed:", err);

                if (statusEl) {
                    statusEl.textContent = "Unable to load Women and U15 Girls fixtures and results right now.";
                }

                renderEmpty(
                    upcomingEl,
                    "bi-calendar-event-fill",
                    "Fixtures unavailable",
                    "Open the Play-Cricket team pages.",
                    WOMENS_TEAM_URL,
                    "Open Women's team"
                );

                renderEmpty(
                    resultsEl,
                    "bi-trophy-fill",
                    "Results unavailable",
                    "Open the Play-Cricket team pages.",
                    U15_TEAM_URL,
                    "Open U15 Girls team"
                );
            });
    })();

    /* ==========================================
       Membership page: quick links to accordion
       ------------------------------------------------
       - Highlights the selected membership button
       - Opens the relevant Bootstrap collapse panel
       - Scrolls smoothly to the membership group
       - Keeps button state in sync if a panel is
         opened directly inside the accordion
    ========================================== */

    (function initMembershipPage() {
        if (!window.jQuery) return;

        var buttons = window.jQuery(".membership-type-button");
        var accordion = window.jQuery("#accordion");

        if (!buttons.length || !accordion.length) return;

        function setActiveButton(targetId) {
            buttons.removeClass("active");

            buttons.each(function () {
                var button = window.jQuery(this);
                if (button.attr("href") === "#" + targetId) {
                    button.addClass("active");
                }
            });
        }

        function scrollToGroup(targetId) {
            var target = window.jQuery("#" + targetId);
            if (!target.length) return;

            window.jQuery("html, body").stop().animate({
                scrollTop: target.offset().top - 110
            }, 260);
        }

        buttons.on("click", function (event) {
            event.preventDefault();

            var button = window.jQuery(this);
            var targetId = (button.attr("href") || "").replace("#", "");
            var collapseId = button.data("target-collapse");

            if (!targetId) return;

            setActiveButton(targetId);

            accordion.find(".panel-collapse.in").collapse("hide");

            if (collapseId) {
                setTimeout(function () {
                    window.jQuery("#" + collapseId).collapse("show");

                    setTimeout(function () {
                        scrollToGroup(targetId);
                    }, 220);
                }, 120);
            } else {
                setTimeout(function () {
                    scrollToGroup(targetId);
                }, 120);
            }
        });

        accordion.on("show.bs.collapse", function (event) {
            accordion.find(".panel-collapse.in").not(event.target).collapse("hide");

            var groupId = window.jQuery(event.target).closest(".membership-group").attr("id");
            if (groupId) {
                setActiveButton(groupId);
            }
        });
    })();

    /* ==========================================
       YouTube livestream embed
    ========================================== */

    (function initLivestreamEmbed() {
        var liveContainer = document.getElementById("live-container");
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
                    '    <div class="embed-responsive embed-responsive-16by9">' +
                    '        <iframe class="embed-responsive-item" ' +
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
    })();

    /* ==========================================
       HERO TICKER: latest updates / fixtures
       Uses shared utilities + Play-Cricket v2
    ========================================== */
    (function () {
        var tickerTrack = document.getElementById("heroTickerTrack");
        if (!tickerTrack) return;

        function renderTicker(items) {
            if (!items || !items.length) {
                tickerTrack.innerHTML =
                    '<span class="ticker-item"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><span class="ticker-text">No updates available</span></span>';
                return;
            }

            tickerTrack.innerHTML = items.map(function (item, index) {
                var separator = index < items.length - 1
                    ? '<span class="ticker-separator" aria-hidden="true"> | </span>'
                    : '';

                return (
                    '<span class="ticker-item">' +
                    '<i class="bi ' + escapeHtml(item.icon || 'bi-calendar-event-fill') + '" aria-hidden="true"></i>' +
                    '<span class="ticker-text">' + escapeHtml(item.text) + '</span>' +
                    '</span>' +
                    separator
                );
            }).join('');
        }

        function getTeamLabel(item) {
            var homeClub = String(item.home_club_name || "").toLowerCase();
            var awayClub = String(item.away_club_name || "").toLowerCase();
            var homeTeam = String(item.home_team_name || "").toLowerCase();
            var awayTeam = String(item.away_team_name || "").toLowerCase();

            var honleyTeam = "";

            if (homeClub.indexOf("honley") !== -1) {
                honleyTeam = homeTeam;
            } else if (awayClub.indexOf("honley") !== -1) {
                honleyTeam = awayTeam;
            } else {
                return "";
            }

            if (honleyTeam.indexOf("1st xi") !== -1) return "1st XI";
            if (honleyTeam.indexOf("2nd xi") !== -1) return "2nd XI";
            if (honleyTeam.indexOf("3rd xi") !== -1) return "3rd XI";

            return "";
        }

        function getTeamPriority(item) {
            var team = getTeamLabel(item);
            if (team === "1st XI") return 1;
            if (team === "2nd XI") return 2;
            if (team === "3rd XI") return 3;
            return 9;
        }

        function buildTickerItems(fixtures, results) {
            var items = [];
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            var upcoming = (fixtures || [])
                .filter(function (item) {
                    var d = parseDate(item.match_date || item.date);
                    return d && d >= today;
                })
                .sort(function (a, b) {
                    var dateDiff = parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                    if (dateDiff !== 0) return dateDiff;
                    return getTeamPriority(a) - getTeamPriority(b);
                });

            var preferredUpcoming = upcoming
                .filter(function (item) {
                    var team = getTeamLabel(item);
                    return team === "1st XI" || team === "2nd XI";
                })
                .slice(0, 2);

            if (!preferredUpcoming.length) {
                preferredUpcoming = upcoming.slice(0, 2);
            }

            var latestResults = (results || [])
                .slice()
                .sort(function (a, b) {
                    return parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                });

            var preferredLatest = latestResults.find(function (item) {
                var team = getTeamLabel(item);
                return team === "1st XI" || team === "2nd XI";
            }) || latestResults[0];

            if (preferredLatest) {
                var latestTeam = getTeamLabel(preferredLatest);
                items.push({
                    icon: "bi-trophy-fill",
                    text: (latestTeam ? latestTeam + " – " : "") +
                        "Latest result: " +
                        (preferredLatest.result_description || "Match completed")
                });
            }

            preferredUpcoming.forEach(function (fixture) {
                var team = getTeamLabel(fixture);
                var title = fixture.home_club_name && fixture.away_club_name
                    ? fixture.home_club_name + " v " + fixture.away_club_name
                    : "Upcoming fixture";

                items.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date) +
                        ": " +
                        (team ? team + " – " : "") +
                        title
                });
            });

            return items;
        }

        function getFallbackNews() {
            return [
                {icon: "bi-people-fill", text: "Junior training runs each Friday."},
                {icon: "bi-person-hearts", text: "Honley Hawks now recruiting."},
                {icon: "bi-megaphone-fill", text: "Players always welcome."}
            ];
        }

        Promise.all([
            fetch("news.json", {cache: "no-store"})
                .then(function (r) {
                    if (!r.ok) throw new Error("news.json failed");
                    return r.json();
                })
                .catch(function () {
                    return getFallbackNews();
                }),
            loadJson(buildUrl("matches.json")).catch(function () {
                return {matches: []};
            }),
            loadJson(buildUrl("result_summary.json")).catch(function () {
                return {result_summary: []};
            })
        ])
            .then(function (responses) {
                var manualNews = responses[0];
                var fixtures = responses[1].matches || [];
                var results = responses[2].result_summary || [];

                var liveItems = buildTickerItems(fixtures, results);
                var combined = manualNews.concat(liveItems).slice(0, 6);

                renderTicker(combined);
            })
            .catch(function () {
                renderTicker(getFallbackNews());
            });
    })();
})();