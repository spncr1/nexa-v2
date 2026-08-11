const resetWelcomeScroll = () => {
    if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
};

resetWelcomeScroll();
window.addEventListener("pageshow", resetWelcomeScroll);
window.addEventListener("pagehide", () => {
    if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector(".welcome-page");
    const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (!page || !revealTargets.length || reduceMotion || !("IntersectionObserver" in window)) {
        return;
    }

    revealTargets.forEach((target) => {
        const requestedDelay = Number.parseInt(target.dataset.revealDelay || "0", 10);
        const delay = Number.isFinite(requestedDelay) ? Math.min(Math.max(requestedDelay, 0), 400) : 0;
        target.style.setProperty("--reveal-delay", `${delay}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px"
    });

    revealTargets.forEach((target) => observer.observe(target));
    page.classList.add("welcome-reveal-ready");
});
