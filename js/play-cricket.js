(function (window) {
    "use strict";

    var HCC = window.HCC = window.HCC || {};
    var clubDataPromise = null;
    var newsItemsPromise = null;
    var HONLEY_SITE_ID = "3463";

    /* ------------------------------------------------------------
       Core helpers
    ------------------------------------------------------------ */

    HCC.byId = HCC.byId || function byId(id) {
        return document.getElementById(id);
    };

    HCC.escapeHtml = HCC.escapeHtml || function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    HCC.asArray = function asArray(obj, key) {
        if (!obj) return [];
        if (Array.isArray(obj)) return obj;
        if (key && Array.isArray(obj[key])) return obj[key];
        return [];
    };

    HCC.getNow = function getNow() {
        return new Date();
    };

    HCC.getTodayStart = function getTodayStart() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    HCC.parseUkDate = function parseUkDate(dateStr) {
        if (!dateStr || typeof dateStr !== "string") return null;

        var parts = dateStr.split("/");
        if (parts.length === 3) {
            var day = parseInt(parts[0], 10);
            var month = parseInt(parts[1], 10) - 1;
            var year = parseInt(parts[2], 10);
            var dt = new Date(year, month, day);
            return isNaN(dt.getTime()) ? null : dt;
        }

        var nativeDate = new Date(dateStr);
        return isNaN(nativeDate.getTime()) ? null : nativeDate;
    };

    HCC.parseUkDateTime = function parseUkDateTime(dateStr, timeStr) {
        var date = HCC.parseUkDate(dateStr);
        if (!date) return null;

        var hours = 0;
        var minutes = 0;

        if (timeStr && typeof timeStr === "string") {
            var parts = timeStr.split(":");
            if (parts.length >= 2) {
                hours = parseInt(parts[0], 10) || 0;
                minutes = parseInt(parts[1], 10) || 0;
            }
        }

        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    HCC.getItemDate = function getItemDate(item) {
        if (!item) return null;
        return HCC.parseUkDate(item.match_date || item.date || item.fixture_date || "");
    };

    HCC.getItemDateTime = function getItemDateTime(item) {
        if (!item) return null;
        return HCC.parseUkDateTime(
            item.match_date || item.date || item.fixture_date || "",
            item.match_time || item.time || "00:00"
        );
    };

    HCC.getFixtureDateTime = function getFixtureDateTime(item) {
        return HCC.getItemDateTime(item);
    };

    HCC.formatDate = function formatDate(dateStr) {
        var dt = HCC.parseUkDate(dateStr);
        if (!dt) return "";
        return dt.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    };

    HCC.formatDateTime = function formatDateTime(dateStr, timeStr) {
        var dt = HCC.parseUkDateTime(dateStr, timeStr);
        if (!dt) return "";
        return dt.toLocaleString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    HCC.getMatchTitle = function getMatchTitle(item, fallback) {
        if (!item) return fallback || "";
        if (item.match_title) return item.match_title;
        if (item.title) return item.title;
        if (item.fixture_title) return item.fixture_title;

        var home = item.home_club_name || "";
        var away = item.away_club_name || "";
        if (home || away) {
            return (home + " v " + away).trim();
        }

        return fallback || "";
    };

    HCC.getResultText = function getResultText(item) {
        if (!item) return "";

        return item.result_description ||
            item.result_summary ||
            item.summary ||
            item.result ||
            item.result_text ||
            item.status_text ||
            item.match_result ||
            "";
    };

    /* ------------------------------------------------------------
       Shared data loaders
    ------------------------------------------------------------ */

    HCC.buildUrl = function buildUrl(endpoint) {
        return "https://www.play-cricket.com/api/v2/" + endpoint +
            "?site_id=" + encodeURIComponent(HCC.SITE_ID) +
            "&season=" + encodeURIComponent(HCC.SEASON) +
            "&api_token=" + encodeURIComponent(HCC.API_TOKEN);
    };

    HCC.loadJson = function loadJson(url) {
        return fetch(url, { cache: "no-store" }).then(function (response) {
            if (!response.ok) {
                throw new Error("Request failed: " + response.status);
            }
            return response.json();
        });
    };

    HCC.resetClubDataCache = function resetClubDataCache() {
        clubDataPromise = null;
    };

    HCC.loadClubData = function loadClubData(options) {
        var forceRefresh = options && options.forceRefresh;

        if (forceRefresh) {
            HCC.resetClubDataCache();
        }

        if (clubDataPromise) {
            return clubDataPromise;
        }

        clubDataPromise = Promise.all([
            HCC.loadJson(HCC.buildUrl("matches.json")).catch(function () {
                return { matches: [] };
            }),
            HCC.loadJson(HCC.buildUrl("result_summary.json")).catch(function () {
                return { result_summary: [] };
            })
        ]).then(function (responses) {
            return {
                fixtures: HCC.asArray(responses[0], "matches"),
                results: HCC.asArray(responses[1], "result_summary")
            };
        });

        return clubDataPromise;
    };

    HCC.resetNewsItemsCache = function resetNewsItemsCache() {
        newsItemsPromise = null;
    };

    HCC.loadNewsItems = function loadNewsItems(options) {
        var forceRefresh = options && options.forceRefresh;

        if (forceRefresh) {
            HCC.resetNewsItemsCache();
        }

        if (newsItemsPromise) {
            return newsItemsPromise;
        }

        newsItemsPromise = fetch("news.json", { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Failed to load news.json");
                }
                return response.json();
            })
            .then(function (items) {
                return Array.isArray(items) ? items : [];
            })
            .catch(function () {
                return [];
            });

        return newsItemsPromise;
    };

    /* ------------------------------------------------------------
       Team label helpers
    ------------------------------------------------------------ */

    HCC.getHonleyTeamLabel = function getHonleyTeamLabel(item) {
        if (!item) return "";

        var homeClubId = String(item.home_club_id || "");
        var awayClubId = String(item.away_club_id || "");
        var homeClubName = String(item.home_club_name || "").toLowerCase();
        var awayClubName = String(item.away_club_name || "").toLowerCase();

        if (homeClubId === HONLEY_SITE_ID || homeClubName === "honley cc") {
            return item.home_team_name || "";
        }

        if (awayClubId === HONLEY_SITE_ID || awayClubName === "honley cc") {
            return item.away_team_name || "";
        }

        return item.team_name || "";
    };

    HCC.normaliseTeamLabel = function normaliseTeamLabel(label) {
        return String(label || "")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };

    HCC.teamLabelMatches = function teamLabelMatches(label, labelOrLabels) {
        var labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];
        var normalisedLabel = HCC.normaliseTeamLabel(label);

        return labels.some(function (candidate) {
            return HCC.normaliseTeamLabel(candidate) === normalisedLabel;
        });
    };

    HCC.getHonleyTeamPriority = function getHonleyTeamPriority(item) {
        var label = (HCC.getHonleyTeamLabel(item) || "").toLowerCase();

        if (label.indexOf("1st xi") !== -1) return 1;
        if (label.indexOf("2nd xi") !== -1) return 2;
        if (label.indexOf("3rd xi") !== -1) return 3;
        if (label.indexOf("4th xi") !== -1) return 4;
        if (label.indexOf("sunday") !== -1) return 5;
        return 99;
    };

    /* ------------------------------------------------------------
       Shared collection helpers
    ------------------------------------------------------------ */

    HCC.getUpcoming = function getUpcoming(items, limit, filterFn, comparator) {
        var today = HCC.getTodayStart();

        return (items || [])
            .filter(function (item) {
                var itemDate = HCC.getItemDate(item);
                if (!itemDate || itemDate < today) return false;
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .slice()
            .sort(comparator || function (a, b) {
                return HCC.getItemDateTime(a) - HCC.getItemDateTime(b);
            })
            .slice(0, limit || 3);
    };

    HCC.getRecent = function getRecent(items, limit, filterFn, comparator) {
        return (items || [])
            .filter(function (item) {
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .slice()
            .sort(comparator || function (a, b) {
                return HCC.getItemDateTime(b) - HCC.getItemDateTime(a);
            })
            .slice(0, limit || 3);
    };

    HCC.getFutureFixtures = function getFutureFixtures(items, filterFn, comparator) {
        var now = HCC.getNow();

        return (items || [])
            .filter(function (item) {
                var itemDateTime = HCC.getItemDateTime(item);
                if (!itemDateTime || itemDateTime <= now) return false;
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .slice()
            .sort(comparator || function (a, b) {
                return HCC.getItemDateTime(a) - HCC.getItemDateTime(b);
            });
    };

    HCC.getNextFixtureForTeamLabel = function getNextFixtureForTeamLabel(fixtures, labelOrLabels) {
        var labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];

        var future = HCC.getFutureFixtures(fixtures, function (item) {
            var label = HCC.getHonleyTeamLabel(item);
            var competition = String(item.competition_name || "").toLowerCase();

            if (HCC.teamLabelMatches(label, labels)) return true;

            if (labels.indexOf("Sunday XI") !== -1) {
                return label === "Sunday Section" || competition.indexOf("sunday") !== -1;
            }

            return false;
        }, function (a, b) {
            var dateDiff = HCC.getItemDateTime(a) - HCC.getItemDateTime(b);
            if (dateDiff !== 0) return dateDiff;
            return HCC.getHonleyTeamPriority(a) - HCC.getHonleyTeamPriority(b);
        });

        return future.length ? future[0] : null;
    };

    HCC.getNextFirstXIFixture = function getNextFirstXIFixture(fixtures) {
        return HCC.getNextFixtureForTeamLabel(fixtures, HCC.COUNTDOWN_TEAM_LABEL || "1st XI");
    };

    HCC.getLatestResultForTeamLabel = function getLatestResultForTeamLabel(results, labelOrLabels) {
        var labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];

        var filtered = HCC.getRecent(results, 50, function (item) {
            var label = HCC.getHonleyTeamLabel(item);
            var competition = String(item.competition_name || "").toLowerCase();

            if (HCC.teamLabelMatches(label, labels)) return true;

            if (labels.indexOf("Sunday XI") !== -1) {
                return label === "Sunday Section" || competition.indexOf("sunday") !== -1;
            }

            return false;
        });

        return filtered.length ? filtered[0] : null;
    };

    /* ------------------------------------------------------------
       Shared render helpers
    ------------------------------------------------------------ */

    HCC.renderSummaryBlock = function renderSummaryBlock(item, options) {
        options = options || {};

        if (!item) {
            return '' +
                '<p class="muted">' + HCC.escapeHtml(options.emptyText || "Nothing available.") + '</p>' +
                (options.emptyLink
                    ? '<p class="match-card-actions"><a class="btn btn-primary" href="' +
                    HCC.escapeHtml(options.emptyLink) + '">' +
                    HCC.escapeHtml(options.emptyLabel || "Open") + '</a></p>'
                    : '');
        }

        return '' +
            '<h3 class="match-card-title">' + HCC.escapeHtml(options.title || HCC.getMatchTitle(item, "")) + '</h3>' +
            (options.metaText ? '<p class="match-card-meta">' + HCC.escapeHtml(options.metaText) + '</p>' : '') +
            '<p class="match-card-actions">' +
            '<a class="btn btn-primary" href="' + HCC.escapeHtml(options.link || "#") + '" target="_blank" rel="noopener">' +
            HCC.escapeHtml(options.buttonLabel || "Open") +
            '</a>' +
            '</p>';
    };

    HCC.renderFixtureCard = function renderFixtureCard(item, options) {
        options = options || {};

        return '' +
            '<article class="match-item">' +
            '<div class="match-item-top">' +
            '<span class="match-date">' + HCC.escapeHtml(HCC.formatDate(item.match_date || item.date)) + '</span>' +
            '</div>' +
            '<h4>' + HCC.escapeHtml(options.title || HCC.getMatchTitle(item, "Upcoming fixture")) + '</h4>' +
            '<p class="match-meta">' +
            HCC.escapeHtml(item.competition_name || item.league_name || item.competition_type || "") +
            '</p>' +
            '<p class="match-actions">' +
            '<a class="btn btn-primary" href="' + HCC.escapeHtml(options.link || "#") + '" target="_blank" rel="noopener">' +
            HCC.escapeHtml(options.buttonText || "Open fixture") +
            '</a>' +
            '</p>' +
            '</article>';
    };

    HCC.renderResultCard = function renderResultCard(item, options) {
        options = options || {};

        return '' +
            '<article class="match-item">' +
            '<div class="match-item-top">' +
            '<span class="match-date">' + HCC.escapeHtml(HCC.formatDate(item.match_date || item.date)) + '</span>' +
            '</div>' +
            '<h4>' + HCC.escapeHtml(options.title || HCC.getMatchTitle(item, "Latest result")) + '</h4>' +
            '<p class="match-result">' + HCC.escapeHtml(HCC.getResultText(item) || "Result available") + '</p>' +
            '<p class="match-actions">' +
            '<a class="btn btn-primary" href="' + HCC.escapeHtml(options.link || "#") + '" target="_blank" rel="noopener">' +
            HCC.escapeHtml(options.buttonText || "Open result") +
            '</a>' +
            '</p>' +
            '</article>';
    };

    HCC.renderEmptyState = function renderEmptyState(container, options) {
        if (!container) return;
        options = options || {};

        var linksHtml = "";
        if (Array.isArray(options.links)) {
            linksHtml = options.links.map(function (link) {
                return '<a class="btn btn-primary" href="' + HCC.escapeHtml(link.href) + '" target="_blank" rel="noopener">' +
                    HCC.escapeHtml(link.label) + '</a>';
            }).join(" ");
        } else if (options.links) {
            linksHtml = '<a class="btn btn-primary" href="' + HCC.escapeHtml(options.links) + '" target="_blank" rel="noopener">' +
                HCC.escapeHtml(options.buttonLabel || "Open") + '</a>';
        }

        container.innerHTML = '' +
            '<div class="empty-state">' +
            (options.title ? '<p class="match-card-title">' + HCC.escapeHtml(options.title) + '</p>' : '') +
            (options.text ? '<p class="muted">' + HCC.escapeHtml(options.text) + '</p>' : '') +
            (linksHtml ? '<p class="match-card-actions">' + linksHtml + '</p>' : '') +
            '</div>';
    };

    /* ------------------------------------------------------------
       Shared page feeds
    ------------------------------------------------------------ */

    HCC.initResultsPageFeed = function initResultsPageFeed() {
        var statusEl = HCC.byId("resultsStatus");
        var upcomingEl = HCC.byId("upcomingFixtures");
        var resultsEl = HCC.byId("latestResults");

        if (!upcomingEl || !resultsEl) return;

        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 3);
            var recent = HCC.getRecent(data.results, 3);

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    return HCC.renderFixtureCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(upcomingEl, {
                    title: "No upcoming fixtures found",
                    text: "Use the full fixtures list on Play-Cricket for the latest schedule.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                    buttonLabel: "Open fixtures"
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    return HCC.renderResultCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Result",
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(resultsEl, {
                    title: "No recent results found",
                    text: "A full results list is on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                    buttonLabel: "Open results"
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the next 3 fixtures and latest 3 completed results for season " + HCC.SEASON + ".";
            }
        }).catch(function (err) {
            console.warn("Results page feed failed:", err);

            if (statusEl) {
                statusEl.textContent = "Unable to load live Play-Cricket data just now.";
            }

            HCC.renderEmptyState(upcomingEl, {
                title: "Fixtures unavailable",
                text: "Open the full fixtures list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                buttonLabel: "Open fixtures"
            });

            HCC.renderEmptyState(resultsEl, {
                title: "Results unavailable",
                text: "Open the full results list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                buttonLabel: "Open results"
            });
        });
    };

    HCC.initHawksFixturesFeed = function initHawksFixturesFeed() {
        var statusEl = HCC.byId("hawksResultsStatus");
        var womenFixturesEl = HCC.byId("hawksWomenFixtures");
        var womenResultsEl = HCC.byId("hawksWomenResults");
        var girlsFixturesEl = HCC.byId("hawksGirlsFixtures");
        var girlsResultsEl = HCC.byId("hawksGirlsResults");

        if (!womenFixturesEl || !womenResultsEl || !girlsFixturesEl || !girlsResultsEl) {
            console.warn("Hawks containers not found");
            return;
        }

        function isWomenTeam(item) {
            var label = HCC.getHonleyTeamLabel(item);
            return HCC.teamLabelMatches(label, [
                "Womens 1st XI",
                "Women's 1st XI",
                "Womens XI",
                "Women",
                "Hawks",
                "Hawks Women"
            ]);
        }

        function isGirlsTeam(item) {
            var label = HCC.getHonleyTeamLabel(item);
            return HCC.teamLabelMatches(label, [
                "Girls Under 15",
                "Honley CC - Girls Under 15",
                "U15 Girls",
                "Girls U15",
                "U15 Girls XI",
                "Girls"
            ]);
        }

        HCC.loadClubData().then(function (data) {
            var womenUpcoming = HCC.getUpcoming(data.fixtures, 3, isWomenTeam);
            var womenRecent = HCC.getRecent(data.results, 3, isWomenTeam);
            var girlsUpcoming = HCC.getUpcoming(data.fixtures, 3, isGirlsTeam);
            var girlsRecent = HCC.getRecent(data.results, 3, isGirlsTeam);

            womenFixturesEl.innerHTML = womenUpcoming.length
                ? womenUpcoming.map(function (item) {
                    return HCC.renderFixtureCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Teams/407977",
                        buttonText: "Match centre"
                    });
                }).join("")
                : '<p class="muted">No upcoming women’s fixtures.</p>';

            womenResultsEl.innerHTML = womenRecent.length
                ? womenRecent.map(function (item) {
                    return HCC.renderResultCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Teams/407977",
                        buttonText: "Scorecard"
                    });
                }).join("")
                : '<p class="muted">No recent women’s results.</p>';

            girlsFixturesEl.innerHTML = girlsUpcoming.length
                ? girlsUpcoming.map(function (item) {
                    return HCC.renderFixtureCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Teams/407978",
                        buttonText: "Match centre"
                    });
                }).join("")
                : '<p class="muted">No upcoming girls’ fixtures.</p>';

            girlsResultsEl.innerHTML = girlsRecent.length
                ? girlsRecent.map(function (item) {
                    return HCC.renderResultCard(item, {
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Teams/407978",
                        buttonText: "Scorecard"
                    });
                }).join("")
                : '<p class="muted">No recent girls’ results.</p>';

            if (statusEl) {
                statusEl.textContent = "Showing latest Women and U15 Girls fixtures and results.";
            }
        }).catch(function (err) {
            console.warn("Hawks fixtures feed failed:", err);

            if (statusEl) {
                statusEl.textContent = "Unable to load Women and U15 Girls fixtures right now.";
            }

            womenFixturesEl.innerHTML = '<p class="muted">Women’s fixtures unavailable.</p>';
            womenResultsEl.innerHTML = '<p class="muted">Women’s results unavailable.</p>';
            girlsFixturesEl.innerHTML = '<p class="muted">Girls’ fixtures unavailable.</p>';
            girlsResultsEl.innerHTML = '<p class="muted">Girls’ results unavailable.</p>';
        });
    };

    HCC.initJuniorsFixturesFeed = function initJuniorsFixturesFeed() {
        var statusEl = HCC.byId("juniorsResultsStatus");
        var upcomingEl = HCC.byId("juniorsUpcomingFixtures");
        var resultsEl = HCC.byId("juniorsLatestResults");

        if (!upcomingEl || !resultsEl) {
            console.warn("Juniors containers not found");
            return;
        }

        // ✅ Robust: use team IDs instead of labels
        function isJuniorMatch(item) {
            var homeTeamId = String(item.home_team_id || "");
            var awayTeamId = String(item.away_team_id || "");

            return (
                HCC.JUNIOR_TEAM_IDS.includes(homeTeamId) ||
                HCC.JUNIOR_TEAM_IDS.includes(awayTeamId)
            );
        }

        HCC.loadClubData().then(function (data) {

            var upcoming = HCC.getUpcoming(data.fixtures, 6, isJuniorMatch);
            var recent = HCC.getRecent(data.results, 6, isJuniorMatch);

            // --- Fixtures ---
            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var teamLabel = HCC.getJuniorTeamLabelFromId(item);

                    return HCC.renderFixtureCard(item, {
                        title: teamLabel
                            ? teamLabel + ": " + HCC.getMatchTitle(item)
                            : HCC.getMatchTitle(item),
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                        buttonText: "Match centre"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(upcomingEl, {
                    title: "No upcoming junior fixtures",
                    text: "Check the full fixtures list on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                    buttonLabel: "Open fixtures"
                });
            }

            // --- Results ---
            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var teamLabel = HCC.getJuniorTeamLabelFromId(item);

                    return HCC.renderResultCard(item, {
                        title: teamLabel
                            ? teamLabel + ": " + HCC.getMatchTitle(item)
                            : HCC.getMatchTitle(item),
                        link: item.match_url || item.url || "https://honleycc.play-cricket.com/Matches?tab=Result",
                        buttonText: "Match centre"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(resultsEl, {
                    title: "No recent junior results",
                    text: "Check the full results list on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                    buttonLabel: "Open results"
                });
            }

            // --- Status ---
            if (statusEl) {
                statusEl.textContent = "Showing latest junior fixtures and results across Honley junior teams.";
            }

        }).catch(function (err) {
            console.warn("Juniors feed failed:", err);

            if (statusEl) {
                statusEl.textContent = "Unable to load junior fixtures and results.";
            }
        });
    };

    HCC.getJuniorTeamLabelFromId = function(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        var teamId = HCC.JUNIOR_TEAM_IDS.includes(homeTeamId)
            ? homeTeamId
            : awayTeamId;

        var team = HCC.JUNIOR_TEAM_MAP[teamId];
        if (!team) return "";

        // Convert labels nicely
        if (team.label === "U13") return "U13A";
        if (team.label === "U13B") return "U13B";

        return team.label;
    };
})(window);