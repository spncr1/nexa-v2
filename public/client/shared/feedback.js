(function () {
    const DEFAULT_TOAST_MS = 2500;
    const TONES = new Set(["positive", "neutral", "negative"]);

    let toastTimer = null;
    let activeConfirm = null;

    function normaliseTone(tone) {
        return TONES.has(tone) ? tone : "neutral";
    }

    function getToastRegion() {
        return document.getElementById("nexa-toast-region");
    }

    function getConfirmElements() {
        return {
            backdrop: document.getElementById("nexa-confirm-backdrop"),
            dialog: document.getElementById("nexa-confirm-dialog"),
            title: document.getElementById("nexa-confirm-title"),
            message: document.getElementById("nexa-confirm-message"),
            closeBtn: document.getElementById("nexa-confirm-close"),
            cancelBtn: document.getElementById("nexa-confirm-cancel"),
            acceptBtn: document.getElementById("nexa-confirm-accept")
        };
    }

    function resetToneClasses(element, baseClass) {
        if (!element) return;
        TONES.forEach((tone) => element.classList.remove(`${baseClass}--${tone}`));
    }

    function toast(message, options = {}) {
        const region = getToastRegion();
        if (!region) {
            window.alert(message);
            return;
        }

        const tone = normaliseTone(options.tone);
        const duration = Number.isFinite(options.duration) ? options.duration : DEFAULT_TOAST_MS;

        window.clearTimeout(toastTimer);
        resetToneClasses(region, "nexa-toast-region");
        region.textContent = message;
        region.classList.add(`nexa-toast-region--${tone}`, "is-visible");

        toastTimer = window.setTimeout(() => {
            region.classList.remove("is-visible");
            region.textContent = "";
        }, duration);
    }

    function notice(targetEl, message, options = {}) {
        if (!targetEl) {
            toast(message, options);
            return;
        }

        const tone = normaliseTone(options.tone);
        resetToneClasses(targetEl, "nexa-inline-notice");
        targetEl.textContent = message || "";
        targetEl.classList.add("nexa-inline-notice", `nexa-inline-notice--${tone}`);
        targetEl.classList.toggle("hidden", !message);
    }

    function closeConfirm(result) {
        if (!activeConfirm) return;

        const { backdrop, dialog, acceptBtn, cancelBtn, closeBtn } = getConfirmElements();
        backdrop?.classList.add("hidden");
        dialog?.classList.add("hidden");
        acceptBtn?.removeEventListener("click", activeConfirm.accept);
        cancelBtn?.removeEventListener("click", activeConfirm.cancel);
        closeBtn?.removeEventListener("click", activeConfirm.cancel);
        backdrop?.removeEventListener("click", activeConfirm.cancel);
        document.removeEventListener("keydown", activeConfirm.keydown);

        const resolve = activeConfirm.resolve;
        activeConfirm = null;
        resolve(result);
    }

    function confirm(options = {}) {
        const { backdrop, dialog, title, message, closeBtn, cancelBtn, acceptBtn } = getConfirmElements();

        if (!backdrop || !dialog || !title || !message || !closeBtn || !cancelBtn || !acceptBtn) {
            return Promise.resolve(window.confirm(options.message || options.title || "Are you sure?"));
        }

        if (activeConfirm) closeConfirm(false);

        const tone = normaliseTone(options.tone);
        title.textContent = options.title || "Confirm action";
        message.textContent = options.message || "";
        cancelBtn.querySelector(".ui-btn-label").textContent = options.cancelLabel || "Cancel";
        acceptBtn.querySelector(".ui-btn-label").textContent = options.confirmLabel || "OK";

        resetToneClasses(dialog, "nexa-confirm-dialog");
        resetToneClasses(acceptBtn, "nexa-confirm-accept");
        dialog.classList.add(`nexa-confirm-dialog--${tone}`);
        acceptBtn.classList.add(`nexa-confirm-accept--${tone}`);

        backdrop.classList.remove("hidden");
        dialog.classList.remove("hidden");
        acceptBtn.focus();

        return new Promise((resolve) => {
            activeConfirm = {
                resolve,
                accept: () => closeConfirm(true),
                cancel: () => closeConfirm(false),
                keydown: (event) => {
                    if (event.key === "Escape") closeConfirm(false);
                }
            };

            acceptBtn.addEventListener("click", activeConfirm.accept);
            cancelBtn.addEventListener("click", activeConfirm.cancel);
            closeBtn.addEventListener("click", activeConfirm.cancel);
            backdrop.addEventListener("click", activeConfirm.cancel);
            document.addEventListener("keydown", activeConfirm.keydown);
        });
    }

    window.NexaFeedback = {
        toast,
        notice,
        confirm
    };
})();
