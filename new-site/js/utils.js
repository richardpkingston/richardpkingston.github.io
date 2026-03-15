(function () {
    const el = document.getElementById("lastModified");
    if (el) {
        const modifiedDate = new Date(document.lastModified);
        el.textContent = new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(modifiedDate);
    }

    const container = document.getElementById("live-container");
    const API_KEY = "YOUR_API_KEY";
    const CHANNEL_ID = "UCEY81pC3tG4_0OaV-svjkwA";

    if (!container || !API_KEY || API_KEY === "YOUR_API_KEY") return;

    const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;

    fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error("YouTube API request failed");
            return res.json();
        })
        .then((data) => {
            if (!data.items || !data.items.length) return;

            const videoId = data.items[0].id.videoId;
            container.innerHTML = `
                <div class="live-embed">
                    <div class="embed-responsive embed-responsive-16by9">
                        <iframe
                            class="embed-responsive-item"
                            src="https://www.youtube.com/embed/${videoId}"
                            title="Honley CC livestream"
                            allowfullscreen
                            loading="lazy">
                        </iframe>
                    </div>
                </div>
            `;
        })
        .catch((err) => {
            console.warn("Livestream check failed:", err);
        });
})();