/**
 Honley Cricket Club directions and map.
 Updated for current site structure 15-March-2026.
 Create a Google map with driving directions from any location.
 Richard Kingston.
 TellUs Toolkit Ltd.
 */

(function () {
    "use strict";

    var CLUB_POSITION = { lat: 53.601164, lng: -1.789623 };

    var map = null;
    var directionsService = null;
    var directionsRenderer = null;
    var marker = null;

    function setDirectionsMessage(message, isError) {
        var panel = document.getElementById("directionsPanel");
        if (!panel) return;

        panel.innerHTML =
            '<div class="' + (isError ? 'directions-message directions-message-error' : 'directions-message') + '">' +
            message +
            '</div>';
    }

    function getSelectedTravelMode() {
        var checked = document.querySelector('input[name="travelMode"]:checked');
        return checked ? checked.value : "DRIVING";
    }

    function buildMap() {
        var mapEl = document.getElementById("map");
        var panelEl = document.getElementById("directionsPanel");

        if (!mapEl || !panelEl || !window.google || !google.maps) {
            return;
        }

        map = new google.maps.Map(mapEl, {
            center: CLUB_POSITION,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            panel: panelEl,
            draggable: true,
            suppressMarkers: false
        });

        marker = new google.maps.Marker({
            position: CLUB_POSITION,
            map: map,
            title: "Honley Cricket Club"
        });

        setDirectionsMessage("Directions will appear here.");
    }

    function calcRoute() {
        var startInput = document.getElementById("routeStart");
        var endInput = document.getElementById("routeEnd");

        if (!directionsService || !directionsRenderer) {
            setDirectionsMessage("The map is still loading. Please try again in a moment.", true);
            return false;
        }

        var start = startInput ? startInput.value.trim() : "";
        var end = endInput ? endInput.value.trim() : (CLUB_POSITION.lat + "," + CLUB_POSITION.lng);
        var travelMode = getSelectedTravelMode();

        if (!start) {
            setDirectionsMessage("Please enter a starting location.", true);
            if (startInput) startInput.focus();
            return false;
        }

        directionsService.route(
            {
                origin: start,
                destination: end,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
                travelMode: google.maps.TravelMode[travelMode]
            },
            function (response, status) {
                if (status === google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(response);
                    return;
                }

                var message = "Sorry, directions could not be calculated.";

                switch (status) {
                    case "ZERO_RESULTS":
                        message = "No route could be found between your starting point and Honley Cricket Club.";
                        break;
                    case "NOT_FOUND":
                        message = "Your starting location could not be recognised. Please try a fuller address or postcode.";
                        break;
                    case "REQUEST_DENIED":
                        message = "The directions request was denied. Please check the Google Maps API key and site restrictions.";
                        break;
                    case "OVER_QUERY_LIMIT":
                        message = "Too many map requests were made in a short time. Please wait a moment and try again.";
                        break;
                    case "INVALID_REQUEST":
                        message = "The directions request was invalid. Please check your starting location and try again.";
                        break;
                    case "UNKNOWN_ERROR":
                        message = "Google Maps returned a server error. Please try again.";
                        break;
                }

                setDirectionsMessage(message, true);
            }
        );

        return false;
    }

    function bindForm() {
        var form = document.getElementById("routeForm");
        if (!form) return;

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            calcRoute();
        });
    }

    window.initMap = function () {
        buildMap();
        bindForm();
    };

    window.calcRoute = calcRoute;
})();