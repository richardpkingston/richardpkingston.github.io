/* =========================================================
   Honley Cricket Club - Site JavaScript
   ---------------------------------------------------------
   Handles:
   1. Footer last-modified date
   2. External-link normalisation
   3. Play-Cricket widget loader
   4. Shared Play-Cricket data helpers and renderers
   5. Homepage summary cards + main ticker
   6. Results page feed
   7. Hawks fixtures/results + Hawks ticker
   8. Juniors fixtures/results feed
   9. Membership page accordion shortcuts
   10. YouTube livestream embed
   ========================================================= */

(function () {
    "use strict";

    /* ==========================================
       Core config
    ========================================== */

    var SITE_ID = 3463;
    var API_TOKEN = "e3dc2fd497532bd833fd0a96b2697680";
    var SEASON = new Date().getFullYear();

    var TEAM_CONFIG = {
        women: {
            id: "407977",
            label: "Women",
            url: "https://honleycc.play-cricket.com/Teams/407977"
        },
        u15Girls: {
            id: "407978",
            label: "U15 Girls",
            url: "https://honleycc.play-cricket.com/Teams/407978"
        },
        juniors: {
            u11: {
                id: "166913",
                label: "U11",
                url: "https://honleycc.play-cricket.com/Teams/166913",
                priority: 5
            },
            u13: {
                id: "209333",
                label: "U13",
                url: "https://honleycc.play-cricket.com/Teams/209333",
                priority: 4
            },
            u13b: {
                id: "209338",
                label: "U13B",
                url: "https://honleycc.play-cricket.com/Teams/209338",
                priority: 4
            },
            u15: {
                id: "176755",
                label: "U15",
                url: "https://honleycc.play-cricket.com/Teams/176755",
                priority: 2
            },
            u17: {
                id: "166874",
                label: "U17",
                url: "https://honleycc.play-cricket.com/Teams/166874",
                priority: 1
            },
            girlsU15: {
                id: "407978",
                label: "Girls U15",
                url: "https://honleycc.play-cricket.com/Teams/407978",
                priority: 3
            }
        }
    };

    var HAWKS_TEAM_IDS = [TEAM_CONFIG.women.id, TEAM_CONFIG.u15Girls.id];
    var JUNIOR_TEAM_MAP = Object.keys(TEAM_CONFIG.juniors).reduce(function (acc, key) {
        acc[TEAM_CONFIG.juniors[key].id] = TEAM_CONFIG.juniors[key];
        return acc;
    }, {});
    var JUNIOR_TEAM_IDS = Object.keys(JUNIOR_TEAM_MAP);

    /* ==========================================
       DOM / general helpers
    ========================================== */

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function asArray(value, key) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (Array.isArray(value[key])) return value[key];
        return [];
    }

    function parseDate(value) {
        if (!value) return null;

        var parts = String(value).split("/");

        if (parts.length === 3) {
            var fromParts = new Date(parts[2], parts[1] - 1, parts[0]);
            return isNaN(fromParts.getTime()) ? null : fromParts;
        }

        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    function formatDate(value, options) {
        var parsed = parseDate(value);
        if (!parsed) return value || "Date TBC";

        return parsed.toLocaleDateString("en-GB", options || {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    }

    function getItemDate(item) {
        return parseDate(item && (item.match_date || item.date));
    }

    function getTodayStart() {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    function getMatchTitle(item, fallback) {
        if (item && item.home_club_name && item.away_club_name) {
            return item.home_club_name + " v " + item.away_club_name;
        }
        return (item && item.match_name) || fallback || "Match";
    }

    function normaliseExternalLinks() {
        Array.prototype.forEach.call(document.querySelectorAll('a[target="_blank"]'), function (link) {
            var relValues = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
            if (relValues.indexOf("noopener") === -1) {
                relValues.push("noopener");
            }
            link.setAttribute("rel", relValues.join(" "));
        });
    }

    function setLastModified() {
        var element = byId("lastModified");
        if (!element) return;

        var modifiedDate = new Date(document.lastModified);
        element.textContent = new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(modifiedDate);
    }

    /* ==========================================
       Play-Cricket data helpers
    ========================================== */

    function buildUrl(endpoint) {
        return "https://www.play-cricket.com/api/v2/" + endpoint +
            "?site_id=" + SITE_ID +
            "&season=" + SEASON +
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
                fixtures: asArray(responses[0], "matches"),
                results: asArray(responses[1], "result_summary")
            };
        });
    }

    function getUpcoming(items, limit, filterFn, comparator) {
        var today = getTodayStart();

        return (items || [])
            .filter(function (item) {
                var itemDate = getItemDate(item);
                if (!itemDate || itemDate < today) return false;
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .sort(comparator || function (a, b) {
                return getItemDate(a) - getItemDate(b);
            })
            .slice(0, limit || 3);
    }

    function getRecent(items, limit, filterFn, comparator) {
        return (items || [])
            .filter(function (item) {
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .slice()
            .sort(comparator || function (a, b) {
                return getItemDate(b) - getItemDate(a);
            })
            .slice(0, limit || 3);
    }

    /* ==========================================
       Shared render helpers
    ========================================== */

    function buildActionButtons(links, defaultLabel) {
        var buttonLinks = Array.isArray(links) ? links : [{href: links, label: defaultLabel || "Open"}];

        return buttonLinks.map(function (link) {
            return '<a class="btn btn-outline btn-sm" href="' +
                escapeHtml(link.href) +
                '" rel="noopener" target="_blank">' +
                escapeHtml(link.label || defaultLabel || "Open") +
                '</a>';
        }).join(" ");
    }

    function renderEmptyState(target, config) {
        if (!target) return;

        target.innerHTML = [
            '<article class="match-item">',
            '<div class="match-item-top"><span class="match-date"><i class="bi ', escapeHtml(config.icon), '" aria-hidden="true"></i></span></div>',
            '<h4>', escapeHtml(config.title), '</h4>',
            '<p class="match-meta">', escapeHtml(config.text), '</p>',
            '<p class="match-actions">', buildActionButtons(config.links, config.buttonLabel), '</p>',
            '</article>'
        ].join("");
    }

    function renderFixtureCard(item, options) {
        var title = options && options.title ? options.title : getMatchTitle(item, "Upcoming fixture");
        var dateText = formatDate(item.match_date || item.date);
        var comp = item.competition_name || item.competition || "";
        var ground = item.ground_name || item.ground || "";
        var link = (options && options.link) || item.match_url || item.url || "results.html";
        var buttonText = (options && options.buttonText) || "Open fixture";

        return [
            '<article class="match-item">',
            '<div class="match-item-top"><span class="match-date">', escapeHtml(dateText), '</span></div>',
            '<h4>', escapeHtml(title), '</h4>',
            comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '',
            ground ? '<p class="match-meta">Ground: ' + escapeHtml(ground) + '</p>' : '',
            '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">', escapeHtml(buttonText), '</a></p>',
            '</article>'
        ].join("");
    }

    function renderResultCard(item, options) {
        var title = options && options.title ? options.title : getMatchTitle(item, "Latest result");
        var dateText = formatDate(item.match_date || item.date);
        var comp = item.competition_name || item.competition || "";
        var resultText = item.result_description || item.result || "";
        var scores = "";
        var link = (options && options.link) || item.match_url || item.url || "results.html";
        var buttonText = (options && options.buttonText) || "Open result";

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
            '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', escapeHtml(link), '" rel="noopener" target="_blank">', escapeHtml(buttonText), '</a></p>',
            '</article>'
        ].join("");
    }

    function renderSummaryBlock(item, options) {
        if (!item) {
            return [
                '<p class="match-meta">', escapeHtml(options.emptyText), '</p>',
                '<a class="btn btn-outline btn-sm" rel="noopener" href="', escapeHtml(options.emptyLink), '">', escapeHtml(options.emptyLabel), '</a>'
            ].join("");
        }

        var lines = [
            '<h4>' + escapeHtml(options.title || getMatchTitle(item, "Match")) + '</h4>',
            '<p class="match-meta">' + escapeHtml(options.metaText) + '</p>',
            '<a class="btn btn-outline btn-sm" rel="noopener" href="' + escapeHtml(options.link) + '">' + escapeHtml(options.buttonLabel) + '</a>'
        ];

        return lines.join("");
    }

    function renderTicker(track, items, emptyText) {
        if (!track) return;

        if (!items || !items.length) {
            track.innerHTML = '<span class="ticker-item"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><span class="ticker-text">' +
                escapeHtml(emptyText || "No updates available") +
                '</span></span>';
            return;
        }

        track.innerHTML = items.map(function (item, index) {
            var separator = index < items.length - 1
                ? '<span class="ticker-separator" aria-hidden="true">•</span>'
                : "";

            return '<span class="ticker-item">' +
                '<i class="bi ' + escapeHtml(item.icon || "bi-calendar-event-fill") + '" aria-hidden="true"></i>' +
                '<span class="ticker-text">' + escapeHtml(item.text) + '</span>' +
                '</span>' + separator;
        }).join("");
    }

    /* ==========================================
       Team helper functions
    ========================================== */

    function getHonleyTeamLabel(item) {
        var homeClub = String(item.home_club_name || "").toLowerCase();
        var awayClub = String(item.away_club_name || "").toLowerCase();
        var homeTeam = String(item.home_team_name || "").toLowerCase();
        var awayTeam = String(item.away_team_name || "").toLowerCase();
        var honleyTeam = "";

        if (homeClub.indexOf("honley") !== -1) {
            honleyTeam = homeTeam;
        } else if (awayClub.indexOf("honley") !== -1) {
            honleyTeam = awayTeam;
        }

        if (honleyTeam.indexOf("1st xi") !== -1) return "1st XI";
        if (honleyTeam.indexOf("2nd xi") !== -1) return "2nd XI";
        if (honleyTeam.indexOf("3rd xi") !== -1) return "3rd XI";
        return "";
    }

    function getHonleyTeamPriority(item) {
        var label = getHonleyTeamLabel(item);
        if (label === "1st XI") return 1;
        if (label === "2nd XI") return 2;
        if (label === "3rd XI") return 3;
        return 9;
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

        if (homeTeamId === TEAM_CONFIG.women.id || awayTeamId === TEAM_CONFIG.women.id) {
            return TEAM_CONFIG.women.label;
        }

        if (homeTeamId === TEAM_CONFIG.u15Girls.id || awayTeamId === TEAM_CONFIG.u15Girls.id) {
            return TEAM_CONFIG.u15Girls.label;
        }

        return "";
    }

    function getHawksTeamPriority(item) {
        var label = getHawksTeamLabel(item);
        if (label === TEAM_CONFIG.women.label) return 1;
        if (label === TEAM_CONFIG.u15Girls.label) return 2;
        return 9;
    }

    function getHawksTeamUrl(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeTeamId === TEAM_CONFIG.u15Girls.id || awayTeamId === TEAM_CONFIG.u15Girls.id) {
            return TEAM_CONFIG.u15Girls.url;
        }
        return TEAM_CONFIG.women.url;
    }

    function getHonleyJuniorTeamId(item) {
        var homeClub = String(item.home_club_name || "").toLowerCase();
        var awayClub = String(item.away_club_name || "").toLowerCase();
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeClub.indexOf("honley") !== -1 && JUNIOR_TEAM_IDS.indexOf(homeTeamId) !== -1) {
            return homeTeamId;
        }

        if (awayClub.indexOf("honley") !== -1 && JUNIOR_TEAM_IDS.indexOf(awayTeamId) !== -1) {
            return awayTeamId;
        }

        return "";
    }

    function isJuniorMatch(item) {
        return !!getHonleyJuniorTeamId(item);
    }

    function getJuniorTeamConfig(item) {
        return JUNIOR_TEAM_MAP[getHonleyJuniorTeamId(item)] || null;
    }

    function getJuniorTeamLabel(item) {
        var team = getJuniorTeamConfig(item);
        return team ? team.label : "";
    }

    function getJuniorTeamPriority(item) {
        var team = getJuniorTeamConfig(item);
        return team ? team.priority : 9;
    }

    function getJuniorTeamUrl(item) {
        var team = getJuniorTeamConfig(item);
        return team ? team.url : "https://honleycc.play-cricket.com/Teams";
    }

    function getJuniorTeamButtons() {
        return JUNIOR_TEAM_IDS.map(function (id) {
            return {
                href: JUNIOR_TEAM_MAP[id].url,
                label: "Open " + JUNIOR_TEAM_MAP[id].label
            };
        });
    }

    /* ==========================================
       Widget loader
    ========================================== */

    function initPlayCricketWidget() {
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
    }

    /* ==========================================
       Page initialisers
    ========================================== */

    function initHomepageMatchSummary() {
        var nextMatchEl = byId("nextMatch");
        var latestMatchEl = byId("latestMatchResult");

        if (!nextMatchEl || !latestMatchEl) return;

        loadClubData().then(function (data) {
            var next = getUpcoming(data.fixtures, 1)[0];
            var latest = getRecent(data.results, 1)[0];

            nextMatchEl.innerHTML = renderSummaryBlock(next, {
                title: next ? getMatchTitle(next, "Upcoming fixture") : "",
                metaText: next ? formatDate(next.match_date || next.date) : "",
                link: next ? (next.match_url || "results.html") : "results.html",
                buttonLabel: "Match centre",
                emptyText: "No upcoming fixture found.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });

            latestMatchEl.innerHTML = renderSummaryBlock(latest, {
                title: latest ? getMatchTitle(latest, "Latest result") : "",
                metaText: latest ? (latest.result_description || "Latest completed match") : "",
                link: latest ? (latest.match_url || "results.html") : "results.html",
                buttonLabel: "Scorecard",
                emptyText: "No recent result found.",
                emptyLink: "results.html",
                emptyLabel: "Latest results"
            });
        }).catch(function () {
            nextMatchEl.innerHTML = renderSummaryBlock(null, {
                emptyText: "Fixture data is unavailable right now.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });

            latestMatchEl.innerHTML = renderSummaryBlock(null, {
                emptyText: "Result data is unavailable right now.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });
        });
    }

    function initResultsPageFeed() {
        var statusEl = byId("resultsStatus");
        var upcomingEl = byId("upcomingFixtures");
        var resultsEl = byId("latestResults");

        if (!upcomingEl || !resultsEl) return;

        loadClubData().then(function (data) {
            var upcoming = getUpcoming(data.fixtures, 3);
            var recent = getRecent(data.results, 3);

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    return renderFixtureCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming fixtures found",
                    text: "Use the full fixtures list on Play-Cricket for the latest schedule.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                    buttonLabel: "Open fixtures"
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    return renderResultCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Result",
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent results found",
                    text: "A full results list is on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                    buttonLabel: "Open results"
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the next 3 fixtures and latest 3 completed results for season " + SEASON + ".";
            }
        }).catch(function () {
            if (statusEl) {
                statusEl.textContent = "Unable to load live Play-Cricket data just now.";
            }

            renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the full fixtures list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                buttonLabel: "Open fixtures"
            });

            renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the full results list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                buttonLabel: "Open results"
            });
        });
    }

    function initHawksFixturesFeed() {
        var statusEl = byId("hawksResultsStatus");
        var upcomingEl = byId("hawksUpcomingFixtures");
        var resultsEl = byId("hawksLatestResults");

        if (!upcomingEl || !resultsEl) return;

        loadClubData().then(function (data) {
            var upcoming = getUpcoming(data.fixtures, 4, isHawksMatch, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getHawksTeamPriority(a) - getHawksTeamPriority(b);
            });

            var recent = getRecent(data.results, 4, isHawksMatch, function (a, b) {
                var dateDiff = getItemDate(b) - getItemDate(a);
                if (dateDiff !== 0) return dateDiff;
                return getHawksTeamPriority(a) - getHawksTeamPriority(b);
            });

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = getHawksTeamLabel(item);
                    return renderFixtureCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Upcoming fixture"),
                        link: item.match_url || item.url || getHawksTeamUrl(item),
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming Women or U15 Girls fixtures found",
                    text: "Use the Play-Cricket team pages for the full fixture list.",
                    links: [
                        {href: TEAM_CONFIG.women.url, label: "Open Women's team"},
                        {href: TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                    ]
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = getHawksTeamLabel(item);
                    return renderResultCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Latest result"),
                        link: item.match_url || item.url || getHawksTeamUrl(item),
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent Women or U15 Girls results found",
                    text: "Use the Play-Cricket team pages for the latest results.",
                    links: [
                        {href: TEAM_CONFIG.women.url, label: "Open Women's team"},
                        {href: TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                    ]
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the latest Women and U15 Girls fixtures and results from Play-Cricket.";
            }
        }).catch(function (err) {
            console.warn("Hawks fixtures feed failed:", err);

            if (statusEl) {
                statusEl.textContent = "Unable to load Women and U15 Girls fixtures and results right now.";
            }

            renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: TEAM_CONFIG.women.url, label: "Open Women's team"},
                    {href: TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                ]
            });

            renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: TEAM_CONFIG.women.url, label: "Open Women's team"},
                    {href: TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                ]
            });
        });
    }

    function initJuniorsFixturesFeed() {
        var statusEl = byId("juniorsResultsStatus");
        var upcomingEl = byId("juniorsUpcomingFixtures");
        var resultsEl = byId("juniorsLatestResults");

        if (!upcomingEl || !resultsEl) return;

        loadClubData().then(function (data) {
            var upcoming = getUpcoming(data.fixtures, 8, isJuniorMatch, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getJuniorTeamPriority(a) - getJuniorTeamPriority(b);
            });

            var recent = getRecent(data.results, 8, isJuniorMatch, function (a, b) {
                var dateDiff = getItemDate(b) - getItemDate(a);
                if (dateDiff !== 0) return dateDiff;
                return getJuniorTeamPriority(a) - getJuniorTeamPriority(b);
            });

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = getJuniorTeamLabel(item);
                    return renderFixtureCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Upcoming fixture"),
                        link: item.match_url || item.url || getJuniorTeamUrl(item),
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming junior fixtures found",
                    text: "Use the junior team pages on Play-Cricket.",
                    links: getJuniorTeamButtons()
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = getJuniorTeamLabel(item);
                    return renderResultCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Latest result"),
                        link: item.match_url || item.url || getJuniorTeamUrl(item),
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent junior results found",
                    text: "Use the junior team pages on Play-Cricket.",
                    links: getJuniorTeamButtons()
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the latest Honley junior fixtures and results from Play-Cricket.";
            }
        }).catch(function (err) {
            console.warn("Juniors fixtures feed failed:", err);

            if (statusEl) {
                statusEl.textContent = "Unable to load junior fixtures and results right now.";
            }

            renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the junior team pages on Play-Cricket.",
                links: getJuniorTeamButtons()
            });

            renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the junior team pages on Play-Cricket.",
                links: getJuniorTeamButtons()
            });
        });
    }

    function initHomeTicker() {
        var track = byId("heroTickerTrack");
        if (!track) return;

        function getFallbackNews() {
            return [
                {icon: "bi-megaphone-fill", text: "Players always welcome at Honley Cricket Club"},
                {icon: "bi-people-fill", text: "Junior training starts Sunday at 10am"},
                {icon: "bi-person-hearts", text: "Honley Hawks are recruiting new players"}
            ];
        }

        Promise.all([
            loadJson("news.json").catch(function () {
                return getFallbackNews();
            }),
            loadClubData()
        ]).then(function (responses) {
            var manualNews = responses[0];
            var data = responses[1];
            var liveItems = [];

            var upcoming = getUpcoming(data.fixtures, 2, null, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getHonleyTeamPriority(a) - getHonleyTeamPriority(b);
            });

            var latest = getRecent(data.results, 1)[0];

            if (latest) {
                var latestLabel = getHonleyTeamLabel(latest);
                liveItems.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") +
                        "Latest result: " +
                        (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = getHonleyTeamLabel(fixture);
                liveItems.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date, {
                        day: "numeric",
                        month: "short"
                    }) + ": " + (label ? label + " – " : "") + getMatchTitle(fixture, "Upcoming fixture")
                });
            });

            renderTicker(track, manualNews.concat(liveItems).slice(0, 6));
        }).catch(function () {
            renderTicker(track, getFallbackNews());
        });
    }

    function initHawksTicker() {
        var track = byId("hawksTickerTrack");
        if (!track) return;

        function getFallbackItems() {
            return [
                {icon: "bi-person-hearts", text: "Women and U15 Girls fixtures on Play-Cricket"},
                {icon: "bi-calendar-event-fill", text: "See the latest Women fixtures and results"},
                {icon: "bi-calendar-event-fill", text: "See the latest U15 Girls fixtures and results"}
            ];
        }

        loadClubData().then(function (data) {
            var items = [];
            var upcoming = getUpcoming(data.fixtures, 3, isHawksMatch, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getHawksTeamPriority(a) - getHawksTeamPriority(b);
            });

            var latest = getRecent(data.results, 1, isHawksMatch)[0];

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
                items.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date, {
                        day: "numeric",
                        month: "short"
                    }) + ": " + (label ? label + " – " : "") + getMatchTitle(fixture, "Upcoming fixture")
                });
            });

            renderTicker(track, items.length ? items : getFallbackItems(), "No Women or U15 Girls updates available");
        }).catch(function () {
            renderTicker(track, getFallbackItems(), "No Women or U15 Girls updates available");
        });
    }

    function initMembershipPage() {
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
    }

    function initLivestreamEmbed() {
        var liveContainer = byId("live-container");
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
    }

    /* ==========================================
       Boot
    ========================================== */

    setLastModified();
    normaliseExternalLinks();
    initPlayCricketWidget();
    initHomepageMatchSummary();
    initResultsPageFeed();
    initHawksFixturesFeed();
    initJuniorsFixturesFeed();
    initHomeTicker();
    initHawksTicker();
    initMembershipPage();
    initLivestreamEmbed();
})();