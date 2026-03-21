(function (window, document) {
    "use strict";

    var HCC = window.HCC || {};

    HCC.SITE_ID = 3463;
    HCC.API_TOKEN = "e3dc2fd497532bd833fd0a96b2697680";
    HCC.SEASON = new Date().getFullYear();

    HCC.TEAM_CONFIG = {
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

    HCC.HAWKS_TEAM_IDS = [HCC.TEAM_CONFIG.women.id, HCC.TEAM_CONFIG.u15Girls.id];
    HCC.JUNIOR_TEAM_MAP = Object.keys(HCC.TEAM_CONFIG.juniors).reduce(function (acc, key) {
        acc[HCC.TEAM_CONFIG.juniors[key].id] = HCC.TEAM_CONFIG.juniors[key];
        return acc;
    }, {});
    HCC.JUNIOR_TEAM_IDS = Object.keys(HCC.JUNIOR_TEAM_MAP);

    HCC.byId = function byId(id) {
        return document.getElementById(id);
    };

    HCC.escapeHtml = function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    HCC.asArray = function asArray(value, key) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (Array.isArray(value[key])) return value[key];
        return [];
    };

    HCC.parseDate = function parseDate(value) {
        if (!value) return null;

        var parts = String(value).split("/");
        if (parts.length === 3) {
            var fromParts = new Date(parts[2], parts[1] - 1, parts[0]);
            return isNaN(fromParts.getTime()) ? null : fromParts;
        }

        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    HCC.formatDate = function formatDate(value, options) {
        var parsed = HCC.parseDate(value);
        if (!parsed) return value || "Date TBC";

        return parsed.toLocaleDateString("en-GB", options || {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    };

    HCC.getItemDate = function getItemDate(item) {
        return HCC.parseDate(item && (item.match_date || item.date));
    };

    HCC.getTodayStart = function getTodayStart() {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    HCC.getMatchTitle = function getMatchTitle(item, fallback) {
        if (item && item.home_club_name && item.away_club_name) {
            return item.home_club_name + " v " + item.away_club_name;
        }
        return (item && item.match_name) || fallback || "Match";
    };

    HCC.normaliseExternalLinks = function normaliseExternalLinks() {
        Array.prototype.forEach.call(document.querySelectorAll('a[target="_blank"]'), function (link) {
            var relValues = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
            if (relValues.indexOf("noopener") === -1) {
                relValues.push("noopener");
            }
            link.setAttribute("rel", relValues.join(" "));
        });
    };

    HCC.setLastModified = function setLastModified() {
        var element = HCC.byId("lastModified");
        if (!element) return;

        var modifiedDate = new Date(document.lastModified);
        element.textContent = new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(modifiedDate);
    };

    HCC.setCurrentYears = function setCurrentYears() {
        Array.prototype.forEach.call(document.querySelectorAll(".current-year"), function (element) {
            element.textContent = new Date().getFullYear();
        });
    };

    HCC.buildActionButtons = function buildActionButtons(links, defaultLabel) {
        var buttonLinks = Array.isArray(links) ? links : [{href: links, label: defaultLabel || "Open"}];

        return buttonLinks.map(function (link) {
            return '<a class="btn btn-outline btn-sm" href="' +
                HCC.escapeHtml(link.href) +
                '" rel="noopener" target="_blank">' +
                HCC.escapeHtml(link.label || defaultLabel || "Open") +
                '</a>';
        }).join(" ");
    };

    HCC.renderEmptyState = function renderEmptyState(target, config) {
        if (!target) return;

        target.innerHTML = [
            '<article class="match-item">',
            '<div class="match-item-top"><span class="match-date"><i class="bi ', HCC.escapeHtml(config.icon), '" aria-hidden="true"></i></span></div>',
            '<h4>', HCC.escapeHtml(config.title), '</h4>',
            '<p class="match-meta">', HCC.escapeHtml(config.text), '</p>',
            '<p class="match-actions">', HCC.buildActionButtons(config.links, config.buttonLabel), '</p>',
            '</article>'
        ].join("");
    };

    HCC.renderFixtureCard = function renderFixtureCard(item, options) {
        var title = options && options.title ? options.title : HCC.getMatchTitle(item, "Upcoming fixture");
        var dateText = HCC.formatDate(item.match_date || item.date);
        var comp = item.competition_name || item.competition || "";
        var ground = item.ground_name || item.ground || "";
        var link = (options && options.link) || item.match_url || item.url || "results.html";
        var buttonText = (options && options.buttonText) || "Open fixture";

        return [
            '<article class="match-item">',
            '<div class="match-item-top"><span class="match-date">', HCC.escapeHtml(dateText), '</span></div>',
            '<h4>', HCC.escapeHtml(title), '</h4>',
            comp ? '<p class="match-meta">' + HCC.escapeHtml(comp) + '</p>' : '',
            ground ? '<p class="match-meta">Ground: ' + HCC.escapeHtml(ground) + '</p>' : '',
            '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', HCC.escapeHtml(link), '" rel="noopener" target="_blank">', HCC.escapeHtml(buttonText), '</a></p>',
            '</article>'
        ].join("");
    };

    HCC.renderResultCard = function renderResultCard(item, options) {
        var title = options && options.title ? options.title : HCC.getMatchTitle(item, "Latest result");
        var dateText = HCC.formatDate(item.match_date || item.date);
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
            '<div class="match-item-top"><span class="match-date">', HCC.escapeHtml(dateText), '</span></div>',
            '<h4>', HCC.escapeHtml(title), '</h4>',
            comp ? '<p class="match-meta">' + HCC.escapeHtml(comp) + '</p>' : '',
            resultText ? '<p class="match-result">' + HCC.escapeHtml(resultText) + '</p>' : '',
            scores ? '<p class="match-meta">' + HCC.escapeHtml(scores) + '</p>' : '',
            '<p class="match-actions"><a class="btn btn-outline btn-sm" href="', HCC.escapeHtml(link), '" rel="noopener" target="_blank">', HCC.escapeHtml(buttonText), '</a></p>',
            '</article>'
        ].join("");
    };

    HCC.renderSummaryBlock = function renderSummaryBlock(item, options) {
        if (!item) {
            return [
                '<p class="match-meta">', HCC.escapeHtml(options.emptyText), '</p>',
                '<a class="btn btn-outline btn-sm" rel="noopener" href="', HCC.escapeHtml(options.emptyLink), '">', HCC.escapeHtml(options.emptyLabel), '</a>'
            ].join("");
        }

        return [
            '<h4>' + HCC.escapeHtml(options.title || HCC.getMatchTitle(item, "Match")) + '</h4>',
            '<p class="match-meta">' + HCC.escapeHtml(options.metaText) + '</p>',
            '<a class="btn btn-outline btn-sm" rel="noopener" href="' + HCC.escapeHtml(options.link) + '">' + HCC.escapeHtml(options.buttonLabel) + '</a>'
        ].join("");
    };

    HCC.renderTicker = function renderTicker(track, items, emptyText) {
        if (!track) return;

        if (!items || !items.length) {
            track.innerHTML = '<span class="ticker-item"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><span class="ticker-text">' +
                HCC.escapeHtml(emptyText || "No updates available") +
                '</span></span>';
            return;
        }

        track.innerHTML = items.map(function (item, index) {
            var separator = index < items.length - 1
                ? '<span class="ticker-separator" aria-hidden="true">•</span>'
                : "";

            return '<span class="ticker-item">' +
                '<i class="bi ' + HCC.escapeHtml(item.icon || "bi-calendar-event-fill") + '" aria-hidden="true"></i>' +
                '<span class="ticker-text">' + HCC.escapeHtml(item.text) + '</span>' +
                '</span>' + separator;
        }).join("");
    };

    HCC.getHonleyTeamLabel = function getHonleyTeamLabel(item) {
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
    };

    HCC.getHonleyTeamPriority = function getHonleyTeamPriority(item) {
        var label = HCC.getHonleyTeamLabel(item);
        if (label === "1st XI") return 1;
        if (label === "2nd XI") return 2;
        if (label === "3rd XI") return 3;
        return 9;
    };

    HCC.isHawksMatch = function isHawksMatch(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        return HCC.HAWKS_TEAM_IDS.indexOf(homeTeamId) !== -1 ||
            HCC.HAWKS_TEAM_IDS.indexOf(awayTeamId) !== -1;
    };

    HCC.getHawksTeamLabel = function getHawksTeamLabel(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeTeamId === HCC.TEAM_CONFIG.women.id || awayTeamId === HCC.TEAM_CONFIG.women.id) {
            return HCC.TEAM_CONFIG.women.label;
        }

        if (homeTeamId === HCC.TEAM_CONFIG.u15Girls.id || awayTeamId === HCC.TEAM_CONFIG.u15Girls.id) {
            return HCC.TEAM_CONFIG.u15Girls.label;
        }

        return "";
    };

    HCC.getHawksTeamPriority = function getHawksTeamPriority(item) {
        var label = HCC.getHawksTeamLabel(item);
        if (label === HCC.TEAM_CONFIG.women.label) return 1;
        if (label === HCC.TEAM_CONFIG.u15Girls.label) return 2;
        return 9;
    };

    HCC.getHawksTeamUrl = function getHawksTeamUrl(item) {
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeTeamId === HCC.TEAM_CONFIG.u15Girls.id || awayTeamId === HCC.TEAM_CONFIG.u15Girls.id) {
            return HCC.TEAM_CONFIG.u15Girls.url;
        }
        return HCC.TEAM_CONFIG.women.url;
    };

    HCC.getHonleyJuniorTeamId = function getHonleyJuniorTeamId(item) {
        var homeClub = String(item.home_club_name || "").toLowerCase();
        var awayClub = String(item.away_club_name || "").toLowerCase();
        var homeTeamId = String(item.home_team_id || "");
        var awayTeamId = String(item.away_team_id || "");

        if (homeClub.indexOf("honley") !== -1 && HCC.JUNIOR_TEAM_IDS.indexOf(homeTeamId) !== -1) {
            return homeTeamId;
        }

        if (awayClub.indexOf("honley") !== -1 && HCC.JUNIOR_TEAM_IDS.indexOf(awayTeamId) !== -1) {
            return awayTeamId;
        }

        return "";
    };

    HCC.isJuniorMatch = function isJuniorMatch(item) {
        return !!HCC.getHonleyJuniorTeamId(item);
    };

    HCC.getJuniorTeamConfig = function getJuniorTeamConfig(item) {
        return HCC.JUNIOR_TEAM_MAP[HCC.getHonleyJuniorTeamId(item)] || null;
    };

    HCC.getJuniorTeamLabel = function getJuniorTeamLabel(item) {
        var team = HCC.getJuniorTeamConfig(item);
        return team ? team.label : "";
    };

    HCC.getJuniorTeamPriority = function getJuniorTeamPriority(item) {
        var team = HCC.getJuniorTeamConfig(item);
        return team ? team.priority : 9;
    };

    HCC.getJuniorTeamUrl = function getJuniorTeamUrl(item) {
        var team = HCC.getJuniorTeamConfig(item);
        return team ? team.url : "https://honleycc.play-cricket.com/Teams";
    };

    HCC.getJuniorTeamButtons = function getJuniorTeamButtons() {
        return HCC.JUNIOR_TEAM_IDS.map(function (id) {
            return {
                href: HCC.JUNIOR_TEAM_MAP[id].url,
                label: "Open " + HCC.JUNIOR_TEAM_MAP[id].label
            };
        });
    };

    HCC.initBackToTop = function () {
        var btn = document.getElementById("backToTop");
        if (!btn) return;

        window.addEventListener("scroll", function () {
            if (window.scrollY > 300) {
                btn.classList.add("is-visible");
            } else {
                btn.classList.remove("is-visible");
            }
        });

        btn.addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    };

    HCC.bootCore = function bootCore() {
        HCC.setLastModified();
        HCC.setCurrentYears();
        HCC.normaliseExternalLinks();
        HCC.initBackToTop();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", HCC.bootCore);
    } else {
        HCC.bootCore();
    }

    window.HCC = HCC;
})(window, document);
