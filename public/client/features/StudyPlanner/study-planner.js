document.addEventListener("DOMContentLoaded", () => {
    const queueList = document.getElementById("queue-list");
    const addSuggestedBtn = document.getElementById("queue-add-suggested");
    const addSessionBtn = document.getElementById("add-session-btn");
    const pauseBtn = document.getElementById("pause-session-btn");
    const stopBtn = document.getElementById("stop-session-btn");
    const currentSubject = document.getElementById("current-subject");
    const currentDetail = document.getElementById("current-detail");
    const currentType = document.getElementById("current-type");
    const sessionState = document.getElementById("session-state");
    const countdownTimer = document.getElementById("countdown-timer");

    let remainingSeconds = 87 * 60 + 52;
    let timerId = null;
    let isPaused = false;

    const typeLabels = {
        deep: "Deep Work",
        light: "Light Work",
        passive: "Passive Work"
    };

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    function renderTimer() {
        if (countdownTimer) {
            countdownTimer.textContent = formatTime(remainingSeconds);
        }
    }

    function setTimerRunning(nextState) {
        window.clearInterval(timerId);
        timerId = null;

        if (!nextState) return;

        timerId = window.setInterval(() => {
            remainingSeconds = Math.max(0, remainingSeconds - 1);
            renderTimer();

            if (remainingSeconds === 0) {
                setTimerRunning(false);
                if (sessionState) sessionState.textContent = "Complete";
            }
        }, 1000);
    }

    function setCurrentSession(source) {
        const title = source.dataset.sessionTitle || "Study Session";
        const detail = source.dataset.sessionDetail || "Focused block";
        const type = source.dataset.sessionType || "deep";
        const duration = Number(source.dataset.duration || 90);

        if (currentSubject) currentSubject.textContent = title;
        if (currentDetail) currentDetail.textContent = detail;
        if (currentType) {
            currentType.textContent = typeLabels[type] || typeLabels.deep;
            currentType.className = `session-tag tag-${type}`;
        }

        remainingSeconds = duration * 60;
        isPaused = false;
        if (pauseBtn) pauseBtn.textContent = "Pause";
        if (sessionState) sessionState.textContent = "In progress";
        renderTimer();
        setTimerRunning(true);
    }

    function createQueueItem(source, index) {
        const title = source.dataset.sessionTitle || "Study Session";
        const detail = source.dataset.sessionDetail || "Focused block";
        const type = source.dataset.sessionType || "deep";
        const duration = source.dataset.duration || "45";

        const item = document.createElement("li");
        item.className = "queue-item nx-card";
        item.dataset.sessionTitle = title;
        item.dataset.sessionDetail = detail;
        item.dataset.sessionType = type;
        item.dataset.duration = duration;

        item.innerHTML = `
            <span class="queue-index">${index}</span>
            <div class="queue-copy">
                <strong></strong>
                <span></span>
                <span class="session-tag tag-${type}">${typeLabels[type] || typeLabels.deep}</span>
            </div>
            <div class="queue-meta">
                <span>${duration} min</span>
                <span>Queued</span>
            </div>
            <button class="icon-action session-play" type="button" aria-label="Start session">
                <img class="app-icon" src="/client/shared/assets/Icons/next.svg" alt="" aria-hidden="true">
            </button>
        `;

        item.querySelector(".queue-copy strong").textContent = title;
        item.querySelector(".queue-copy > span").textContent = detail;
        item.querySelector(".session-play").setAttribute("aria-label", `Start ${title}`);

        return item;
    }

    function refreshQueueIndexes() {
        queueList?.querySelectorAll(".queue-item").forEach((item, index) => {
            const indexEl = item.querySelector(".queue-index");
            if (indexEl) indexEl.textContent = String(index + 1);
        });
    }

    queueList?.addEventListener("click", (event) => {
        const playBtn = event.target.closest(".session-play");
        if (!playBtn) return;
        const item = playBtn.closest(".queue-item");
        if (item) setCurrentSession(item);
    });

    document.querySelectorAll(".add-suggestion").forEach((button) => {
        button.addEventListener("click", () => {
            const suggestion = button.closest(".suggestion-card");
            if (!suggestion || !queueList) return;
            queueList.appendChild(createQueueItem(suggestion, queueList.children.length + 1));
            refreshQueueIndexes();
        });
    });

    addSuggestedBtn?.addEventListener("click", () => {
        const firstSuggestion = document.querySelector(".suggestion-card");
        if (!firstSuggestion || !queueList) return;
        queueList.appendChild(createQueueItem(firstSuggestion, queueList.children.length + 1));
        refreshQueueIndexes();
    });

    addSessionBtn?.addEventListener("click", () => {
        const customSession = {
            dataset: {
                sessionTitle: "Custom Study Block",
                sessionDetail: "Single task focus",
                sessionType: "deep",
                duration: "50"
            }
        };
        if (!queueList) return;
        queueList.appendChild(createQueueItem(customSession, queueList.children.length + 1));
        refreshQueueIndexes();
    });

    pauseBtn?.addEventListener("click", () => {
        isPaused = !isPaused;
        setTimerRunning(!isPaused);
        pauseBtn.textContent = isPaused ? "Resume" : "Pause";
        if (sessionState) sessionState.textContent = isPaused ? "Paused" : "In progress";
    });

    stopBtn?.addEventListener("click", () => {
        setTimerRunning(false);
        remainingSeconds = 0;
        renderTimer();
        if (sessionState) sessionState.textContent = "Stopped";
    });

    document.querySelectorAll(".study-tabs button").forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;

            document.querySelectorAll(".study-tabs button").forEach((item) => {
                item.classList.toggle("is-active", item === tab);
            });

            document.querySelectorAll(".history-panel").forEach((panel) => {
                panel.classList.toggle("is-active", panel.dataset.panel === target);
            });
        });
    });

    renderTimer();
});
