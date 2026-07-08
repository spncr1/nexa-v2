document.addEventListener("DOMContentLoaded", () => {
    const tabs = Array.from(document.querySelectorAll(".category-tab"));
    const rows = Array.from(document.querySelectorAll("#applications-body tr"));
    const searchInput = document.querySelector("#application-search");
    const statusFilter = document.querySelector("#status-filter");
    const databaseSubtitle = document.querySelector("#database-subtitle");
    const databaseCount = document.querySelector("#database-count");
    const form = document.querySelector("#application-form");

    function copy(key, fallback = "") {
        return window.NexaCopy?.get?.(key, fallback) ?? fallback;
    }

    let activeCategory = "swe";

    const categoryNames = {
        swe: "SWE Internships",
        graduate: "Graduate Roles",
        "part-time": "Part-Time",
        hospitality: "Hospitality"
    };

    function updateRows() {
        const query = (searchInput?.value || "").trim().toLowerCase();
        const selectedStatus = statusFilter?.value || "all";
        let visibleCount = 0;

        rows.forEach((row) => {
            const categoryMatch = row.dataset.category === activeCategory;
            const statusMatch = selectedStatus === "all" || row.dataset.status === selectedStatus;
            const textMatch = !query || row.textContent.toLowerCase().includes(query);
            const shouldShow = categoryMatch && statusMatch && textMatch;

            row.hidden = !shouldShow;
            if (shouldShow) visibleCount += 1;
        });

        if (databaseSubtitle) {
            databaseSubtitle.textContent = categoryNames[activeCategory] || "Applications";
        }

        if (databaseCount) {
            databaseCount.textContent = `Showing ${visibleCount} visible application${visibleCount === 1 ? "" : "s"}`;
        }
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            activeCategory = tab.dataset.category || "swe";
            tabs.forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
            updateRows();
        });
    });

    searchInput?.addEventListener("input", updateRows);
    statusFilter?.addEventListener("change", updateRows);

    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (window.NexaFeedback) {
            window.NexaFeedback.toast(copy("jobs.toast.saved", "Application saved."), { tone: "positive" });
        } else if (window.showToast) {
            window.showToast(copy("jobs.toast.saved", "Application saved."), "positive");
        }
        form.reset();
    });

    updateRows();
});
