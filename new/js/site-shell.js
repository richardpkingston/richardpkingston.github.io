(function () {
    "use strict";

    var PAGE_CONFIG = {
        home: {href: 'index.html', label: 'Home'},
        join: {href: 'join.html', label: 'Join'},
        results: {href: 'results.html', label: 'Fixtures & Results'},
        juniors: {href: 'juniors.html', label: 'Juniors'},
        hawks: {href: 'hawks.html', label: 'Hawks (Women & Girls)'},
        policy: {href: 'policy.html', label: 'Policies'},
        contact: {href: 'contact.html', label: 'Contact'}
    };

    function bodyHas(name) {
        return document.body && document.body.classList.contains(name);
    }

    function getCurrentPageKey() {
        if (bodyHas('membership-page')) return 'join';
        if (bodyHas('results-page')) return 'results';
        if (bodyHas('juniors-page')) return 'juniors';
        if (bodyHas('hawks-page')) return 'hawks';
        if (bodyHas('policy-page')) return 'policy';
        if (bodyHas('contact-page')) return 'contact';
        return 'home';
    }

    function buildHeader() {
        var current = getCurrentPageKey();
        var hawksTheme = current === 'hawks';
        var navClass = hawksTheme ? 'site-nav hawks-nav' : 'site-nav';

        return [
            '<nav aria-label="Main navigation" class="navbar navbar-default navbar-fixed-top ' + navClass + '" role="navigation">',
            '  <div class="container">',
            '    <div class="navbar-header">',
            '      <a aria-label="Honley Cricket Club home" class="navbar-brand brand-wrap" href="index.html">',
            '        <img alt="Honley Cricket Club logo" class="brand-logo" src="img/logo.jpg"/>',
            '        <span class="brand-text">Honley Cricket Club</span>',
            '      </a>',
            '   <button aria-controls="main-nav" aria-expanded="false" class="navbar-toggle" id="navToggle" type="button">',
            '        <span class="sr-only">Toggle navigation</span>',
            '        <span class="icon-bar"></span>',
            '        <span class="icon-bar"></span>',
            '        <span class="icon-bar"></span>',
            '      </button>',
            '    </div>',
            '    <div class="collapse navbar-collapse" id="main-nav">',
            '      <ul class="nav navbar-nav">',
            navItem('home', current),
            navItem('join', current),
            navItem('results', current),
            navItem('juniors', current),
            navItem('hawks', current),
            navItem('policy', current),
            '        <li><a href="index.html#watch-live">Watch Matches</a></li>',
            navItem('contact', current),
            '      </ul>',
            '      <ul class="nav navbar-nav navbar-right">',
            '        <li class="dropdown" id="followMenu">',
            '          <a aria-expanded="false" class="dropdown-toggle" href="#" id="followToggle">Follow us <span class="caret"></span></a>',
            '          <ul class="dropdown-menu dropdown-menu-right">',
            '            <li><a href="https://www.facebook.com/honleycc/" rel="noopener" target="_blank"><i class="bi bi-facebook"></i> Facebook</a></li>',
            '            <li><a href="https://www.instagram.com/honleycricketclub/" rel="noopener" target="_blank"><i class="bi bi-instagram"></i> Instagram</a></li>',
            '            <li><a href="https://www.youtube.com/@honleycc6945" rel="noopener" target="_blank"><i class="bi bi-youtube"></i> YouTube</a></li>',
            '          </ul>',
            '        </li>',
            '      </ul>',
            '    </div>',
            '  </div>',
            '</nav>'
        ].join('');
    }

    function navItem(key, current) {
        var page = PAGE_CONFIG[key];
        var active = key === current ? ' class="active"' : '';
        var aria = key === current ? ' aria-current="page"' : '';
        return '        <li' + active + '><a href="' + page.href + '"' + aria + '>' + page.label + '</a></li>';
    }

    function buildFooter() {
        var hawksTheme = getCurrentPageKey() === 'hawks';
        var footerClass = hawksTheme ? 'site-footer hawks-footer' : 'site-footer';
        return [
            '<footer class="' + footerClass + '">',
            '  <div class="container">',
            '    <div class="row">',
            '      <div class="col-sm-4">',
            '        <h2 class="footer-title">Honley Cricket Club</h2>',
            '        <p>Community cricket in Honley, with senior, junior, and women &amp; girls opportunities.</p>',
            '        <p class="small text-muted">',
            '          &copy; Honley Cricket Club <span id="currentYear"></span><br/>',
            '          Built by <a href="http://www.tellus-toolkit.com" rel="noopener" target="_blank">TellUs Toolkit Ltd</a><br/>',
            '          Last updated <span id="lastModified"></span>.',
            '        </p>',
            '      </div>',
            '      <div class="col-sm-4">',
            '        <h2 class="footer-title">Quick Links</h2>',
            '        <ul class="footer-links list-unstyled">',
            '          <li><a href="join.html">Membership</a></li>',
            '          <li><a href="results.html">Fixtures &amp; Results</a></li>',
            '          <li><a href="juniors.html">Juniors</a></li>',
            '          <li><a href="hawks.html">Women &amp; Girls</a></li>',
            '        </ul>',
            '      </div>',
            '      <div class="col-sm-4">',
            '        <h2 class="footer-title">Follow</h2>',
            '        <ul class="footer-links list-unstyled">',
            '          <li><a href="https://www.facebook.com/honleycc/" rel="noopener" target="_blank">Facebook</a></li>',
            '          <li><a href="https://www.instagram.com/honleycricketclub/" rel="noopener" target="_blank">Instagram</a></li>',
            '          <li><a href="https://www.youtube.com/@honleycc6945" rel="noopener" target="_blank">YouTube</a></li>',
            '          <li><a href="contact.html">Contact us</a></li>',
            '        </ul>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</footer>'
        ].join('');
    }

    function setCurrentYear() {
        var el = document.getElementById('currentYear');
        if (el) el.textContent = new Date().getFullYear();
    }

    function setLastModified() {
        var el = document.getElementById('lastModified');
        if (!el) return;
        var modifiedDate = new Date(document.lastModified);
        el.textContent = new Intl.DateTimeFormat('en-GB', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }).format(modifiedDate);
    }

    function normaliseExternalLinks() {
        Array.prototype.forEach.call(document.querySelectorAll('a[target="_blank"]'), function (link) {
            var relValues = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
            if (relValues.indexOf('noopener') === -1) relValues.push('noopener');
            link.setAttribute('rel', relValues.join(' '));
        });
    }

    function initNav() {
        var toggle = document.getElementById('navToggle');
        var nav = document.getElementById('main-nav');
        var followToggle = document.getElementById('followToggle');
        var followMenu = document.getElementById('followMenu');
        if (toggle && nav) {
            toggle.addEventListener('click', function () {
                var isOpen = nav.classList.contains('in');
                nav.classList.toggle('in');
                toggle.setAttribute('aria-expanded', String(!isOpen));
            });
        }
        if (followToggle && followMenu) {
            followToggle.addEventListener('click', function (event) {
                event.preventDefault();
                var open = followMenu.classList.contains('open');
                followMenu.classList.toggle('open');
                followToggle.setAttribute('aria-expanded', String(!open));
            });
            document.addEventListener('click', function (event) {
                if (!followMenu.contains(event.target)) {
                    followMenu.classList.remove('open');
                    followToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    function injectShell() {
        var header = document.getElementById('site-header');
        var footer = document.getElementById('site-footer');
        if (header) header.outerHTML = buildHeader();
        if (footer) footer.outerHTML = buildFooter();
    }

    window.HCCShell = {
        injectShell: injectShell,
        initNav: initNav,
        setCurrentYear: setCurrentYear,
        setLastModified: setLastModified,
        normaliseExternalLinks: normaliseExternalLinks
    };
})();
