(function (window, document) {
    "use strict";

    var HCC = window.HCC;

    HCC.initMembershipPage = function initMembershipPage() {
        var buttons = Array.prototype.slice.call(document.querySelectorAll(".membership-type-button"));
        var accordion = HCC.byId("accordion");

        if (!buttons.length || !accordion || !window.bootstrap) return;

        function setActiveButton(targetId) {
            buttons.forEach(function (button) {
                button.classList.toggle("active", button.getAttribute("href") === "#" + targetId);
            });
        }

        function scrollToGroup(targetId) {
            var target = HCC.byId(targetId);
            if (!target) return;
            window.scrollTo({
                top: target.getBoundingClientRect().top + window.pageYOffset - 110,
                behavior: "smooth"
            });
        }

        function hideOpenItems(exceptId) {
            accordion.querySelectorAll(".accordion-collapse.show").forEach(function (item) {
                if (item.id !== exceptId) {
                    window.bootstrap.Collapse.getOrCreateInstance(item).hide();
                }
            });
        }

        buttons.forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                var targetId = (button.getAttribute("href") || "").replace("#", "");
                var collapseId = button.getAttribute("data-target-collapse");
                if (!targetId) return;

                setActiveButton(targetId);
                hideOpenItems(collapseId);

                if (collapseId) {
                    var collapseEl = HCC.byId(collapseId);
                    if (collapseEl) {
                        window.bootstrap.Collapse.getOrCreateInstance(collapseEl).show();
                    }
                }

                window.setTimeout(function () {
                    scrollToGroup(targetId);
                }, 220);
            });
        });

        accordion.addEventListener("show.bs.collapse", function (event) {
            hideOpenItems(event.target.id);
            var group = event.target.closest(".membership-group");
            if (group && group.id) {
                setActiveButton(group.id);
            }
        });
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

        accordionPanels.forEach(function (panel) {
            panel.addEventListener("shown.bs.collapse", function () {
                loadClubPayScript();
            });
        });

        // Load once on page ready in case any form section is visible by default.
        loadClubPayScript();
    };

    function bootMembership() {
        if (!HCC) return;
        HCC.initMembershipPage();
        HCC.initMembershipClubPay();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootMembership);
    } else {
        bootMembership();
    }

})(window, document);
