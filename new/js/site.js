/* =========================================================
   Honley Cricket Club - Site JavaScript
   ---------------------------------------------------------
   Handles:
   1. Shared UI helpers and accessibility enhancements
   2. Play-Cricket data loading and rendering
   3. Homepage match summary and ticker
   4. Results page feed
   5. Hawks fixtures/results and Hawks ticker
   6. Membership page accordion shortcuts
   7. YouTube livestream embed
   ========================================================= */

(function () {
    "use strict";

    var SITE_ID = 3463;
    var API_TOKEN = "e3dc2fd497532bd833fd0a96b2697680";
    var season = new Date().getFullYear();

    var TEAM_IDS = {
        women: "407977",
        u15Girls: "407978"
    };

    var TEAM_URLS = {
        women: "https://honleycc.play-cricket.com/Teams/407977",
        u15Girls: "https://honleycc.play-cricket.com/Teams/407978"
    };

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

    function byId(id) {
        return document.getElementById(id);
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

    function normaliseExternalLinks() {
        Array.prototype.forEach.call(document.querySelectorAll('a[target="_blank"]'), function (link) {
            var rel = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
            if (rel.indexOf("noopener") === -1) rel.push("noopener");
            link.setAttribute("rel", rel.join(" "));
        });
    }

    function setActiveNav() {
        var currentPath = window.location.pathname.replace(/index\.html$/, "");
        var currentHref = currentPath.split("/").pop() || "";

        Array.prototype.forEach.call(document.querySelectorAll(".site-nav .nav.navbar-nav > li"), function (item) {
            item.classList.remove("active");
            var anchor = item.querySelector("a[href]");
            if (anchor) {
                anchor.removeAttribute("aria-current");
            }
        });

        Array.prototype.some.call(document.querySelectorAll(".site-nav .nav.navbar-nav > li > a[href]"), function (anchor) {
            var href = anchor.getAttribute("href");
            if (!href || href.indexOf("#") === 0) return false;

            var normalisedHref = href.replace(/\.\.\//g, "").replace(/index\.html$/, "");
            var hrefLeaf = normalisedHref.split("/").pop() || "";

            var isMatch = normalisedHref === currentHref || hrefLeaf === currentHref;

            if (currentPath.indexOf("/hawks/") !== -1 && /hawks\/?$/.test(href)) isMatch = true;
            if (currentPath.indexOf("/juniors/") !== -1 && /juniors\/?$/.test(href)) isMatch = true;
            if (currentHref === "" && (/index\.html$/.test(href) || href === "../index.html")) isMatch = true;

            if (isMatch) {
                anchor.parentElement.classList.add("active");
                anchor.setAttribute("aria-current", "page");
                return true;
            }
            return false;
        });
    }

    function initBackToTop() {
        if (document.querySelector(".back-to-top")) return;

        var button = document.createElement("button");
        button.type = "button";
        button.className = "back-to-top";
        button.setAttribute("aria-label", "Back to top");
        button.innerHTML = '<i class="bi bi-arrow-up" aria-hidden="true"></i>';

        button.addEventListener("click", function () {
            window.scrollTo({top: 0, behavior: "smooth"});
        });

        document.body.appendChild(button);

        function updateVisibility() {
            if (window.scrollY > 320) {
                button.classList.add("is-visible");
            } else {
                button.classList.remove("is-visible");
            }
        }

        updateVisibility();
        window.addEventListener("scroll", updateVisibility, {passive: true});
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
                fixtures: asArray(responses[0], "matches"),
                results: asArray(responses[1], "result_summary")
            };
        });
    }

    function getItemDate(item) {
        return parseDate(item && (item.match_date || item.date));
    }

    function getUpcoming(items, limit, filterFn, comparator) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);

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

    function getRecent(items, limit, filterFn) {
        return (items || [])
            .filter(function (item) {
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .slice()
            .sort(function (a, b) {
                return getItemDate(b) - getItemDate(a);
            })
            .slice(0, limit || 3);
    }

    function buildActionButtons(links, defaultLabel) {
        var items = Array.isArray(links) ? links : [{href: links, label: defaultLabel || "Open"}];

        return items.map(function (link) {
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

    function getMatchTitle(item, fallback) {
        if (item.home_club_name && item.away_club_name) {
            return item.home_club_name + " v " + item.away_club_name;
        }
        return item.match_name || fallback;
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
        var scores = item.home_result && item.away_result ? item.home_result + " / " + item.away_result : "";
        var link = (options && options.link) || item.match_url || item.url || "results.html";
        var buttonText = (options && options.buttonText) || "Open result";

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

    function isHawksOrGirlsMatch(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");
        return homeTeamId === TEAM_IDS.women || awayTeamId === TEAM_IDS.women ||
            homeTeamId === TEAM_IDS.u15Girls || awayTeamId === TEAM_IDS.u15Girls;
    }

    function getHawksTeamLabel(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeTeamId === TEAM_IDS.women || awayTeamId === TEAM_IDS.women) {
            return "Women";
        }

        if (homeTeamId === TEAM_IDS.u15Girls || awayTeamId === TEAM_IDS.u15Girls) {
            return "U15 Girls";
        }

        return "";
    }

    function getHawksTeamUrl(item) {
        return getHawksTeamLabel(item) === "U15 Girls" ? TEAM_URLS.u15Girls : TEAM_URLS.women;
    }

    function getHawksTeamPriority(item) {
        var label = getHawksTeamLabel(item);
        if (label === "Women") return 1;
        if (label === "U15 Girls") return 2;
        return 9;
    }

    function loadPlayCricketWidget() {
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

    function initHomepageMatchSummary() {
        var nextMatchEl = byId("nextMatch");
        var latestMatchEl = byId("latestMatchResult");
        if (!nextMatchEl || !latestMatchEl) return;

        loadClubData().then(function (data) {
            var next = getUpcoming(data.fixtures, 1)[0];
            var latest = getRecent(data.results, 1)[0];

            if (next) {
                nextMatchEl.innerHTML = renderFixtureCard(next, {
                    title: getMatchTitle(next, "Upcoming fixture"),
                    link: next.match_url || "results.html",
                    buttonText: "Match centre"
                }).replace('<article class="match-item">', "").replace('</article>', "");
            } else {
                nextMatchEl.innerHTML = '<p class="match-meta">No upcoming fixture found.</p><a class="btn btn-outline btn-sm" href="results.html">Fixtures &amp; results</a>';
            }

            if (latest) {
                latestMatchEl.innerHTML = renderResultCard(latest, {
                    title: getMatchTitle(latest, "Latest completed match"),
                    link: latest.match_url || "results.html",
                    buttonText: "Scorecard"
                }).replace('<article class="match-item">', "").replace('</article>', "");
            } else {
                latestMatchEl.innerHTML = '<p class="match-meta">No recent result found.</p><a class="btn btn-outline btn-sm" href="results.html">Latest results</a>';
            }
        }).catch(function () {
            nextMatchEl.innerHTML = '<p class="match-meta">Fixture data is unavailable right now.</p><a class="btn btn-outline btn-sm" href="results.html">Fixtures &amp; results</a>';
            latestMatchEl.innerHTML = '<p class="match-meta">Result data is unavailable right now.</p><a class="btn btn-outline btn-sm" href="results.html">Fixtures &amp; results</a>';
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
                    return renderFixtureCard(item, {link: item.match_url || "https://honleycc.play-cricket.com/Matches?tab=Fixture"});
                }).join("");
            } else {
                renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming fixtures found",
                    text: "Use the full fixtures list on Play-Cricket for the latest schedule.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                    buttonLabel: "View on Play-Cricket"
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    return renderResultCard(item, {link: item.match_url || "https://honleycc.play-cricket.com/Matches?tab=Result"});
                }).join("");
            } else {
                renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent results found",
                    text: "A full results list is available on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                    buttonLabel: "View on Play-Cricket"
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the next 3 fixtures and latest 3 completed results for season " + season + ".";
            }
        }).catch(function () {
            if (statusEl) {
                statusEl.textContent = "Unable to load live Play-Cricket data right now.";
            }

            renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the full fixtures list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                buttonLabel: "View on Play-Cricket"
            });

            renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the full results list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                buttonLabel: "View on Play-Cricket"
            });
        });
    }

    function initHawksFixturesFeed() {
        var statusEl = byId("hawksResultsStatus");
        var upcomingEl = byId("hawksUpcomingFixtures");
        var resultsEl = byId("hawksLatestResults");
        if (!upcomingEl || !resultsEl) return;

        loadClubData().then(function (data) {
            var fixtures = data.fixtures.filter(isHawksOrGirlsMatch);
            var results = data.results.filter(isHawksOrGirlsMatch);

            var upcoming = getUpcoming(fixtures, 4, null, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getHawksTeamPriority(a) - getHawksTeamPriority(b);
            });
            var recent = getRecent(results, 4);

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = getHawksTeamLabel(item);
                    return renderFixtureCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Upcoming fixture"),
                        link: item.match_url || getHawksTeamUrl(item)
                    });
                }).join("");
            } else {
                renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming Women or U15 Girls fixtures found",
                    text: "Use the Play-Cricket team pages for the full fixture list.",
                    links: [
                        {href: TEAM_URLS.women, label: "View Women on Play-Cricket"},
                        {href: TEAM_URLS.u15Girls, label: "View U15 Girls on Play-Cricket"}
                    ]
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = getHawksTeamLabel(item);
                    return renderResultCard(item, {
                        title: (label ? label + " – " : "") + getMatchTitle(item, "Latest result"),
                        link: item.match_url || getHawksTeamUrl(item)
                    });
                }).join("");
            } else {
                renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent Women or U15 Girls results found",
                    text: "Use the Play-Cricket team pages for the latest results.",
                    links: [
                        {href: TEAM_URLS.women, label: "View Women on Play-Cricket"},
                        {href: TEAM_URLS.u15Girls, label: "View U15 Girls on Play-Cricket"}
                    ]
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the latest Women and U15 Girls fixtures and results from Play-Cricket.";
            }
        }).catch(function (error) {
            console.warn("Hawks fixtures feed failed:", error);

            if (statusEl) {
                statusEl.textContent = "Unable to load Women and U15 Girls fixtures and results right now.";
            }

            renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: TEAM_URLS.women, label: "View Women on Play-Cricket"},
                    {href: TEAM_URLS.u15Girls, label: "View U15 Girls on Play-Cricket"}
                ]
            });

            renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: TEAM_URLS.women, label: "View Women on Play-Cricket"},
                    {href: TEAM_URLS.u15Girls, label: "View U15 Girls on Play-Cricket"}
                ]
            });
        });
    }

    /* ==========================================
   Juniors page: fixtures + results feed
   Team IDs from Honley Play-Cricket Teams page
   U11  = 166913
   U13  = 209333
   U13B = 209338
   U15  = 176755
   U17  = 166874
   Girls U15 = 407978
   ========================================== */
    (function initJuniorsFixturesFeed() {
        var statusEl = document.getElementById("juniorsResultsStatus");
        var upcomingEl = document.getElementById("juniorsUpcomingFixtures");
        var resultsEl = document.getElementById("juniorsLatestResults");

        if (!upcomingEl || !resultsEl) return;

        var JUNIOR_TEAM_IDS = ["166913", "209333", "209338", "176755", "166874", "407978"];
        var JUNIOR_TEAM_URLS = {
            "166913": "https://honleycc.play-cricket.com/Teams/166913",
            "209333": "https://honleycc.play-cricket.com/Teams/209333",
            "209338": "https://honleycc.play-cricket.com/Teams/209338",
            "176755": "https://honleycc.play-cricket.com/Teams/176755",
            "166874": "https://honleycc.play-cricket.com/Teams/166874",
            "407978": "https://honleycc.play-cricket.com/Teams/407978"
        };

        function asArray(obj, key) {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            if (Array.isArray(obj[key])) return obj[key];
            return [];
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

        function getJuniorTeamLabel(item) {
            var teamId = getHonleyJuniorTeamId(item);

            if (teamId === "166913") return "U11";
            if (teamId === "209333") return "U13";
            if (teamId === "209338") return "U13B";
            if (teamId === "407978") return "Girls U15";
            if (teamId === "176755") return "U15";
            if (teamId === "166874") return "U17";

            return "";
        }

        function getJuniorTeamPriority(item) {
            var teamId = getHonleyJuniorTeamId(item);

            if (teamId === "166874") return 1; // U17
            if (teamId === "176755") return 2; // U15
            if (teamId === "407978") return 3; // Girls U15
            if (teamId === "209338") return 4; // U13B
            if (teamId === "209333") return 5; // U13
            if (teamId === "166913") return 6; // U11
            return 9;
        }

        function getJuniorTeamUrl(item) {
            var teamId = getHonleyJuniorTeamId(item);
            return JUNIOR_TEAM_URLS[teamId] || "https://honleycc.play-cricket.com/Teams";
        }

        function renderButtons(links) {
            return (links || []).map(function (link) {
                return '<a class="btn btn-outline btn-sm" href="' +
                    escapeHtml(link.href) +
                    '" rel="noopener" target="_blank">' +
                    escapeHtml(link.label) +
                    '</a>';
            }).join(" ");
        }

        function fixtureItem(item) {
            var teamLabel = getJuniorTeamLabel(item);
            var title = item.home_club_name && item.away_club_name
                ? item.home_club_name + " v " + item.away_club_name
                : (item.match_name || "Upcoming fixture");

            if (teamLabel) {
                title = teamLabel + " – " + title;
            }

            var dateText = formatDate(item.match_date || item.date);
            var comp = item.competition_name || item.competition || "";
            var ground = item.ground_name || item.ground || "";
            var link = item.match_url || item.url || getJuniorTeamUrl(item);

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
            var teamLabel = getJuniorTeamLabel(item);
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
            var link = item.match_url || item.url || getJuniorTeamUrl(item);

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

        function renderEmpty(target, icon, title, text, links) {
            target.innerHTML = [
                '<article class="match-item">',
                '<div class="match-item-top"><span class="match-date"><i class="bi ', icon, '"></i></span></div>',
                '<h4>', title, '</h4>',
                '<p class="match-meta">', text, '</p>',
                '<p class="match-actions">', renderButtons(links), '</p>',
                '</article>'
            ].join("");
        }

        function getJuniorTeamButtons() {
            return [
                { href: JUNIOR_TEAM_URLS["166913"], label: "Open U11" },
                { href: JUNIOR_TEAM_URLS["209333"], label: "Open U13" },
                { href: JUNIOR_TEAM_URLS["209338"], label: "Open U13B" },
                { href: JUNIOR_TEAM_URLS["407978"], label: "Open Girls U15" },
                { href: JUNIOR_TEAM_URLS["176755"], label: "Open U15" },
                { href: JUNIOR_TEAM_URLS["166874"], label: "Open U17" }
            ];
        }

        Promise.all([
            loadJson(buildUrl("matches.json")),
            loadJson(buildUrl("result_summary.json"))
        ])
            .then(function (responses) {
                var fixtures = asArray(responses[0], "matches").filter(isJuniorMatch);
                var results = asArray(responses[1], "result_summary").filter(isJuniorMatch);

                var today = new Date();
                today.setHours(0, 0, 0, 0);

                var upcoming = fixtures
                    .filter(function (item) {
                        var d = parseDate(item.match_date || item.date);
                        return d && d >= today;
                    })
                    .sort(function (a, b) {
                        var dateDiff = parseDate(a.match_date || a.date) - parseDate(b.match_date || b.date);
                        if (dateDiff !== 0) return dateDiff;
                        return getJuniorTeamPriority(a) - getJuniorTeamPriority(b);
                    })
                    .slice(0, 8);

                var recent = results
                    .slice()
                    .sort(function (a, b) {
                        var dateDiff = parseDate(b.match_date || b.date) - parseDate(a.match_date || a.date);
                        if (dateDiff !== 0) return dateDiff;
                        return getJuniorTeamPriority(a) - getJuniorTeamPriority(b);
                    })
                    .slice(0, 8);

                if (upcoming.length) {
                    upcomingEl.innerHTML = upcoming.map(fixtureItem).join("");
                } else {
                    renderEmpty(
                        upcomingEl,
                        "bi-calendar-event-fill",
                        "No upcoming junior fixtures found",
                        "Use the junior team pages on Play-Cricket.",
                        getJuniorTeamButtons()
                    );
                }

                if (recent.length) {
                    resultsEl.innerHTML = recent.map(resultItem).join("");
                } else {
                    renderEmpty(
                        resultsEl,
                        "bi-trophy-fill",
                        "No recent junior results found",
                        "Use the junior team pages on Play-Cricket.",
                        getJuniorTeamButtons()
                    );
                }

                if (statusEl) {
                    statusEl.textContent = "Showing the latest Honley junior fixtures and results from Play-Cricket.";
                }
            })
            .catch(function (err) {
                console.warn("Juniors fixtures feed failed:", err);

                if (statusEl) {
                    statusEl.textContent = "Unable to load junior fixtures and results right now.";
                }

                renderEmpty(
                    upcomingEl,
                    "bi-calendar-event-fill",
                    "Fixtures unavailable",
                    "Open the junior team pages on Play-Cricket.",
                    getJuniorTeamButtons()
                );

                renderEmpty(
                    resultsEl,
                    "bi-trophy-fill",
                    "Results unavailable",
                    "Open the junior team pages on Play-Cricket.",
                    getJuniorTeamButtons()
                );
            });
    })();

    function renderTicker(track, items) {
        if (!track) return;

        if (!items || !items.length) {
            track.innerHTML = '<span class="ticker-item"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><span class="ticker-text">No updates available</span></span>';
            return;
        }

        track.innerHTML = items.map(function (item, index) {
            var separator = index < items.length - 1
                ? '<span class="ticker-separator" aria-hidden="true">•</span>'
                : '';

            return '<span class="ticker-item">' +
                '<i class="bi ' + escapeHtml(item.icon || "bi-calendar-event-fill") + '" aria-hidden="true"></i>' +
                '<span class="ticker-text">' + escapeHtml(item.text) + '</span>' +
                '</span>' + separator;
        }).join("");
    }

    function initHomeTicker() {
        var track = byId("heroTickerTrack");
        if (!track) return;

        function getHomeTeamLabel(item) {
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

        function getPriority(item) {
            var label = getHomeTeamLabel(item);
            if (label === "1st XI") return 1;
            if (label === "2nd XI") return 2;
            if (label === "3rd XI") return 3;
            return 9;
        }

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
                return getPriority(a) - getPriority(b);
            });
            var latest = getRecent(data.results, 1)[0];

            if (latest) {
                var latestLabel = getHomeTeamLabel(latest);
                liveItems.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") + "Latest result: " + (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = getHomeTeamLabel(fixture);
                liveItems.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date, {day: "numeric", month: "short"}) + ": " + (label ? label + " – " : "") + getMatchTitle(fixture, "Upcoming fixture")
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
                {icon: "bi-person-hearts", text: "Women and U15 Girls fixtures are available on Play-Cricket"},
                {icon: "bi-calendar-event-fill", text: "View Women fixtures and results on Play-Cricket"},
                {icon: "bi-calendar-event-fill", text: "View U15 Girls fixtures and results on Play-Cricket"}
            ];
        }

        loadClubData().then(function (data) {
            var fixtures = data.fixtures.filter(isHawksOrGirlsMatch);
            var results = data.results.filter(isHawksOrGirlsMatch);
            var items = [];

            var upcoming = getUpcoming(fixtures, 3, null, function (a, b) {
                var dateDiff = getItemDate(a) - getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return getHawksTeamPriority(a) - getHawksTeamPriority(b);
            });
            var latest = getRecent(results, 1)[0];

            if (latest) {
                var latestLabel = getHawksTeamLabel(latest);
                items.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") + "Latest result: " + (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = getHawksTeamLabel(fixture);
                items.push({
                    icon: "bi-calendar-event-fill",
                    text: formatDate(fixture.match_date || fixture.date, {day: "numeric", month: "short"}) + ": " + (label ? label + " – " : "") + getMatchTitle(fixture, "Upcoming fixture")
                });
            });

            renderTicker(track, items.length ? items : getFallbackItems());
        }).catch(function () {
            renderTicker(track, getFallbackItems());
        });
    }

    function initMembershipPage() {
        if (!window.jQuery) return;

        var $ = window.jQuery;
        var buttons = $(".membership-type-button");
        var accordion = $("#accordion");

        if (!buttons.length || !accordion.length) return;

        function setActiveButton(targetId) {
            buttons.removeClass("active");
            buttons.each(function () {
                var button = $(this);
                if (button.attr("href") === "#" + targetId) {
                    button.addClass("active");
                }
            });
        }

        function scrollToGroup(targetId) {
            var target = $("#" + targetId);
            if (!target.length) return;

            $("html, body").stop().animate({
                scrollTop: target.offset().top - 110
            }, 260);
        }

        buttons.on("click", function (event) {
            event.preventDefault();

            var button = $(this);
            var targetId = (button.attr("href") || "").replace("#", "");
            var collapseId = button.data("target-collapse");

            if (!targetId) return;

            setActiveButton(targetId);
            accordion.find(".panel-collapse.in").collapse("hide");

            if (collapseId) {
                setTimeout(function () {
                    $("#" + collapseId).collapse("show");
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
            var groupId = $(event.target).closest(".membership-group").attr("id");
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

        fetch(url).then(function (response) {
            if (!response.ok) throw new Error("YouTube API request failed");
            return response.json();
        }).then(function (data) {
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
        }).catch(function (error) {
            console.warn("Livestream check failed:", error);
        });
    }

    setLastModified();
    normaliseExternalLinks();
    setActiveNav();
    initBackToTop();
    loadPlayCricketWidget();
    initHomepageMatchSummary();
    initResultsPageFeed();
    initHawksFixturesFeed();
    initHomeTicker();
    initHawksTicker();
    initMembershipPage();
    initLivestreamEmbed();
})();
