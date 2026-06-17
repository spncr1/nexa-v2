document.addEventListener("DOMContentLoaded", async () => {
    await window.NexaAppStorage.ready;

    const storage = window.NexaAppStorage;
    let currentUser = storage.getCurrentUser();

    const menuToggle = document.querySelector(".menu-toggle");
    const profileSettingsBtn = document.getElementById("profile-settings-btn");
    const systemSettingsBtn = document.getElementById("system-settings-btn");
    const profileSettingsModal = document.getElementById("profile-settings-modal");
    const systemSettingsModal = document.getElementById("system-settings-modal");
    const settingsBackdrop = document.getElementById("settings-backdrop");
    const settingsCloseBtns = document.querySelectorAll(".settings-close-btn");
    const navButtons = document.querySelectorAll(".settings-nav");
    const panels = document.querySelectorAll(".settings-panel");
    const profileSubtitle = document.getElementById("profile-settings-subtitle");
    const systemSubtitle = document.getElementById("system-settings-subtitle");
    const themeModeSelect = document.getElementById("theme-mode-select");
    const themeSwitch = document.getElementById("theme-switch");
    const resetAppDataBtn = document.getElementById("reset-app-data-btn");
    const loadDemoDataBtn = document.getElementById("load-demo-data-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const accountEmailInput = document.getElementById("account-email-input");
    const accountAgeInput = document.getElementById("account-age-input");
    const accountSemesterInput = document.getElementById("account-semester-input");
    const saveProfileBtn = document.getElementById("save-profile-btn");
    const avatarInput = document.getElementById("profile-avatar-input");
    const removeAvatarBtn = document.getElementById("remove-avatar-btn");
    const settingsNavbarProfileAvatar = document.getElementById("settings-navbar-profile-avatar");
    const profileAvatarPreview = document.getElementById("profile-avatar-preview");
    const currentPasswordInput = document.getElementById("current-password-input");
    const newPasswordInput = document.getElementById("new-password-input");
    const confirmPasswordInput = document.getElementById("confirm-password-input");
    const changePasswordBtn = document.getElementById("change-password-btn");
    const passwordSettingsStatus = document.getElementById("password-settings-status");
    const logoutBtn = document.getElementById("logout-btn");
    const deleteAccountBtn = document.getElementById("delete-account-btn");

    const NAV_COLLAPSED_KEY = "studenthub_nav_collapsed";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const PROFILE_AGE_KEY = "studenthub_profile_age";
    const PROFILE_AVATAR_KEY = "studenthub_profile_avatar";
    const SYSTEM_PREFS_KEY = "studenthub_system_preferences";
    const THEME_MODE_KEY = "studenthub_theme_mode";
    const APP_DATA_KEYS = [
        "tasksByDate",
        "studenthub_subjects",
        "studenthub_assignments",
        USER_NAME_KEY,
        SEMESTER_KEY,
        PROFILE_AGE_KEY,
        PROFILE_AVATAR_KEY,
        SYSTEM_PREFS_KEY,
        THEME_MODE_KEY,
        "darkMode"
    ];
    const DEFAULT_USER_NAME = currentUser?.name || "Student";
    const DEFAULT_SEMESTER_LABEL = "Untitled Semester";
    const mobileNavQuery = window.matchMedia("(max-width: 768px)");
    const darkThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    /*
      ==========================
      NAVIGATION + SETTINGS BUTTONS
      ==========================
    */

    let navTransitionTimer = null;

    function setNavCollapsed(isCollapsed) {
        const wasCollapsed = document.body.classList.contains("nav-collapsed");

        if (navTransitionTimer) window.clearTimeout(navTransitionTimer);
        document.body.classList.remove("nav-collapsing", "nav-expanding");

        if (wasCollapsed !== isCollapsed) {
            document.body.classList.add(isCollapsed ? "nav-collapsing" : "nav-expanding");
            navTransitionTimer = window.setTimeout(() => {
                document.body.classList.remove("nav-collapsing", "nav-expanding");
            }, 560);
        }

        document.body.classList.toggle("nav-collapsed", isCollapsed);
        storage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        menuToggle?.setAttribute("aria-expanded", (!isCollapsed).toString());
    }

    function handleCollapsedNavActivation(event) {
        if (!document.body.classList.contains("nav-collapsed")) return;

        const summary = event.target.closest(".navbar .nav-group summary");
        if (summary) {
            event.preventDefault();

            const navGroup = summary.closest(".nav-group");
            const firstLink = navGroup?.querySelector(".nav-submenu a[href]");
            if (!firstLink) return;

            setNavCollapsed(false);
            window.location.href = firstLink.href;
            return;
        }

        const directLink = event.target.closest(".navbar a.nav-item[href]");
        if (directLink) {
            setNavCollapsed(false);
        }
    }

    /*
      ==========================
      PROFILE + SETTINGS MODALS
      ==========================
    */

    function loadUserName() {
        const saved = storage.getItem(USER_NAME_KEY);
        return saved && saved.trim() ? saved : DEFAULT_USER_NAME;
    }

    function loadSemesterLabel() {
        const saved = storage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : DEFAULT_SEMESTER_LABEL;
    }

    function loadProfileAge() {
        const saved = storage.getItem(PROFILE_AGE_KEY);
        return saved && saved.trim() ? saved : "";
    }

    function loadAvatar() {
        const saved = storage.getItem(PROFILE_AVATAR_KEY);
        return saved && saved.startsWith("data:image/") ? saved : "";
    }

    function setAvatarPreview(dataUrl) {
        [settingsNavbarProfileAvatar, profileAvatarPreview].forEach((el) => {
            if (!el) return;
            el.classList.toggle("has-image", Boolean(dataUrl));
            el.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : "";
        });
    }

    function populateProfileInputs() {
        if (accountNameInput) accountNameInput.value = loadUserName();
        if (accountEmailInput) accountEmailInput.value = currentUser?.email || "";
        if (accountAgeInput) accountAgeInput.value = loadProfileAge();
        if (accountSemesterInput) accountSemesterInput.value = loadSemesterLabel();
        setAvatarPreview(loadAvatar());
    }

    function loadSystemPrefs() {
        try {
            const raw = storage.getItem(SYSTEM_PREFS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            console.warn("Failed to parse system preferences:", error);
            return {};
        }
    }

    function saveSystemPrefs(prefs) {
        storage.setItem(SYSTEM_PREFS_KEY, JSON.stringify(prefs && typeof prefs === "object" ? prefs : {}));
    }

    function populateSystemPreferences() {
        const prefs = loadSystemPrefs();

        document.querySelectorAll("[data-system-pref]").forEach((control) => {
            const key = control.dataset.systemPref;
            if (!key) return;

            if (control.type === "checkbox") {
                control.checked = Boolean(prefs[key]);
            } else {
                control.value = prefs[key] || control.querySelector("option")?.value || "";
            }
        });
    }

    function saveSingleSystemPreference(control) {
        const key = control.dataset.systemPref;
        if (!key) return;

        const prefs = loadSystemPrefs();
        prefs[key] = control.type === "checkbox" ? control.checked : control.value;
        saveSystemPrefs(prefs);
        showToast("System preference saved.", "neutral");
    }

    function showToast(message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.toast(message, { tone });
            return;
        }

        window.alert(message);
    }

    function showInlineNotice(targetEl, message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.notice(targetEl, message, { tone });
            return;
        }

        if (targetEl) targetEl.textContent = message || "";
    }

    function confirmAction(options) {
        if (window.NexaFeedback) {
            return window.NexaFeedback.confirm(options);
        }

        return Promise.resolve(window.confirm(options.message || options.title || "Are you sure?"));
    }

    function closeSettingsModals() {
        profileSettingsModal?.classList.add("hidden");
        systemSettingsModal?.classList.add("hidden");
        settingsBackdrop?.classList.add("hidden");
        document.body.classList.remove("settings-modal-open");
        showInlineNotice(passwordSettingsStatus, "");
    }

    function openProfileSettings() {
        populateProfileInputs();
        settingsBackdrop?.classList.remove("hidden");
        profileSettingsModal?.classList.remove("hidden");
        systemSettingsModal?.classList.add("hidden");
        document.body.classList.add("settings-modal-open");
        profileSettingsBtn?.blur();
        systemSettingsBtn?.blur();
        setActiveTab("profile", "profile");
    }

    function openSystemSettings() {
        populateSystemPreferences();
        settingsBackdrop?.classList.remove("hidden");
        systemSettingsModal?.classList.remove("hidden");
        profileSettingsModal?.classList.add("hidden");
        document.body.classList.add("settings-modal-open");
        profileSettingsBtn?.blur();
        systemSettingsBtn?.blur();
        setActiveTab("system", "appearance");
    }

    function setActiveTab(targetKey, tabKey) {
        navButtons.forEach((btn) => {
            const matchesTarget = btn.dataset.settingsTarget === targetKey;
            btn.classList.toggle("active", matchesTarget && btn.dataset.tab === tabKey);
        });

        panels.forEach((panel) => {
            const matchesTarget = panel.dataset.settingsPanel === targetKey;
            panel.classList.toggle("hidden", !matchesTarget || panel.dataset.panel !== tabKey);
        });

        const subtitle = targetKey === "profile" ? profileSubtitle : systemSubtitle;
        if (subtitle) {
            subtitle.textContent = tabKey
                .split("-")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ");
        }
    }

    async function saveProfileSettings() {
        const nameValue = (accountNameInput?.value || "").trim() || DEFAULT_USER_NAME;
        const emailValue = (accountEmailInput?.value || "").trim().toLowerCase();
        const ageValue = (accountAgeInput?.value || "").trim();
        const semesterValue = (accountSemesterInput?.value || "").trim() || DEFAULT_SEMESTER_LABEL;

        if (!emailValue) {
            showToast("Email cannot be blank.", "negative");
            populateProfileInputs();
            return;
        }

        if (ageValue) {
            const ageNumber = Number(ageValue);
            if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 120) {
                showToast("Age must be a whole number between 13 and 120.", "negative");
                return;
            }
        }

        const response = await fetch("/api/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ name: nameValue, email: emailValue })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            showToast(payload.error || "Could not update profile details right now.", "negative");
            populateProfileInputs();
            return;
        }

        currentUser = await response.json();
        storage.setCurrentUser(currentUser);
        storage.setItem(USER_NAME_KEY, nameValue);
        storage.setItem(SEMESTER_KEY, semesterValue);
        if (ageValue) {
            storage.setItem(PROFILE_AGE_KEY, ageValue);
        } else {
            storage.removeItem(PROFILE_AGE_KEY);
        }

        populateProfileInputs();
        window.dispatchEvent(new CustomEvent("nexa:account-updated", {
            detail: { user: currentUser, name: nameValue, semester: semesterValue, age: ageValue }
        }));
        showToast("Profile details saved.", "neutral");
    }

    function clearPasswordInputs() {
        if (currentPasswordInput) currentPasswordInput.value = "";
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
    }

    async function changePassword() {
        const currentPassword = currentPasswordInput?.value || "";
        const newPassword = newPasswordInput?.value || "";
        const confirmPassword = confirmPasswordInput?.value || "";

        showInlineNotice(passwordSettingsStatus, "");

        const response = await fetch("/api/me/password", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            showInlineNotice(passwordSettingsStatus, payload.error || "Could not change password right now.", "negative");
            return;
        }

        clearPasswordInputs();
        showInlineNotice(passwordSettingsStatus, "Password updated.", "positive");
        showToast("Password updated.", "positive");
    }

    async function logoutCurrentUser() {
        const confirmed = await confirmAction({
            title: "Log out?",
            message: "Are you sure you want to log out?",
            tone: "neutral",
            confirmLabel: "Log out",
            cancelLabel: "Cancel"
        });
        if (!confirmed) return;

        const response = await fetch("/logout", {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            showToast("Could not log out right now.", "negative");
            return;
        }

        window.location.href = "/login";
    }

    async function deleteCurrentUserAccount() {
        const confirmed = await confirmAction({
            title: "Delete account?",
            message: "This cannot be undone.",
            tone: "negative",
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
        });
        if (!confirmed) return;

        const response = await fetch("/api/me", {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            showToast(payload.error || "Could not delete account right now.", "negative");
            return;
        }

        showToast("Account deleted.", "negative");
        window.setTimeout(() => {
            window.location.href = "/login";
        }, 900);
    }

    async function resetAllAppData() {
        const confirmed = await confirmAction({
            title: "Reset app data?",
            message: "This will permanently delete saved tasks, subjects, assignments, profile fields, and system preferences.",
            tone: "negative",
            confirmLabel: "Reset",
            cancelLabel: "Cancel"
        });
        if (!confirmed) return;

        APP_DATA_KEYS.forEach((key) => storage.removeItem(key));
        setDarkMode(false);
        if (themeModeSelect) themeModeSelect.value = "light";
        populateProfileInputs();
        populateSystemPreferences();
        window.dispatchEvent(new CustomEvent("nexa:app-data-reset"));
    }

    function requestDemoData() {
        window.dispatchEvent(new CustomEvent("nexa:load-demo-data"));
        populateProfileInputs();
    }

    function updateAvatarFromFile(file) {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("Choose an image file for your profile picture.", "negative");
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result.startsWith("data:image/")) {
                showToast("Could not read that image.", "negative");
                return;
            }

            storage.setItem(PROFILE_AVATAR_KEY, result);
            setAvatarPreview(result);
            showToast("Profile picture updated.", "positive");
        });
        reader.addEventListener("error", () => {
            showToast("Could not read that image.", "negative");
        });
        reader.readAsDataURL(file);
    }

    function removeAvatar() {
        storage.removeItem(PROFILE_AVATAR_KEY);
        if (avatarInput) avatarInput.value = "";
        setAvatarPreview("");
        showToast("Profile picture removed.", "neutral");
    }

    /*
      ==========================
      THEME SETTINGS
      ==========================
    */

    function setDarkMode(isOn, { persistLegacy = true } = {}) {
        document.body.classList.toggle("dark-mode", isOn);
        if (persistLegacy) {
            storage.setItem("darkMode", isOn ? "1" : "0");
        }
        document.cookie = `nexa_dark_mode=${isOn ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
        themeSwitch?.setAttribute("aria-pressed", isOn.toString());
        themeSwitch?.setAttribute("aria-label", isOn ? "Switch to light mode" : "Switch to dark mode");
    }

    function resolveThemeMode(mode) {
        if (mode === "dark") return true;
        if (mode === "light") return false;
        return darkThemeQuery.matches;
    }

    function setThemeMode(mode) {
        const nextMode = ["system", "light", "dark"].includes(mode) ? mode : "system";
        storage.setItem(THEME_MODE_KEY, nextMode);
        if (themeModeSelect) themeModeSelect.value = nextMode;
        setDarkMode(resolveThemeMode(nextMode), { persistLegacy: nextMode !== "system" });
    }

    function initialiseThemeSetting() {
        const savedMode = storage.getItem(THEME_MODE_KEY);
        const legacyMode = storage.getItem("darkMode") === "1" ? "dark" : "light";
        setThemeMode(savedMode || legacyMode);

        themeSwitch?.addEventListener("click", () => {
            setThemeMode(document.body.classList.contains("dark-mode") ? "light" : "dark");
        });

        themeModeSelect?.addEventListener("change", () => {
            setThemeMode(themeModeSelect.value);
        });

        darkThemeQuery.addEventListener("change", () => {
            if (storage.getItem(THEME_MODE_KEY) === "system") {
                setDarkMode(darkThemeQuery.matches, { persistLegacy: false });
            }
        });
    }

    if (menuToggle) {
        const savedCollapsed = storage.getItem(NAV_COLLAPSED_KEY) === "1";
        setNavCollapsed(mobileNavQuery.matches ? true : savedCollapsed);
        menuToggle.addEventListener("click", () => {
            setNavCollapsed(!document.body.classList.contains("nav-collapsed"));
        });
    }

    document.querySelector(".navbar")?.addEventListener("click", handleCollapsedNavActivation);

    profileSettingsBtn?.addEventListener("click", (event) => {
        event.stopPropagation();
        openProfileSettings();
    });
    systemSettingsBtn?.addEventListener("click", (event) => {
        event.stopPropagation();
        openSystemSettings();
    });
    settingsBackdrop?.addEventListener("click", closeSettingsModals);
    settingsCloseBtns.forEach((btn) => {
        btn.addEventListener("click", closeSettingsModals);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSettingsModals();
    });
    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.settingsTarget, btn.dataset.tab));
    });

    resetAppDataBtn?.addEventListener("click", () => {
        resetAllAppData().catch((error) => {
            console.error("Failed to reset app data:", error);
            showToast("Could not reset app data right now.", "negative");
        });
    });
    loadDemoDataBtn?.addEventListener("click", requestDemoData);
    saveProfileBtn?.addEventListener("click", () => {
        saveProfileSettings().catch((error) => {
            console.error("Failed to save profile settings:", error);
            showToast("Could not update profile details right now.", "negative");
        });
    });
    avatarInput?.addEventListener("change", () => updateAvatarFromFile(avatarInput.files?.[0]));
    removeAvatarBtn?.addEventListener("click", removeAvatar);
    changePasswordBtn?.addEventListener("click", () => {
        changePassword().catch((error) => {
            console.error("Failed to change password:", error);
            showInlineNotice(passwordSettingsStatus, "Could not change password right now.", "negative");
        });
    });
    logoutBtn?.addEventListener("click", () => {
        logoutCurrentUser().catch((error) => {
            console.error("Failed to log out:", error);
            showToast("Could not log out right now.", "negative");
        });
    });
    deleteAccountBtn?.addEventListener("click", () => {
        deleteCurrentUserAccount().catch((error) => {
            console.error("Failed to delete account:", error);
            showToast("Could not delete account right now.", "negative");
        });
    });
    document.querySelectorAll("[data-system-pref]").forEach((control) => {
        control.addEventListener("change", () => saveSingleSystemPreference(control));
    });

    setActiveTab("profile", "profile");
    setActiveTab("system", "appearance");
    initialiseThemeSetting();
    populateProfileInputs();
    populateSystemPreferences();
});
