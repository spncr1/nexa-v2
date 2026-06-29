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
    const accountLocationInput = document.getElementById("account-location-input");
    const accountUniversityInput = document.getElementById("account-university-input");
    const accountDegreeInput = document.getElementById("account-degree-input");
    const accountSemesterInput = document.getElementById("account-semester-input");
    const yearLevelButtons = document.querySelectorAll(".year-level-option");
    const saveProfileBtn = document.getElementById("save-profile-btn");
    const avatarInput = document.getElementById("profile-avatar-input");
    const uploadAvatarBtn = document.getElementById("upload-avatar-btn");
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
    const NAV_GROUPS_KEY = "studenthub_nav_group_state";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const PROFILE_AGE_KEY = "studenthub_profile_age";
    const PROFILE_LOCATION_KEY = "studenthub_profile_location";
    const PROFILE_UNIVERSITY_KEY = "studenthub_profile_university";
    const PROFILE_DEGREE_KEY = "studenthub_profile_degree";
    const PROFILE_YEAR_LEVEL_KEY = "studenthub_profile_year_level";
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
        PROFILE_LOCATION_KEY,
        PROFILE_UNIVERSITY_KEY,
        PROFILE_DEGREE_KEY,
        PROFILE_YEAR_LEVEL_KEY,
        PROFILE_AVATAR_KEY,
        SYSTEM_PREFS_KEY,
        THEME_MODE_KEY,
        NAV_GROUPS_KEY,
        "darkMode"
    ];
    const DEFAULT_USER_NAME = currentUser?.name || "Student";
    const DEFAULT_SEMESTER_LABEL = "Untitled Semester";
    const DEFAULT_YEAR_LEVEL = "N/A";
    const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const mobileNavQuery = window.matchMedia("(max-width: 600px)");
    const darkThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    /*
      ==========================
      NAVIGATION + SETTINGS BUTTONS
      ==========================
    */

    let navTransitionTimer = null;
    let syncingNavGroups = false;

    function getNavGroupKey(navGroup) {
        return navGroup?.querySelector("summary")?.getAttribute("aria-label") || "";
    }

    function loadNavGroupState() {
        try {
            const parsed = JSON.parse(storage.getItem(NAV_GROUPS_KEY) || "{}");
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveNavGroupState(navGroup) {
        const key = getNavGroupKey(navGroup);
        if (!key) return;

        const state = loadNavGroupState();
        state[key] = navGroup.open;
        storage.setItem(NAV_GROUPS_KEY, JSON.stringify(state));
    }

    function initialiseNavGroups() {
        const navGroups = document.querySelectorAll(".navbar .nav-group");
        if (!navGroups.length) return;

        const state = loadNavGroupState();
        syncingNavGroups = true;
        navGroups.forEach((navGroup) => {
            const key = getNavGroupKey(navGroup);
            if (Object.prototype.hasOwnProperty.call(state, key)) {
                navGroup.open = Boolean(state[key]);
            }
        });
        syncingNavGroups = false;

        navGroups.forEach((navGroup) => {
            navGroup.addEventListener("toggle", () => {
                if (syncingNavGroups) return;
                saveNavGroupState(navGroup);
            });
        });
    }

    function setNavCollapsed(isCollapsed) {
        if (mobileNavQuery.matches) {
            setMobileNavOpen(false);
            document.body.classList.remove("nav-collapsed", "nav-collapsing", "nav-expanding");
            menuToggle?.setAttribute("aria-expanded", "false");
            return;
        }

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

    function setMobileNavOpen(isOpen) {
        document.body.classList.toggle("mobile-nav-open", isOpen);
        menuToggle?.setAttribute("aria-expanded", isOpen.toString());
    }

    function syncNavigationMode() {
        if (mobileNavQuery.matches) {
            document.body.classList.remove("nav-collapsed", "nav-collapsing", "nav-expanding");
            setMobileNavOpen(false);
            return;
        }

        setMobileNavOpen(false);
        setNavCollapsed(storage.getItem(NAV_COLLAPSED_KEY) === "1");
    }

    function handleCollapsedNavActivation(event) {
        if (mobileNavQuery.matches) return;
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

    function handleMobileNavActivation(event) {
        if (!mobileNavQuery.matches) return;

        const navLink = event.target.closest(".navbar a[href]");
        if (navLink) {
            setMobileNavOpen(false);
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

    function loadProfileLocation() {
        const saved = storage.getItem(PROFILE_LOCATION_KEY);
        return saved && saved.trim() ? saved : "";
    }

    function loadProfileUniversity() {
        const saved = storage.getItem(PROFILE_UNIVERSITY_KEY);
        return saved && saved.trim() ? saved : "";
    }

    function loadProfileDegree() {
        const saved = storage.getItem(PROFILE_DEGREE_KEY);
        return saved && saved.trim() ? saved : "";
    }

    function loadProfileYearLevel() {
        const saved = storage.getItem(PROFILE_YEAR_LEVEL_KEY);
        return saved && saved.trim() ? saved : DEFAULT_YEAR_LEVEL;
    }

    function loadAvatar() {
        const saved = storage.getItem(PROFILE_AVATAR_KEY);
        return saved && Array.from(ALLOWED_AVATAR_TYPES).some((type) => saved.startsWith(`data:${type};`)) ? saved : "";
    }

    function setAvatarPreview(dataUrl) {
        [settingsNavbarProfileAvatar, profileAvatarPreview].forEach((el) => {
            if (!el) return;
            el.classList.toggle("has-image", Boolean(dataUrl));
            el.style.backgroundImage = dataUrl ? `url("${dataUrl}")` : "";
        });
    }

    function setYearLevel(value) {
        const nextValue = value || DEFAULT_YEAR_LEVEL;
        yearLevelButtons.forEach((btn) => {
            const isActive = btn.dataset.yearLevel === nextValue;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", isActive.toString());
        });
    }

    function getSelectedYearLevel() {
        return document.querySelector(".year-level-option.active")?.dataset.yearLevel || DEFAULT_YEAR_LEVEL;
    }

    function populateProfileInputs() {
        if (accountNameInput) accountNameInput.value = loadUserName();
        if (accountEmailInput) accountEmailInput.value = currentUser?.email || "";
        if (accountAgeInput) accountAgeInput.value = loadProfileAge();
        if (accountLocationInput) accountLocationInput.value = loadProfileLocation();
        if (accountUniversityInput) accountUniversityInput.value = loadProfileUniversity();
        if (accountDegreeInput) accountDegreeInput.value = loadProfileDegree();
        if (accountSemesterInput) accountSemesterInput.value = loadSemesterLabel();
        setYearLevel(loadProfileYearLevel());
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
        const locationValue = (accountLocationInput?.value || "").trim();
        const universityValue = (accountUniversityInput?.value || "").trim();
        const degreeValue = (accountDegreeInput?.value || "").trim();
        const yearLevelValue = getSelectedYearLevel();
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
        if (locationValue) {
            storage.setItem(PROFILE_LOCATION_KEY, locationValue);
        } else {
            storage.removeItem(PROFILE_LOCATION_KEY);
        }
        if (universityValue) {
            storage.setItem(PROFILE_UNIVERSITY_KEY, universityValue);
        } else {
            storage.removeItem(PROFILE_UNIVERSITY_KEY);
        }
        if (degreeValue) {
            storage.setItem(PROFILE_DEGREE_KEY, degreeValue);
        } else {
            storage.removeItem(PROFILE_DEGREE_KEY);
        }
        storage.setItem(PROFILE_YEAR_LEVEL_KEY, yearLevelValue || DEFAULT_YEAR_LEVEL);

        populateProfileInputs();
        window.dispatchEvent(new CustomEvent("nexa:account-updated", {
            detail: {
                user: currentUser,
                name: nameValue,
                semester: semesterValue,
                age: ageValue,
                location: locationValue,
                university: universityValue,
                degree: degreeValue,
                yearLevel: yearLevelValue
            }
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
            variant: "logout",
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

        if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
            showToast("Use a JPG, PNG, or WebP image for your profile picture.", "negative");
            if (avatarInput) avatarInput.value = "";
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!Array.from(ALLOWED_AVATAR_TYPES).some((type) => result.startsWith(`data:${type};`))) {
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
        initialiseNavGroups();
        syncNavigationMode();
        menuToggle.addEventListener("click", () => {
            if (mobileNavQuery.matches) {
                setMobileNavOpen(!document.body.classList.contains("mobile-nav-open"));
                return;
            }

            setNavCollapsed(!document.body.classList.contains("nav-collapsed"));
        });
    }

    document.querySelector(".navbar")?.addEventListener("click", handleCollapsedNavActivation);
    document.querySelector(".navbar")?.addEventListener("click", handleMobileNavActivation);

    if (typeof mobileNavQuery.addEventListener === "function") {
        mobileNavQuery.addEventListener("change", syncNavigationMode);
    } else if (typeof mobileNavQuery.addListener === "function") {
        mobileNavQuery.addListener(syncNavigationMode);
    }

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
    uploadAvatarBtn?.addEventListener("click", () => avatarInput?.click());
    profileAvatarPreview?.addEventListener("click", () => avatarInput?.click());
    removeAvatarBtn?.addEventListener("click", removeAvatar);
    yearLevelButtons.forEach((btn) => {
        btn.addEventListener("click", () => setYearLevel(btn.dataset.yearLevel));
    });
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
