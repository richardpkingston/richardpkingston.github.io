(function () {
    "use strict";

    var SITE_ID = 3463;
    var API_TOKEN = 'e3dc2fd497532bd833fd0a96b2697680';
    var SEASON = new Date().getFullYear();
    var clubDataPromise = null;

    var TEAM_CONFIG = {
        men: {
            firstXI: {id: '89963', label: '1st XI', url: 'https://honleycc.play-cricket.com/Teams/89963', priority: 1},
            secondXI: {id: '89964', label: '2nd XI', url: 'https://honleycc.play-cricket.com/Teams/89964', priority: 2},
            sundayXI: {id: '281615', label: 'Sunday 1st XI', url: 'https://honleycc.play-cricket.com/Teams/281615', priority: 3},
            thirdXI: {id: '260883', label: '3rd XI', url: 'https://honleycc.play-cricket.com/Teams/260883', priority: 4}
        },
        women: {id: '407977', label: 'Women', url: 'https://honleycc.play-cricket.com/Teams/407977'},
        u15Girls: {id: '407978', label: 'U15 Girls', url: 'https://honleycc.play-cricket.com/Teams/407978'},
        juniors: {
            u11: {id: '166913', label: 'U11', url: 'https://honleycc.play-cricket.com/Teams/166913', priority: 5},
            u13: {id: '209333', label: 'U13', url: 'https://honleycc.play-cricket.com/Teams/209333', priority: 4},
            u13b: {id: '209338', label: 'U13B', url: 'https://honleycc.play-cricket.com/Teams/209338', priority: 4},
            u15: {id: '176755', label: 'U15', url: 'https://honleycc.play-cricket.com/Teams/176755', priority: 2},
            u17: {id: '166874', label: 'U17', url: 'https://honleycc.play-cricket.com/Teams/166874', priority: 1},
            girlsU15: {id: '407978', label: 'Girls U15', url: 'https://honleycc.play-cricket.com/Teams/407978', priority: 3}
        }
    };

    var HAWKS_TEAM_IDS = [TEAM_CONFIG.women.id, TEAM_CONFIG.u15Girls.id];
    var JUNIOR_TEAM_MAP = Object.keys(TEAM_CONFIG.juniors).reduce(function (acc, key) {
        acc[TEAM_CONFIG.juniors[key].id] = TEAM_CONFIG.juniors[key];
        return acc;
    }, {});
    var JUNIOR_TEAM_IDS = Object.keys(JUNIOR_TEAM_MAP);

    function byId(id) { return document.getElementById(id); }
    function escapeHtml(value) { return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    function asArray(value, key) { if (!value) return []; if (Array.isArray(value)) return value; if (Array.isArray(value[key])) return value[key]; return []; }
    function parseDate(value) {
        if (!value) return null;
        var parts = String(value).split('/');
        if (parts.length === 3) {
            var fromParts = new Date(parts[2], parts[1] - 1, parts[0]);
            return isNaN(fromParts.getTime()) ? null : fromParts;
        }
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    function formatDate(value, options) {
        var parsed = parseDate(value);
        if (!parsed) return value || 'Date TBC';
        return parsed.toLocaleDateString('en-GB', options || {weekday: 'short', day: 'numeric', month: 'short'});
    }
    function getItemDate(item) { return parseDate(item && (item.match_date || item.date)); }
    function getTodayStart() { var today = new Date(); today.setHours(0,0,0,0); return today; }
    function getMatchTitle(item, fallback) {
        if (item && item.home_club_name && item.away_club_name) return item.home_club_name + ' v ' + item.away_club_name;
        return (item && item.match_name) || fallback || 'Match';
    }
    function buildUrl(endpoint) { return 'https://www.play-cricket.com/api/v2/' + endpoint + '?site_id=' + SITE_ID + '&season=' + SEASON + '&api_token=' + API_TOKEN; }
    function loadJson(url) { return fetch(url, {cache: 'no-store'}).then(function (response) { if (!response.ok) throw new Error('Request failed: ' + response.status); return response.json(); }); }

    function loadClubData() {
        if (clubDataPromise) return clubDataPromise;
        clubDataPromise = Promise.all([
            loadJson(buildUrl('matches.json')).catch(function () { return {matches: []}; }),
            loadJson(buildUrl('result_summary.json')).catch(function () { return {result_summary: []}; })
        ]).then(function (responses) {
            return {fixtures: asArray(responses[0], 'matches'), results: asArray(responses[1], 'result_summary')};
        });
        return clubDataPromise;
    }

    function getUpcoming(items, limit, filterFn, comparator) {
        var today = getTodayStart();
        return (items || []).filter(function (item) {
            var itemDate = getItemDate(item);
            if (!itemDate || itemDate < today) return false;
            return typeof filterFn === 'function' ? filterFn(item) : true;
        }).sort(comparator || function (a, b) { return getItemDate(a) - getItemDate(b); }).slice(0, limit || 3);
    }
    function getRecent(items, limit, filterFn, comparator) {
        return (items || []).filter(function (item) {
            return typeof filterFn === 'function' ? filterFn(item) : true;
        }).slice().sort(comparator || function (a, b) { return getItemDate(b) - getItemDate(a); }).slice(0, limit || 3);
    }
    function buildActionButtons(links, defaultLabel) {
        var buttonLinks = Array.isArray(links) ? links : [{href: links, label: defaultLabel || 'Open'}];
        return buttonLinks.map(function (link) { return '<a class="btn btn-outline btn-sm" href="' + escapeHtml(link.href) + '" rel="noopener" target="_blank">' + escapeHtml(link.label || defaultLabel || 'Open') + '</a>'; }).join(' ');
    }
    function renderEmptyState(target, config) {
        if (!target) return;
        target.innerHTML = '<article class="match-item"><div class="match-item-top"><span class="match-date"><i class="bi ' + escapeHtml(config.icon) + '" aria-hidden="true"></i></span></div><h4>' + escapeHtml(config.title) + '</h4><p class="match-meta">' + escapeHtml(config.text) + '</p><p class="match-actions">' + buildActionButtons(config.links, config.buttonLabel) + '</p></article>';
    }
    function renderFixtureCard(item, options) {
        var title = options && options.title ? options.title : getMatchTitle(item, 'Upcoming fixture');
        var dateText = formatDate(item.match_date || item.date);
        var comp = item.competition_name || item.competition || '';
        var ground = item.ground_name || item.ground || '';
        var link = (options && options.link) || item.match_url || item.url || 'results.html';
        var buttonText = (options && options.buttonText) || 'Open fixture';
        return '<article class="match-item"><div class="match-item-top"><span class="match-date">' + escapeHtml(dateText) + '</span></div><h4>' + escapeHtml(title) + '</h4>' + (comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '') + (ground ? '<p class="match-meta">Ground: ' + escapeHtml(ground) + '</p>' : '') + '<p class="match-actions"><a class="btn btn-outline btn-sm" href="' + escapeHtml(link) + '" rel="noopener" target="_blank">' + escapeHtml(buttonText) + '</a></p></article>';
    }
    function renderResultCard(item, options) {
        var title = options && options.title ? options.title : getMatchTitle(item, 'Latest result');
        var dateText = formatDate(item.match_date || item.date);
        var resultText = item.result_description || options.resultText || 'Completed match';
        var comp = item.competition_name || item.competition || '';
        var link = (options && options.link) || item.match_url || item.url || 'results.html';
        var buttonText = (options && options.buttonText) || 'View scorecard';
        return '<article class="match-item"><div class="match-item-top"><span class="match-date">' + escapeHtml(dateText) + '</span></div><h4>' + escapeHtml(title) + '</h4><p class="match-meta">' + escapeHtml(resultText) + '</p>' + (comp ? '<p class="match-meta">' + escapeHtml(comp) + '</p>' : '') + '<p class="match-actions"><a class="btn btn-outline btn-sm" href="' + escapeHtml(link) + '" rel="noopener" target="_blank">' + escapeHtml(buttonText) + '</a></p></article>';
    }
    function renderSummaryBlock(item, options) {
        if (!item) return '<p class="muted">' + escapeHtml(options.emptyText) + '</p><p class="match-actions"><a class="btn btn-outline btn-sm" rel="noopener" href="' + escapeHtml(options.emptyLink) + '">' + escapeHtml(options.emptyLabel) + '</a></p>';
        return '<h4>' + escapeHtml(options.title || getMatchTitle(item, 'Match')) + '</h4><p class="match-meta">' + escapeHtml(options.metaText) + '</p><a class="btn btn-outline btn-sm" rel="noopener" href="' + escapeHtml(options.link) + '">' + escapeHtml(options.buttonLabel) + '</a>';
    }
    function renderTicker(track, items, emptyText) {
        if (!track) return;
        if (!items || !items.length) {
            track.innerHTML = '<span class="ticker-item"><i class="bi bi-info-circle-fill" aria-hidden="true"></i><span class="ticker-text">' + escapeHtml(emptyText || 'No updates available') + '</span></span>';
            return;
        }
        track.innerHTML = items.map(function (item, index) {
            var separator = index < items.length - 1 ? '<span class="ticker-separator" aria-hidden="true">•</span>' : '';
            return '<span class="ticker-item"><i class="bi ' + escapeHtml(item.icon || 'bi-calendar-event-fill') + '" aria-hidden="true"></i><span class="ticker-text">' + escapeHtml(item.text) + '</span></span>' + separator;
        }).join('');
    }

    function getHonleyTeamLabel(item) {
        var homeClub = String(item.home_club_name || '').toLowerCase();
        var awayClub = String(item.away_club_name || '').toLowerCase();
        var homeTeam = String(item.home_team_name || '').toLowerCase();
        var awayTeam = String(item.away_team_name || '').toLowerCase();
        var honleyTeam = '';
        if (homeClub.indexOf('honley') !== -1) honleyTeam = homeTeam;
        else if (awayClub.indexOf('honley') !== -1) honleyTeam = awayTeam;
        if (honleyTeam.indexOf('sunday 1st xi') !== -1) return 'Sunday 1st XI';
        if (honleyTeam.indexOf('1st xi') !== -1) return '1st XI';
        if (honleyTeam.indexOf('2nd xi') !== -1) return '2nd XI';
        if (honleyTeam.indexOf('3rd xi') !== -1) return '3rd XI';
        return '';
    }
    function getHonleyTeamPriority(item) {
        var label = getHonleyTeamLabel(item);
        if (label === '1st XI') return 1;
        if (label === '2nd XI') return 2;
        if (label === 'Sunday 1st XI') return 3;
        if (label === '3rd XI') return 4;
        return 9;
    }
    function isHawksMatch(item) {
        var homeTeamId = String(item.home_team_id || '');
        var awayTeamId = String(item.away_team_id || '');
        return HAWKS_TEAM_IDS.indexOf(homeTeamId) !== -1 || HAWKS_TEAM_IDS.indexOf(awayTeamId) !== -1;
    }
    function getHawksTeamLabel(item) {
        var homeTeamId = String(item.home_team_id || '');
        var awayTeamId = String(item.away_team_id || '');
        if (homeTeamId === TEAM_CONFIG.women.id || awayTeamId === TEAM_CONFIG.women.id) return TEAM_CONFIG.women.label;
        if (homeTeamId === TEAM_CONFIG.u15Girls.id || awayTeamId === TEAM_CONFIG.u15Girls.id) return TEAM_CONFIG.u15Girls.label;
        return '';
    }
    function getHawksTeamPriority(item) {
        var label = getHawksTeamLabel(item);
        if (label === TEAM_CONFIG.women.label) return 1;
        if (label === TEAM_CONFIG.u15Girls.label) return 2;
        return 9;
    }
    function getHawksTeamUrl(item) {
        var homeTeamId = String(item.home_team_id || '');
        var awayTeamId = String(item.away_team_id || '');
        if (homeTeamId === TEAM_CONFIG.u15Girls.id || awayTeamId === TEAM_CONFIG.u15Girls.id) return TEAM_CONFIG.u15Girls.url;
        return TEAM_CONFIG.women.url;
    }
    function getHonleyJuniorTeamId(item) {
        var homeClub = String(item.home_club_name || '').toLowerCase();
        var awayClub = String(item.away_club_name || '').toLowerCase();
        var homeTeamId = String(item.home_team_id || '');
        var awayTeamId = String(item.away_team_id || '');
        if (homeClub.indexOf('honley') !== -1 && JUNIOR_TEAM_IDS.indexOf(homeTeamId) !== -1) return homeTeamId;
        if (awayClub.indexOf('honley') !== -1 && JUNIOR_TEAM_IDS.indexOf(awayTeamId) !== -1) return awayTeamId;
        return '';
    }
    function isJuniorMatch(item) { return !!getHonleyJuniorTeamId(item); }
    function getJuniorTeamConfig(item) { return JUNIOR_TEAM_MAP[getHonleyJuniorTeamId(item)] || null; }
    function getJuniorTeamLabel(item) { var team = getJuniorTeamConfig(item); return team ? team.label : ''; }
    function getJuniorTeamPriority(item) { var team = getJuniorTeamConfig(item); return team ? team.priority : 9; }
    function getJuniorTeamUrl(item) { var team = getJuniorTeamConfig(item); return team ? team.url : 'https://honleycc.play-cricket.com/Teams'; }
    function getJuniorTeamButtons() { return JUNIOR_TEAM_IDS.map(function (id) { return {href: JUNIOR_TEAM_MAP[id].url, label: 'Open ' + JUNIOR_TEAM_MAP[id].label}; }); }

    window.HCC = {
        SEASON: SEASON,
        TEAM_CONFIG: TEAM_CONFIG,
        byId: byId,
        loadJson: loadJson,
        loadClubData: loadClubData,
        getUpcoming: getUpcoming,
        getRecent: getRecent,
        getItemDate: getItemDate,
        formatDate: formatDate,
        getMatchTitle: getMatchTitle,
        renderEmptyState: renderEmptyState,
        renderFixtureCard: renderFixtureCard,
        renderResultCard: renderResultCard,
        renderSummaryBlock: renderSummaryBlock,
        renderTicker: renderTicker,
        getHonleyTeamLabel: getHonleyTeamLabel,
        getHonleyTeamPriority: getHonleyTeamPriority,
        isHawksMatch: isHawksMatch,
        getHawksTeamLabel: getHawksTeamLabel,
        getHawksTeamPriority: getHawksTeamPriority,
        getHawksTeamUrl: getHawksTeamUrl,
        isJuniorMatch: isJuniorMatch,
        getJuniorTeamLabel: getJuniorTeamLabel,
        getJuniorTeamPriority: getJuniorTeamPriority,
        getJuniorTeamUrl: getJuniorTeamUrl,
        getJuniorTeamButtons: getJuniorTeamButtons
    };
})();
