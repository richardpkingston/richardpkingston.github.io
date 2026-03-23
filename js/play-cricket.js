(function (window) {
    "use strict";

    var HCC = window.HCC;
    var clubDataPromise = null;

    HCC.buildUrl = function buildUrl(endpoint) {
        return "https://www.play-cricket.com/api/v2/" + endpoint +
            "?site_id=" + HCC.SITE_ID +
            "&season=" + HCC.SEASON +
            "&api_token=" + HCC.API_TOKEN;
    };

    HCC.loadJson = function loadJson(url) {
        return fetch(url, {cache: "no-store"}).then(function (response) {
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
                return {matches: []};
            }),
            HCC.loadJson(HCC.buildUrl("result_summary.json")).catch(function () {
                return {result_summary: []};
            })
        ]).then(function (responses) {
            return {
                fixtures: HCC.asArray(responses[0], "matches"),
                results: HCC.asArray(responses[1], "result_summary")
            };
        });

        return clubDataPromise;
    };

    HCC.getUpcoming = function getUpcoming(items, limit, filterFn, comparator) {
        var today = HCC.getTodayStart();

        return (items || [])
            .filter(function (item) {
                var itemDate = HCC.getItemDate(item);
                if (!itemDate || itemDate < today) return false;
                return typeof filterFn === "function" ? filterFn(item) : true;
            })
            .sort(comparator || function (a, b) {
                return HCC.getItemDate(a) - HCC.getItemDate(b);
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
                return HCC.getItemDate(b) - HCC.getItemDate(a);
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

    HCC.getNextFixtureForTeamLabel = function getNextFixtureForTeamLabel(fixtures, label) {
        var future = HCC.getFutureFixtures(fixtures, function (item) {
            return HCC.getHonleyTeamLabel(item) === label;
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

    HCC.getFixtureDateTime = function getFixtureDateTime(item) {
        return HCC.getItemDateTime(item);
    };

    HCC.initHomepageMatchSummary = function initHomepageMatchSummary() {
        var nextMatchEl = HCC.byId("nextMatch");
        var latestMatchEl = HCC.byId("latestMatchResult");

        if (!nextMatchEl || !latestMatchEl) return;

        HCC.loadClubData().then(function (data) {
            var next = HCC.getUpcoming(data.fixtures, 1)[0];
            var latest = HCC.getRecent(data.results, 1)[0];

            nextMatchEl.innerHTML = HCC.renderSummaryBlock(next, {
                title: next ? HCC.getMatchTitle(next, "Upcoming fixture") : "",
                metaText: next ? HCC.formatDate(next.match_date || next.date) : "",
                link: next ? (next.match_url || "results.html") : "results.html",
                buttonLabel: "Match centre",
                emptyText: "No upcoming fixture found.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });

            latestMatchEl.innerHTML = HCC.renderSummaryBlock(latest, {
                title: latest ? HCC.getMatchTitle(latest, "Latest result") : "",
                metaText: latest ? (latest.result_description || "Latest completed match") : "",
                link: latest ? (latest.match_url || "results.html") : "results.html",
                buttonLabel: "Scorecard",
                emptyText: "No recent result found.",
                emptyLink: "results.html",
                emptyLabel: "Latest results"
            });
        }).catch(function () {
            nextMatchEl.innerHTML = HCC.renderSummaryBlock(null, {
                emptyText: "Fixture data is unavailable right now.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });

            latestMatchEl.innerHTML = HCC.renderSummaryBlock(null, {
                emptyText: "Result data is unavailable right now.",
                emptyLink: "results.html",
                emptyLabel: "Fixtures & results"
            });
        });
    };

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
                    icon: "bi-calendar-event-fill",
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
                    icon: "bi-trophy-fill",
                    title: "No recent results found",
                    text: "A full results list is on Play-Cricket.",
                    links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                    buttonLabel: "Open results"
                });
            }

            if (statusEl) {
                statusEl.textContent = "Showing the next 3 fixtures and latest 3 completed results for season " + HCC.SEASON + ".";
            }
        }).catch(function () {
            if (statusEl) {
                statusEl.textContent = "Unable to load live Play-Cricket data just now.";
            }

            HCC.renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the full fixtures list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Fixture",
                buttonLabel: "Open fixtures"
            });

            HCC.renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the full results list on Play-Cricket.",
                links: "https://honleycc.play-cricket.com/Matches?tab=Result",
                buttonLabel: "Open results"
            });
        });
    };

    HCC.initHawksFixturesFeed = function initHawksFixturesFeed() {
        var statusEl = HCC.byId("hawksResultsStatus");
        var upcomingEl = HCC.byId("hawksUpcomingFixtures");
        var resultsEl = HCC.byId("hawksLatestResults");

        if (!upcomingEl || !resultsEl) return;

        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 4, HCC.isHawksMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });

            var recent = HCC.getRecent(data.results, 4, HCC.isHawksMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(b) - HCC.getItemDate(a);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = HCC.getHawksTeamLabel(item);
                    return HCC.renderFixtureCard(item, {
                        title: (label ? label + " – " : "") + HCC.getMatchTitle(item, "Upcoming fixture"),
                        link: item.match_url || item.url || HCC.getHawksTeamUrl(item),
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming Women or U15 Girls fixtures found",
                    text: "Use the Play-Cricket team pages for the full fixture list.",
                    links: [
                        {href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"},
                        {href: HCC.TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                    ]
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = HCC.getHawksTeamLabel(item);
                    return HCC.renderResultCard(item, {
                        title: (label ? label + " – " : "") + HCC.getMatchTitle(item, "Latest result"),
                        link: item.match_url || item.url || HCC.getHawksTeamUrl(item),
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent Women or U15 Girls results found",
                    text: "Use the Play-Cricket team pages for the latest results.",
                    links: [
                        {href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"},
                        {href: HCC.TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
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

            HCC.renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"},
                    {href: HCC.TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                ]
            });

            HCC.renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the Play-Cricket team pages.",
                links: [
                    {href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"},
                    {href: HCC.TEAM_CONFIG.u15Girls.url, label: "Open U15 Girls team"}
                ]
            });
        });
    };

    HCC.initJuniorsFixturesFeed = function initJuniorsFixturesFeed() {
        var statusEl = HCC.byId("juniorsResultsStatus");
        var upcomingEl = HCC.byId("juniorsUpcomingFixtures");
        var resultsEl = HCC.byId("juniorsLatestResults");

        if (!upcomingEl || !resultsEl) return;

        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 8, HCC.isJuniorMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getJuniorTeamPriority(a) - HCC.getJuniorTeamPriority(b);
            });

            var recent = HCC.getRecent(data.results, 8, HCC.isJuniorMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(b) - HCC.getItemDate(a);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getJuniorTeamPriority(a) - HCC.getJuniorTeamPriority(b);
            });

            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = HCC.getJuniorTeamLabel(item);
                    return HCC.renderFixtureCard(item, {
                        title: (label ? label + " – " : "") + HCC.getMatchTitle(item, "Upcoming fixture"),
                        link: item.match_url || item.url || HCC.getJuniorTeamUrl(item),
                        buttonText: "Open fixture"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(upcomingEl, {
                    icon: "bi-calendar-event-fill",
                    title: "No upcoming junior fixtures found",
                    text: "Use the junior team pages on Play-Cricket.",
                    links: HCC.getJuniorTeamButtons()
                });
            }

            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = HCC.getJuniorTeamLabel(item);
                    return HCC.renderResultCard(item, {
                        title: (label ? label + " – " : "") + HCC.getMatchTitle(item, "Latest result"),
                        link: item.match_url || item.url || HCC.getJuniorTeamUrl(item),
                        buttonText: "Open result"
                    });
                }).join("");
            } else {
                HCC.renderEmptyState(resultsEl, {
                    icon: "bi-trophy-fill",
                    title: "No recent junior results found",
                    text: "Use the junior team pages on Play-Cricket.",
                    links: HCC.getJuniorTeamButtons()
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

            HCC.renderEmptyState(upcomingEl, {
                icon: "bi-calendar-event-fill",
                title: "Fixtures unavailable",
                text: "Open the junior team pages on Play-Cricket.",
                links: HCC.getJuniorTeamButtons()
            });

            HCC.renderEmptyState(resultsEl, {
                icon: "bi-trophy-fill",
                title: "Results unavailable",
                text: "Open the junior team pages on Play-Cricket.",
                links: HCC.getJuniorTeamButtons()
            });
        });
    };

    HCC.initHomeTicker = function initHomeTicker() {
        var track = HCC.byId("heroTickerTrack");
        if (!track) return;

        function getFallbackNews() {
            return [
                {icon: "bi-megaphone-fill", text: "Players always welcome at Honley Cricket Club"},
                {icon: "bi-people-fill", text: "Junior training starts Sunday at 10am"},
                {icon: "bi-person-hearts", text: "Honley Hawks are recruiting new players"}
            ];
        }

        Promise.all([
            HCC.loadJson("news.json").catch(function () {
                return getFallbackNews();
            }),
            HCC.loadClubData()
        ]).then(function (responses) {
            var manualNews = responses[0];
            var data = responses[1];
            var liveItems = [];

            var upcoming = HCC.getUpcoming(data.fixtures, 2, null, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getHonleyTeamPriority(a) - HCC.getHonleyTeamPriority(b);
            });

            var latest = HCC.getRecent(data.results, 1)[0];

            if (latest) {
                var latestLabel = HCC.getHonleyTeamLabel(latest);
                liveItems.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") +
                        "Latest result: " +
                        (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = HCC.getHonleyTeamLabel(fixture);
                liveItems.push({
                    icon: "bi-calendar-event-fill",
                    text: HCC.formatDate(fixture.match_date || fixture.date, {
                        day: "numeric",
                        month: "short"
                    }) + ": " + (label ? label + " – " : "") + HCC.getMatchTitle(fixture, "Upcoming fixture")
                });
            });

            HCC.renderTicker(track, manualNews.concat(liveItems).slice(0, 6));
        }).catch(function () {
            HCC.renderTicker(track, getFallbackNews());
        });
    };

    HCC.initHawksTicker = function initHawksTicker() {
        var track = HCC.byId("hawksTickerTrack");
        if (!track) return;

        function getFallbackItems() {
            return [
                {icon: "bi-person-hearts", text: "Women and U15 Girls fixtures on Play-Cricket"},
                {icon: "bi-calendar-event-fill", text: "See the latest Women fixtures and results"},
                {icon: "bi-calendar-event-fill", text: "See the latest U15 Girls fixtures and results"}
            ];
        }

        HCC.loadClubData().then(function (data) {
            var items = [];
            var upcoming = HCC.getUpcoming(data.fixtures, 3, HCC.isHawksMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b);
                if (dateDiff !== 0) return dateDiff;
                return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });

            var latest = HCC.getRecent(data.results, 1, HCC.isHawksMatch)[0];

            if (latest) {
                var latestLabel = HCC.getHawksTeamLabel(latest);
                items.push({
                    icon: "bi-trophy-fill",
                    text: (latestLabel ? latestLabel + " – " : "") +
                        "Latest result: " +
                        (latest.result_description || "Match completed")
                });
            }

            upcoming.forEach(function (fixture) {
                var label = HCC.getHawksTeamLabel(fixture);
                items.push({
                    icon: "bi-calendar-event-fill",
                    text: HCC.formatDate(fixture.match_date || fixture.date, {
                        day: "numeric",
                        month: "short"
                    }) + ": " + (label ? label + " – " : "") + HCC.getMatchTitle(fixture, "Upcoming fixture")
                });
            });

            HCC.renderTicker(track, items.length ? items : getFallbackItems(), "No Women or U15 Girls updates available");
        }).catch(function () {
            HCC.renderTicker(track, getFallbackItems(), "No Women or U15 Girls updates available");
        });
    };
})(window);
