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
    const sendEmailReminderBtn = document.getElementById("send-email-reminder-btn");
    const emailReminderStatus = document.getElementById("email-reminder-status");
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
    const TASKS_KEY = "tasksByDate";
    const SUBJECTS_KEY = "studenthub_subjects";
    const ASSIGNMENTS_KEY = "studenthub_assignments";
    const STUDY_QUEUE_KEY = "studenthub_study_queue";
    const STUDY_COMPLETED_KEY = "studenthub_study_completed_sessions";
    const STUDY_FAVOURITES_KEY = "studenthub_study_favourites";
    const STUDY_ACTIVE_KEY = "studenthub_study_active_session";
    const STUDY_WEEKLY_GOAL_KEY = "studenthub_study_weekly_goal";
    const STUDY_MONTHLY_GOAL_KEY = "studenthub_study_monthly_goal";
    const STUDY_SUGGESTION_OVERRIDES_KEY = "studenthub_study_suggestion_overrides";
    const JOB_APPLICATIONS_KEY = "studenthub_job_applications";
    const APP_DATA_KEYS = [
        TASKS_KEY,
        SUBJECTS_KEY,
        ASSIGNMENTS_KEY,
        STUDY_QUEUE_KEY,
        STUDY_COMPLETED_KEY,
        STUDY_FAVOURITES_KEY,
        STUDY_ACTIVE_KEY,
        STUDY_WEEKLY_GOAL_KEY,
        STUDY_MONTHLY_GOAL_KEY,
        STUDY_SUGGESTION_OVERRIDES_KEY,
        JOB_APPLICATIONS_KEY,
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
        if (window.NexaPreferences && !window.NexaPreferences.allowsPersonalisation()) return {};

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
        if (window.NexaPreferences && !window.NexaPreferences.allowsPersonalisation()) return;

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
        if (window.NexaPreferences && !window.NexaPreferences.allowsPersonalisation()) {
            storage.removeItem(NAV_COLLAPSED_KEY);
        } else {
            storage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        }
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
        const shouldLoadSavedState = !window.NexaPreferences || window.NexaPreferences.allowsPersonalisation();
        setNavCollapsed(shouldLoadSavedState && storage.getItem(NAV_COLLAPSED_KEY) === "1");
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
        if (window.NexaPreferences) return window.NexaPreferences.load();

        try {
            const raw = storage.getItem(SYSTEM_PREFS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (error) {
            console.warn("Failed to parse system preferences:", error);
            return {};
        }
    }

    function saveSystemPrefs(prefs, changedKey = "") {
        if (window.NexaPreferences) {
            const saved = window.NexaPreferences.save(prefs, changedKey);
            if (changedKey === "personalisation" && !saved.personalisation) {
                window.NexaPreferences.clearPersonalisedUiState();
            }
            return saved;
        }

        storage.setItem(SYSTEM_PREFS_KEY, JSON.stringify(prefs && typeof prefs === "object" ? prefs : {}));
        return prefs && typeof prefs === "object" ? prefs : {};
    }

    function setSegmentedPreferenceValue(group, value) {
        group.querySelectorAll("[data-pref-value]").forEach((button) => {
            const isActive = button.dataset.prefValue === value;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive.toString());
        });
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

        document.querySelectorAll("[data-system-segmented-pref]").forEach((group) => {
            const key = group.dataset.systemSegmentedPref;
            setSegmentedPreferenceValue(group, prefs[key]);
        });
        syncEmailReminderAction(prefs);
    }

    function syncEmailReminderAction(prefs = loadSystemPrefs()) {
        if (!sendEmailReminderBtn) return;
        const isEnabled = prefs.emailReminders && prefs.emailReminders !== "off";
        sendEmailReminderBtn.disabled = !isEnabled;
        sendEmailReminderBtn.classList.toggle("disabled", !isEnabled);
    }

    function showEmailReminderStatus(message, tone = "neutral") {
        if (!emailReminderStatus) return;
        emailReminderStatus.textContent = message || "";
        emailReminderStatus.classList.remove("hidden", "is-positive", "is-negative", "is-neutral");
        emailReminderStatus.classList.add(`is-${tone}`);
        emailReminderStatus.classList.toggle("hidden", !message);
    }

    function describeReminderPayload(payload) {
        const recipient = payload.recipientEmail ? ` to ${payload.recipientEmail}` : "";
        const type = payload.reminderType === "weekly" ? "weekly summary" : "important reminder";
        const items = Array.isArray(payload.items) ? payload.items : [];
        const preview = items.slice(0, 3).map((item) => item.task).filter(Boolean).join(", ");
        const suffix = preview ? ` Matched: ${preview}${items.length > 3 ? ", ..." : ""}.` : "";
        return `Sent ${type}${recipient} with ${payload.itemCount} ${payload.itemCount === 1 ? "assignment" : "assignments"}.${suffix}`;
    }

    async function saveSingleSystemPreference(control) {
        const key = control.dataset.systemPref;
        if (!key) return;

        let value = control.type === "checkbox" ? control.checked : control.value;

        if (key === "studyTimerAlerts" && value) {
            const permission = await window.NexaPreferences?.requestStudyTimerNotificationPermission?.();
            if (permission !== "granted") {
                const message = permission === "unsupported"
                    ? "Browser notifications are not supported here. Timer alerts are saved in Nexa."
                    : "Browser notifications are blocked. Timer alerts are saved in Nexa.";
                showToast(message, "neutral");
            }
        }

        const prefs = loadSystemPrefs();
        prefs[key] = value;
        saveSystemPrefs(prefs, key);
        if (key === "emailReminders") syncEmailReminderAction(prefs);
        if (key === "emailReminders") {
            showEmailReminderStatus(
                value === "off"
                    ? "Email reminders are off. Turn them on to send a backend reminder digest."
                    : "Email reminders saved. Use Send to trigger the backend digest now.",
                "neutral"
            );
        }
        showToast("System preference saved.", "neutral");
    }

    function saveSegmentedSystemPreference(group, value) {
        const key = group.dataset.systemSegmentedPref;
        if (!key || !value) return;

        const prefs = loadSystemPrefs();
        prefs[key] = value;
        saveSystemPrefs(prefs, key);
        setSegmentedPreferenceValue(group, value);
        showToast("System preference saved.", "neutral");
    }

    async function sendEmailReminderDigest() {
        if (!sendEmailReminderBtn) return;

        sendEmailReminderBtn.disabled = true;
        const label = sendEmailReminderBtn.querySelector(".ui-btn-label");
        const originalLabel = label?.textContent || "Send";
        if (label) label.textContent = "Sending";
        showEmailReminderStatus("Sending reminder email through the backend...", "neutral");

        try {
            await storage.flush?.();
            const response = await fetch("/api/reminders/email-digest", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: true })
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || "Could not send reminder email right now.");
            }

            if (payload.sent) {
                const message = describeReminderPayload(payload);
                showEmailReminderStatus(message, "positive");
                showToast(`Reminder email sent with ${payload.itemCount} ${payload.itemCount === 1 ? "item" : "items"}.`, "positive");
                return;
            }

            if (payload.skipped === "no_items") {
                showEmailReminderStatus(`Backend ran, but no assignments matched ${payload.reminderType === "weekly" ? "Weekly summary" : "Important only"} for ${payload.recipientEmail || "this account"}.`, "neutral");
                showToast("No reminder email sent because there are no matching assignments.", "neutral");
                return;
            }

            showEmailReminderStatus("Backend skipped this digest because it was already sent for this period.", "neutral");
            showToast("Reminder email already sent for this period.", "neutral");
        } catch (error) {
            showEmailReminderStatus(error.message || "Could not send reminder email right now.", "negative");
            showToast(error.message || "Could not send reminder email right now.", "negative");
        } finally {
            if (label) label.textContent = originalLabel;
            syncEmailReminderAction();
        }
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

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function shuffleList(items) {
        return [...items].sort(() => Math.random() - 0.5);
    }

    function atNoon(dateObj) {
        const date = new Date(dateObj);
        date.setHours(12, 0, 0, 0);
        return date;
    }

    function addDays(dateObj, days) {
        const date = atNoon(dateObj);
        date.setDate(date.getDate() + days);
        return date;
    }

    function dateKey(dateObj) {
        const date = atNoon(dateObj);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function timeInput(hour, minute = 0) {
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    function generateDemoTasksByDate() {
        const now = Date.now();
        const today = atNoon(new Date());
        const taskTemplates = [
            { title: "Draft weekly plan", notes: "Block out study, admin, and recovery time.", priority: "medium", status: "in-progress", hour: 9 },
            { title: "Review assignment rubric", notes: "Check criteria before writing.", priority: "high", status: "not-started", hour: 11 },
            { title: "Update lecture notes", notes: "Clean up examples and formulas.", priority: "low", status: "completed", hour: 14 },
            { title: "Prepare tutorial questions", notes: "Bring two discussion points.", priority: "medium", status: "not-started", hour: 16 },
            { title: "Submit progress reflection", notes: "Keep it brief and specific.", priority: "high", status: "in-progress", hour: 18 }
        ];
        const tasksByDate = {};

        [-2, -1, 0, 1, 2, 4, 6].forEach((offset, dateIndex) => {
            const key = dateKey(addDays(today, offset));
            tasksByDate[key] = shuffleList(taskTemplates).slice(0, offset === 0 ? 4 : randomInt(2, 3)).map((task, taskIndex) => ({
                id: `task_demo_${now}_${dateIndex}_${taskIndex}`,
                title: task.title,
                notes: task.notes,
                priority: task.priority,
                status: task.status,
                scheduledHour: task.hour,
                scheduledMinute: 0,
                scheduledTime: timeInput(task.hour),
                createdAt: now - randomInt(0, 8) * 86400000,
                updatedAt: now - randomInt(0, 3) * 3600000
            }));
        });

        return tasksByDate;
    }

    function generateDemoAssignmentsData() {
        const now = Date.now();
        const today = atNoon(new Date());
        const subjectNames = ["Design Systems", "Data Structures", "Research Methods", "Business Analytics"];
        const assignmentTemplates = [
            { task: "Research report", priority: "high", status: "in-progress", weight: 35, offset: 1 },
            { task: "Tutorial portfolio", priority: "medium", status: "not-started", weight: 20, offset: 4 },
            { task: "Quiz revision", priority: "low", status: "completed", weight: 10, offset: -2 },
            { task: "Final presentation", priority: "high", status: "not-started", weight: 30, offset: 8 }
        ];
        const subjects = subjectNames.map((name, index) => ({
            id: `subject_demo_${now}_${index}`,
            name,
            createdAt: now - index * 1000,
            updatedAt: now - index * 1000
        }));
        const assignments = [];

        subjects.forEach((subject, subjectIndex) => {
            shuffleList(assignmentTemplates).slice(0, 3).forEach((template, templateIndex) => {
                assignments.push({
                    id: `assignment_demo_${now}_${subjectIndex}_${templateIndex}`,
                    courseId: subject.id,
                    task: template.task,
                    desc: "Demo assignment used to check layout, charts, reminders, and dashboard states.",
                    priority: template.priority,
                    status: template.status,
                    dueDate: dateKey(addDays(today, template.offset + subjectIndex)),
                    weighting: template.weight,
                    createdAt: now - randomInt(0, 10) * 86400000,
                    updatedAt: now - randomInt(0, 3) * 3600000
                });
            });
        });

        return { subjects, assignments };
    }

    function generateDemoStudyPlannerData() {
        const now = Date.now();
        const baseSessions = [
            { title: "Exam revision", type: "deep", seconds: 90 * 60 },
            { title: "Assignment writing", type: "standard", seconds: 60 * 60 },
            { title: "Lecture recap", type: "light", seconds: 35 * 60 },
            { title: "Practice questions", type: "standard", seconds: 50 * 60 },
            { title: "Research sprint", type: "deep", seconds: 120 * 60 }
        ];
        const makeSession = (session, index, prefix) => ({
            id: `${prefix}_${now}_${index}`,
            title: session.title,
            type: session.type,
            durationSeconds: session.seconds,
            durationMinutes: Math.round(session.seconds / 60),
            notes: "Demo study block.",
            createdAt: now - index * 3600000,
            updatedAt: now - index * 1800000
        });

        return {
            queue: baseSessions.slice(0, 3).map((session, index) => makeSession(session, index + 1, "study_demo_queue")),
            completedSessions: baseSessions.slice(2, 5).map((session, index) => ({
                ...makeSession(session, index + 1, "study_demo_completed"),
                completedAt: now - randomInt(30, 2880) * 60 * 1000
            })),
            favouriteSessions: [{ ...makeSession(baseSessions[0], 1, "study_demo_favourite"), notes: "Reusable demo favourite." }],
            weeklyGoal: {
                targetSessions: 8,
                targetFocusSeconds: 10 * 3600,
                activeDays: 4,
                focusBalance: { deep: 50, standard: 30, light: 20 },
                updatedAt: now
            },
            monthlyGoal: {
                targetSessions: 32,
                targetFocusSeconds: 40 * 3600,
                activeDays: 16,
                focusBalance: { deep: 50, standard: 30, light: 20 },
                updatedAt: now
            }
        };
    }

    function generateDemoJobApplications() {
        const now = Date.now();
        return [
            { id: `job_demo_${now}_1`, company: "Atlassian", role: "Software Engineer Intern", location: "Sydney, Australia", type: "SWE Internship", status: "Applied", database: "SWE Internships", createdAt: now - 6 * 86400000, updatedAt: now - 2 * 86400000 },
            { id: `job_demo_${now}_2`, company: "Canva", role: "Frontend Intern", location: "Sydney, Australia", type: "SWE Internship", status: "Interview", database: "SWE Internships", createdAt: now - 10 * 86400000, updatedAt: now - 3600000 },
            { id: `job_demo_${now}_3`, company: "Commonwealth Bank", role: "Graduate Analyst", location: "Melbourne, Australia", type: "Graduate Role", status: "OA", database: "Graduate Roles", createdAt: now - 14 * 86400000, updatedAt: now - 4 * 86400000 },
            { id: `job_demo_${now}_4`, company: "Local Cafe", role: "Part-Time Team Member", location: "Newcastle, Australia", type: "Part-Time", status: "Offer", database: "Part-Time", createdAt: now - 20 * 86400000, updatedAt: now - 7 * 86400000 }
        ];
    }

    function loadDemoDataAcrossApp() {
        const taskData = generateDemoTasksByDate();
        const assignmentData = generateDemoAssignmentsData();
        const studyData = generateDemoStudyPlannerData();

        storage.setItem(TASKS_KEY, JSON.stringify(taskData));
        storage.setItem(SUBJECTS_KEY, JSON.stringify(assignmentData.subjects));
        storage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignmentData.assignments));
        storage.setItem(STUDY_QUEUE_KEY, JSON.stringify(studyData.queue));
        storage.setItem(STUDY_COMPLETED_KEY, JSON.stringify(studyData.completedSessions));
        storage.setItem(STUDY_FAVOURITES_KEY, JSON.stringify(studyData.favouriteSessions));
        storage.setItem(STUDY_WEEKLY_GOAL_KEY, JSON.stringify(studyData.weeklyGoal));
        storage.setItem(STUDY_MONTHLY_GOAL_KEY, JSON.stringify(studyData.monthlyGoal));
        storage.removeItem(STUDY_ACTIVE_KEY);
        storage.removeItem(STUDY_SUGGESTION_OVERRIDES_KEY);
        storage.setItem(JOB_APPLICATIONS_KEY, JSON.stringify(generateDemoJobApplications()));

        window.dispatchEvent(new CustomEvent("nexa:demo-data-loaded"));
        showToast("Demo data loaded.", "positive");
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
        loadDemoDataAcrossApp();
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
    sendEmailReminderBtn?.addEventListener("click", () => {
        sendEmailReminderDigest().catch((error) => {
            console.error("Failed to send email reminder digest:", error);
            showToast("Could not send reminder email right now.", "negative");
            syncEmailReminderAction();
        });
    });
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
        control.addEventListener("change", () => {
            saveSingleSystemPreference(control).catch((error) => {
                console.error("Failed to save system preference:", error);
                showToast("Could not save system preference right now.", "negative");
            });
        });
    });
    document.querySelectorAll("[data-system-segmented-pref]").forEach((group) => {
        group.addEventListener("click", (event) => {
            const button = event.target.closest("[data-pref-value]");
            if (!button || !group.contains(button)) return;
            saveSegmentedSystemPreference(group, button.dataset.prefValue);
        });
    });

    setActiveTab("profile", "profile");
    setActiveTab("system", "appearance");
    initialiseThemeSetting();
    populateProfileInputs();
    populateSystemPreferences();
    window.NexaPreferences?.applySensitiveMode?.();
});
