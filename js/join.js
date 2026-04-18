(function (window, document) {
    "use strict";

    var HCC = window.HCC;
    if (!HCC) return;

    HCC.initMembershipPage = function initMembershipPage() {
        var buttons = Array.prototype.slice.call(document.querySelectorAll(".membership-type-button"));
        var accordion = HCC.byId("accordion");
        var navbar = document.querySelector(".site-nav");

        if (!buttons.length || !accordion || !window.bootstrap) return;

        function getScrollOffset() {
            var navHeight = navbar ? navbar.offsetHeight : 0;
            return navHeight + 20;
        }

        function setActiveButton(targetId) {
            buttons.forEach(function (button) {
                var href = button.getAttribute("href") || "";
                button.classList.toggle("active", href === "#" + targetId);
            });
        }

        function clearActiveButtons() {
            buttons.forEach(function (button) {
                button.classList.remove("active");
            });
        }

        function scrollToGroup(targetId) {
            var target = HCC.byId(targetId);
            if (!target) return;

            var targetTop = target.getBoundingClientRect().top + window.pageYOffset;
            var offset = getScrollOffset();

            window.scrollTo({
                top: Math.max(targetTop - offset, 0),
                behavior: "smooth"
            });
        }

        buttons.forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();

                var targetId = ((button.getAttribute("href") || "").replace("#", "")).trim();
                if (!targetId) return;

                setActiveButton(targetId);
                scrollToGroup(targetId);
            });
        });

        accordion.addEventListener("show.bs.collapse", function (event) {
            var group = event.target.closest(".membership-group");
            if (group && group.id) {
                setActiveButton(group.id);
            }
        });

        accordion.addEventListener("hidden.bs.collapse", function () {
            var openItem = accordion.querySelector(".accordion-collapse.show");
            if (!openItem) {
                // Keep current active button if user navigated via sidebar.
                // Do nothing here unless you want all highlights removed when all panels are shut.
            }
        });

        if (window.location.hash) {
            var initialTargetId = window.location.hash.replace("#", "");
            var matchingButton = buttons.find(function (button) {
                return (button.getAttribute("href") || "") === "#" + initialTargetId;
            });

            if (matchingButton) {
                window.setTimeout(function () {
                    setActiveButton(initialTargetId);
                    scrollToGroup(initialTargetId);
                }, 150);
            }
        }
    };

    HCC.initMembershipClubPay = function initMembershipClubPay() {
        var accordionPanels = document.querySelectorAll(".membership-accordion .accordion-collapse");
        if (!accordionPanels.length) return;

        function loadClubPayScript() {
            var existing = document.querySelector('script[data-clubpay-loader="true"]');
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }

            var script = document.createElement("script");
            script.async = true;
            script.src = "https://www.clubpay.co.uk/forms/js/mf.js";
            script.setAttribute("data-clubpay-loader", "true");
            document.body.appendChild(script);
        }

        Array.prototype.forEach.call(accordionPanels, function (panel) {
            panel.addEventListener("shown.bs.collapse", function () {
                loadClubPayScript();
            });
        });

        loadClubPayScript();
    };

    function bootMembership() {
        HCC.initMembershipPage();
        HCC.initMembershipClubPay();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootMembership);
    } else {
        bootMembership();
    }

})(window, document);