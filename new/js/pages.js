(function () {
    "use strict";

    function initPlayCricketWidget() {
        var widgetLink = document.querySelector('a.lsw');
        if (!widgetLink) return;
        var alreadyLoaded = Array.prototype.some.call(document.styleSheets, function (sheet) {
            return sheet.href && sheet.href.indexOf('lsw.css') !== -1;
        });
        if (!alreadyLoaded) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://www.play-cricket.com/widgets/lsw.css';
            document.head.appendChild(link);
        }
        if (!document.getElementById('lsw-wjs')) {
            var js = document.createElement('script');
            js.id = 'lsw-wjs';
            js.src = 'https://www.play-cricket.com/widgets/lsw.js';
            document.body.appendChild(js);
        }
    }

    function initHomepageMatchSummary() {
        var nextMatchEl = HCC.byId('nextMatch');
        var latestMatchEl = HCC.byId('latestMatchResult');
        if (!nextMatchEl || !latestMatchEl) return;
        HCC.loadClubData().then(function (data) {
            var next = HCC.getUpcoming(data.fixtures, 1)[0];
            var latest = HCC.getRecent(data.results, 1)[0];
            nextMatchEl.innerHTML = HCC.renderSummaryBlock(next, {
                title: next ? HCC.getMatchTitle(next, 'Upcoming fixture') : '',
                metaText: next ? HCC.formatDate(next.match_date || next.date) : '',
                link: next ? (next.match_url || 'results.html') : 'results.html',
                buttonLabel: 'Match centre', emptyText: 'No upcoming fixture found.', emptyLink: 'results.html', emptyLabel: 'Fixtures & results'
            });
            latestMatchEl.innerHTML = HCC.renderSummaryBlock(latest, {
                title: latest ? HCC.getMatchTitle(latest, 'Latest result') : '',
                metaText: latest ? (latest.result_description || 'Latest completed match') : '',
                link: latest ? (latest.match_url || 'results.html') : 'results.html',
                buttonLabel: 'Scorecard', emptyText: 'No recent result found.', emptyLink: 'results.html', emptyLabel: 'Latest results'
            });
        }).catch(function () {
            nextMatchEl.innerHTML = HCC.renderSummaryBlock(null, {emptyText: 'Fixture data is unavailable right now.', emptyLink: 'results.html', emptyLabel: 'Fixtures & results'});
            latestMatchEl.innerHTML = HCC.renderSummaryBlock(null, {emptyText: 'Result data is unavailable right now.', emptyLink: 'results.html', emptyLabel: 'Fixtures & results'});
        });
    }

    function initResultsPageFeed() {
        var statusEl = HCC.byId('resultsStatus');
        var upcomingEl = HCC.byId('upcomingFixtures');
        var resultsEl = HCC.byId('latestResults');
        if (!upcomingEl || !resultsEl) return;
        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 5, null, function (a, b) {
                var diff = HCC.getItemDate(a) - HCC.getItemDate(b);
                if (diff !== 0) return diff;
                return HCC.getHonleyTeamPriority(a) - HCC.getHonleyTeamPriority(b);
            });
            var recent = HCC.getRecent(data.results, 5, null, function (a, b) {
                var diff = HCC.getItemDate(b) - HCC.getItemDate(a);
                if (diff !== 0) return diff;
                return HCC.getHonleyTeamPriority(a) - HCC.getHonleyTeamPriority(b);
            });
            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = HCC.getHonleyTeamLabel(item);
                    return HCC.renderFixtureCard(item, {
                        title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Upcoming fixture'),
                        link: item.match_url || item.url || 'https://honleycc.play-cricket.com/Matches?tab=Fixture',
                        buttonText: 'Open fixture'
                    });
                }).join('');
            } else {
                HCC.renderEmptyState(upcomingEl, {icon: 'bi-calendar-event-fill', title: 'No upcoming fixtures found', text: 'Use the full fixtures list on Play-Cricket for the latest schedule.', links: 'https://honleycc.play-cricket.com/Matches?tab=Fixture', buttonLabel: 'Open fixtures'});
            }
            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = HCC.getHonleyTeamLabel(item);
                    return HCC.renderResultCard(item, {
                        title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Latest result'),
                        link: item.match_url || item.url || 'https://honleycc.play-cricket.com/Matches?tab=Result',
                        buttonText: 'Open result'
                    });
                }).join('');
            } else {
                HCC.renderEmptyState(resultsEl, {icon: 'bi-trophy-fill', title: 'No recent results found', text: 'A full results list is on Play-Cricket.', links: 'https://honleycc.play-cricket.com/Matches?tab=Result', buttonLabel: 'Open results'});
            }
            if (statusEl) statusEl.textContent = 'Showing the next 5 fixtures and latest 5 completed results for season ' + HCC.SEASON + ', including 1st XI, 2nd XI, Sunday 1st XI and 3rd XI.';
        }).catch(function () {
            if (statusEl) statusEl.textContent = 'Unable to load live Play-Cricket data just now.';
            HCC.renderEmptyState(upcomingEl, {icon: 'bi-calendar-event-fill', title: 'Fixtures unavailable', text: 'Open the full fixtures list on Play-Cricket.', links: 'https://honleycc.play-cricket.com/Matches?tab=Fixture', buttonLabel: 'Open fixtures'});
            HCC.renderEmptyState(resultsEl, {icon: 'bi-trophy-fill', title: 'Results unavailable', text: 'Open the full results list on Play-Cricket.', links: 'https://honleycc.play-cricket.com/Matches?tab=Result', buttonLabel: 'Open results'});
        });
    }

    function initHawksFixturesFeed() {
        var statusEl = HCC.byId('hawksResultsStatus');
        var upcomingEl = HCC.byId('hawksUpcomingFixtures');
        var resultsEl = HCC.byId('hawksLatestResults');
        if (!upcomingEl || !resultsEl) return;
        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 3, HCC.isHawksMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b); if (dateDiff !== 0) return dateDiff; return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });
            var recent = HCC.getRecent(data.results, 3, HCC.isHawksMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(b) - HCC.getItemDate(a); if (dateDiff !== 0) return dateDiff; return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });
            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = HCC.getHawksTeamLabel(item);
                    return HCC.renderFixtureCard(item, {title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Upcoming fixture'), link: item.match_url || item.url || HCC.getHawksTeamUrl(item), buttonText: 'Open fixture'});
                }).join('');
            } else {
                HCC.renderEmptyState(upcomingEl, {icon: 'bi-calendar-event-fill', title: 'No upcoming Women or U15 Girls fixtures found', text: 'Use the Play-Cricket team pages for the latest schedule.', links: [{href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"}, {href: HCC.TEAM_CONFIG.u15Girls.url, label: 'Open U15 Girls team'}]});
            }
            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = HCC.getHawksTeamLabel(item);
                    return HCC.renderResultCard(item, {title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Latest result'), link: item.match_url || item.url || HCC.getHawksTeamUrl(item), buttonText: 'Open result'});
                }).join('');
            } else {
                HCC.renderEmptyState(resultsEl, {icon: 'bi-trophy-fill', title: 'No recent Women or U15 Girls results found', text: 'Use the Play-Cricket team pages for the latest scorecards.', links: [{href: HCC.TEAM_CONFIG.women.url, label: "Open Women's team"}, {href: HCC.TEAM_CONFIG.u15Girls.url, label: 'Open U15 Girls team'}]});
            }
            if (statusEl) statusEl.textContent = 'Showing the latest Women and U15 Girls fixtures and results from Play-Cricket.';
        }).catch(function (err) {
            console.warn('Hawks fixtures feed failed:', err);
            if (statusEl) statusEl.textContent = 'Unable to load Women and U15 Girls fixtures and results right now.';
        });
    }

    function initJuniorsFixturesFeed() {
        var statusEl = HCC.byId('juniorsResultsStatus');
        var upcomingEl = HCC.byId('juniorsUpcomingFixtures');
        var resultsEl = HCC.byId('juniorsLatestResults');
        if (!upcomingEl || !resultsEl) return;
        HCC.loadClubData().then(function (data) {
            var upcoming = HCC.getUpcoming(data.fixtures, 6, HCC.isJuniorMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(a) - HCC.getItemDate(b); if (dateDiff !== 0) return dateDiff; return HCC.getJuniorTeamPriority(a) - HCC.getJuniorTeamPriority(b);
            });
            var recent = HCC.getRecent(data.results, 6, HCC.isJuniorMatch, function (a, b) {
                var dateDiff = HCC.getItemDate(b) - HCC.getItemDate(a); if (dateDiff !== 0) return dateDiff; return HCC.getJuniorTeamPriority(a) - HCC.getJuniorTeamPriority(b);
            });
            if (upcoming.length) {
                upcomingEl.innerHTML = upcoming.map(function (item) {
                    var label = HCC.getJuniorTeamLabel(item);
                    return HCC.renderFixtureCard(item, {title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Upcoming fixture'), link: item.match_url || item.url || HCC.getJuniorTeamUrl(item), buttonText: 'Open fixture'});
                }).join('');
            } else {
                HCC.renderEmptyState(upcomingEl, {icon: 'bi-calendar-event-fill', title: 'No upcoming junior fixtures found', text: 'Use the junior team pages on Play-Cricket.', links: HCC.getJuniorTeamButtons()});
            }
            if (recent.length) {
                resultsEl.innerHTML = recent.map(function (item) {
                    var label = HCC.getJuniorTeamLabel(item);
                    return HCC.renderResultCard(item, {title: (label ? label + ' – ' : '') + HCC.getMatchTitle(item, 'Latest result'), link: item.match_url || item.url || HCC.getJuniorTeamUrl(item), buttonText: 'Open result'});
                }).join('');
            } else {
                HCC.renderEmptyState(resultsEl, {icon: 'bi-trophy-fill', title: 'No recent junior results found', text: 'Use the junior team pages on Play-Cricket.', links: HCC.getJuniorTeamButtons()});
            }
            if (statusEl) statusEl.textContent = 'Showing the latest Honley junior fixtures and results from Play-Cricket.';
        }).catch(function (err) {
            console.warn('Juniors fixtures feed failed:', err);
            if (statusEl) statusEl.textContent = 'Unable to load junior fixtures and results right now.';
        });
    }

    function initHomeTicker() {
        var track = HCC.byId('heroTickerTrack');
        if (!track) return;
        function fallbackNews() { return [{icon: 'bi-megaphone-fill', text: 'Players always welcome at Honley Cricket Club'}, {icon: 'bi-people-fill', text: 'Junior training starts Sunday at 10am'}, {icon: 'bi-person-hearts', text: 'Honley Hawks are recruiting new players'}]; }
        Promise.all([HCC.loadJson('news.json').catch(function () { return fallbackNews(); }), HCC.loadClubData()]).then(function (responses) {
            var manualNews = responses[0];
            var data = responses[1];
            var liveItems = [];
            var upcoming = HCC.getUpcoming(data.fixtures, 3, null, function (a, b) {
                var diff = HCC.getItemDate(a) - HCC.getItemDate(b); if (diff !== 0) return diff; return HCC.getHonleyTeamPriority(a) - HCC.getHonleyTeamPriority(b);
            });
            var latest = HCC.getRecent(data.results, 1)[0];
            if (latest) {
                var latestLabel = HCC.getHonleyTeamLabel(latest);
                liveItems.push({icon: 'bi-trophy-fill', text: (latestLabel ? latestLabel + ' – ' : '') + 'Latest result: ' + (latest.result_description || 'Match completed')});
            }
            upcoming.forEach(function (fixture) {
                var label = HCC.getHonleyTeamLabel(fixture);
                liveItems.push({icon: 'bi-calendar-event-fill', text: HCC.formatDate(fixture.match_date || fixture.date, {day: 'numeric', month: 'short'}) + ': ' + (label ? label + ' – ' : '') + HCC.getMatchTitle(fixture, 'Upcoming fixture')});
            });
            HCC.renderTicker(track, manualNews.concat(liveItems).slice(0, 7));
        }).catch(function () { HCC.renderTicker(track, fallbackNews()); });
    }

    function initHawksTicker() {
        var track = HCC.byId('hawksTickerTrack');
        if (!track) return;
        function fallbackItems() { return [{icon: 'bi-person-hearts', text: 'Women and U15 Girls fixtures on Play-Cricket'}, {icon: 'bi-calendar-event-fill', text: 'See the latest Women fixtures and results'}, {icon: 'bi-calendar-event-fill', text: 'See the latest U15 Girls fixtures and results'}]; }
        HCC.loadClubData().then(function (data) {
            var items = [];
            var upcoming = HCC.getUpcoming(data.fixtures, 3, HCC.isHawksMatch, function (a, b) {
                var diff = HCC.getItemDate(a) - HCC.getItemDate(b); if (diff !== 0) return diff; return HCC.getHawksTeamPriority(a) - HCC.getHawksTeamPriority(b);
            });
            var latest = HCC.getRecent(data.results, 1, HCC.isHawksMatch)[0];
            if (latest) {
                var latestLabel = HCC.getHawksTeamLabel(latest);
                items.push({icon: 'bi-trophy-fill', text: (latestLabel ? latestLabel + ' – ' : '') + 'Latest result: ' + (latest.result_description || 'Match completed')});
            }
            upcoming.forEach(function (fixture) {
                var label = HCC.getHawksTeamLabel(fixture);
                items.push({icon: 'bi-calendar-event-fill', text: HCC.formatDate(fixture.match_date || fixture.date, {day: 'numeric', month: 'short'}) + ': ' + (label ? label + ' – ' : '') + HCC.getMatchTitle(fixture, 'Upcoming fixture')});
            });
            HCC.renderTicker(track, items.length ? items : fallbackItems(), 'No Women or U15 Girls updates available');
        }).catch(function () { HCC.renderTicker(track, fallbackItems(), 'No Women or U15 Girls updates available'); });
    }

    function initMembershipPage() {
        var buttons = document.querySelectorAll('.membership-type-button');
        var accordion = document.getElementById('accordion');
        if (!buttons.length || !accordion) return;
        function setActiveButton(targetId) {
            Array.prototype.forEach.call(buttons, function (button) {
                button.classList.toggle('active', button.getAttribute('href') === '#' + targetId);
            });
        }
        function openCollapse(id) {
            Array.prototype.forEach.call(accordion.querySelectorAll('.panel-collapse'), function (panel) {
                var open = panel.id === id;
                panel.classList.toggle('in', open);
                panel.setAttribute('aria-expanded', String(open));
                var trigger = accordion.querySelector('[href="#' + panel.id + '"]');
                if (trigger) trigger.classList.toggle('collapsed', !open);
            });
        }
        function scrollToTarget(targetId) {
            var target = document.getElementById(targetId);
            if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
        Array.prototype.forEach.call(buttons, function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                var targetId = (button.getAttribute('href') || '').replace('#', '');
                var collapseId = button.getAttribute('data-target-collapse');
                if (!targetId) return;
                setActiveButton(targetId);
                if (collapseId) openCollapse(collapseId);
                setTimeout(function () { scrollToTarget(targetId); }, 100);
            });
        });
        Array.prototype.forEach.call(accordion.querySelectorAll('[data-toggle="collapse"]'), function (trigger) {
            trigger.addEventListener('click', function (event) {
                event.preventDefault();
                var target = (trigger.getAttribute('href') || '').replace('#', '');
                if (!target) return;
                openCollapse(target);
                var group = trigger.closest('.membership-group');
                if (group && group.id) setActiveButton(group.id);
            });
        });
    }

    function initLivestreamEmbed() {
        var liveContainer = HCC.byId('live-container');
        var API_KEY = 'YOUR_API_KEY';
        var CHANNEL_ID = 'UCEY81pC3tG4_0OaV-svjkwA';
        if (!liveContainer || !API_KEY || API_KEY === 'YOUR_API_KEY') return;
        fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + CHANNEL_ID + '&eventType=live&type=video&key=' + API_KEY)
            .then(function (res) { if (!res.ok) throw new Error('YouTube API request failed'); return res.json(); })
            .then(function (data) {
                if (!data.items || !data.items.length) return;
                var videoId = data.items[0].id.videoId;
                liveContainer.innerHTML = '<div class="live-embed"><div class="embed-responsive embed-responsive-16by9"><iframe class="embed-responsive-item" src="https://www.youtube.com/embed/' + videoId + '" title="Honley CC livestream" allowfullscreen loading="lazy"></iframe></div></div>';
            })
            .catch(function (err) { console.warn('Livestream check failed:', err); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        HCCShell.injectShell();
        HCCShell.setCurrentYear();
        HCCShell.setLastModified();
        HCCShell.normaliseExternalLinks();
        HCCShell.initNav();
        initPlayCricketWidget();
        initHomepageMatchSummary();
        initResultsPageFeed();
        initHawksFixturesFeed();
        initJuniorsFixturesFeed();
        initHomeTicker();
        initHawksTicker();
        initMembershipPage();
        initLivestreamEmbed();
    });
})();
