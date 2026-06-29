document.addEventListener("DOMContentLoaded", async () => {
    await window.NexaAppStorage.ready;
    const storage = window.NexaAppStorage;

    /* ==== Elements ==== */
    const subjectsListEl = document.getElementById("subjects-list");
    const addSubjectBtn = document.getElementById("add-subject-btn");

    const subjectBackdrop = document.getElementById("subject-modal-backdrop");
    const subjectModal = document.getElementById("add-subject-modal");
    const subjectModalTitle = document.getElementById("subject-modal-title");
    const subjectNameInput = document.getElementById("subject-name");
    const subjectStatus = document.getElementById("subject-status");

    const cancelSubjectBtn = document.getElementById("cancel-subject-btn");
    const closeSubjectModalBtn = document.getElementById("close-subject-modal-btn");
    const confirmSubjectBtn = document.getElementById("confirm-subject-btn");
    const deleteSubjectBtn = document.getElementById("delete-subject-btn");

    const backdrop = document.getElementById("modal-backdrop");

    /* Add Assignment elements */
    const addAssignmentBtn = document.getElementById("add-assignment-btn");
    const assignmentsBody = document.getElementById("assignments-body");

    const assignmentModal = document.getElementById("add-assignment-modal");
    const assignmentModalTitle = document.getElementById("assignment-modal-title");
    const closeAssignmentModalBtn = document.getElementById("close-assignment-modal-btn");

    const assignmentCourse = document.getElementById("assignment-course");
    const assignmentTask = document.getElementById("assignment-task");
    const assignmentDesc = document.getElementById("assignment-desc");
    const assignmentPriority = document.getElementById("assignment-priority");
    const assignmentStatus = document.getElementById("assignment-status");
    const assignmentDue = document.getElementById("assignment-due");
    const assignmentWeight = document.getElementById("assignment-weight");
    
    const assignmentStatusText = document.getElementById("assignment-status-text");
    const cancelAssignmentBtn = document.getElementById("cancel-assignment-btn");
    const deleteAssignmentBtn = document.getElementById("delete-assignment-btn");
    const confirmAssignmentBtn = document.getElementById("confirm-assignment-btn");
    const viewAssignmentModal = document.getElementById("view-assignment-modal");
    const closeViewAssignmentModalBtn = document.getElementById("close-view-assignment-modal-btn");
    const viewAssignmentTitle = document.getElementById("view-assignment-title");
    const viewAssignmentDesc = document.getElementById("view-assignment-desc");

    const assignmentSortBtns = document.querySelectorAll("[data-assignment-sort]");
    const resetAssignmentsBtn = document.getElementById("reset-btn");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const assignmentRemindersListEl = document.getElementById("assignment-reminders-list");
    const assignmentReminderItemTemplate = document.getElementById("assignment-reminder-item-template");
    const assignmentReminderEmptyTemplate = document.getElementById("assignment-reminder-empty-template");

    const ASSIGNMENTS_KEY = "studenthub_assignments";
    const TASKS_KEY = "tasksByDate";
    let editingAssignmentId = null;

    /* Widget elements */
    let carouselIndex = 0;
    let carouselSubjects = [];

    // Storage
    const STORAGE_KEY = "studenthub_subjects";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const DEFAULT_SEMESTER_LABEL = "Untitled Semester";
    const PIE_ASSIGNMENT_LABEL_MAX = 12;
    const ASSIGNMENT_REMINDERS_LIMIT = 3;
    const DEFAULT_ASSIGNMENT_SORT = { key: "dueDate", direction: "asc" };
    const EMPTY_COPY = {
        assignments: "Add your first assignment and start seeing the workload.",
        subjects: "Add a subject now. Give your work a home.",
        subjectDropdown: "You must add a subject first.",
        filter: "Nothing in this view. Clear the filter to widen the picture.",
        description: "No extra notes yet, Just the useful bits."
    };
    let activeChartFilter = { type: null, value: null };
    let assignmentTableSort = { ...DEFAULT_ASSIGNMENT_SORT };

    function loadSemesterLabel() {
        const saved = storage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : DEFAULT_SEMESTER_LABEL;
    }

    function renderSemesterLabel() {
        const labels = document.querySelectorAll(".semester-label");
        if (!labels.length) return;
        labels.forEach((el) => {
            el.textContent = `${loadSemesterLabel()}`;
        });
    }

    function loadSubjects() {
        try {
            const raw = storage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed)
                ? parsed.filter(s => s && typeof s.id === "string" && typeof s.name === "string")
                : [];
        } catch (e) {
            console.warn("Failed to parse subjects:", e);
            return [];
        }
    }

    function saveSubjects(subjects) {
        storage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    }

    let editingSubjectId = null;
    
    const STATUS_MS = 1500;
    let statusTimer = null;

    function showToast(message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.toast(message, { tone });
            return;
        }

        window.alert(message);
    }

    function confirmAction(options) {
        if (window.NexaFeedback) {
            return window.NexaFeedback.confirm(options);
        }

        return Promise.resolve(window.confirm(options.message || options.title || "Are you sure?"));
    }

    function showInlineNotice(targetEl, message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.notice(targetEl, message, { tone });
            return;
        }

        targetEl.textContent = message;
    }

    function clearSubjectStatus() {
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = null;
        showInlineNotice(subjectStatus, "");
    }

    function showSubjectStatus(message, { closeAfter = false, tone = "neutral" } = {}) {
        if (closeAfter) {
            closeSubjectModal();
            showToast(message, tone);
            return;
        }

        if (statusTimer) clearTimeout(statusTimer);
        showInlineNotice(subjectStatus, message, tone);
        statusTimer = setTimeout(() => {
            clearSubjectStatus();
        }, STATUS_MS);
    }

    function showAssignmentStatus(message, tone = "neutral") {
        showInlineNotice(assignmentStatusText, message, tone);
    }

    function setButtonLabel(button, label) {
        const labelEl = button?.querySelector(".ui-btn-label");
        if (labelEl) {
            labelEl.textContent = label;
            return;
        }
        if (button) button.textContent = label;
    }

    // RENDER
    function renderSubjects(subjects) {
        subjectsListEl.innerHTML = "";

        if (!subjects.length) {
            const li = document.createElement("li");
            li.className = "assignments-soft-empty empty-state-reveal";
            li.textContent = EMPTY_COPY.subjects;
            subjectsListEl.appendChild(li);
            return;
        }

        subjects.forEach((s, idx) => {
            const li = document.createElement("li");
            const btn = document.createElement("button");

            btn.type = "button";
            btn.className = "subject-item" + (idx === 0 ? " active" : "");
            btn.dataset.subjectId = s.id;
            btn.textContent = s.name;

            li.appendChild(btn);
            subjectsListEl.appendChild(li);
        });
    }

    // Modal helpers
    function openSubjectModal() {
        editingSubjectId = null;

        subjectModalTitle.textContent = "ADD SUBJECT";
        setButtonLabel(confirmSubjectBtn, "Add");
        showInlineNotice(subjectStatus, "");
        subjectNameInput.value = "";
        subjectBackdrop.classList.remove("hidden");
        subjectModal.classList.remove("hidden");
        deleteSubjectBtn.classList.add("hidden");
        subjectNameInput.focus();
    }

    function editSubjectModal(subjectId) {
        const subjects = loadSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        editingSubjectId = subjectId;

        subjectModalTitle.textContent = "EDIT SUBJECT";
        setButtonLabel(confirmSubjectBtn, "Save");
        deleteSubjectBtn.classList.remove("hidden");
        showInlineNotice(subjectStatus, "");
        subjectNameInput.value = subject.name;
        subjectBackdrop.classList.remove("hidden");
        subjectModal.classList.remove("hidden");
        subjectNameInput.focus();
    }

    function closeSubjectModal() {
        subjectBackdrop.classList.add("hidden");
        subjectModal.classList.add("hidden");
        showInlineNotice(subjectStatus, "");
    }

    // Widget helpers
    function groupAssignmentsBySubject(assignments) {
        const map = new Map();

        assignments.forEach(a => {
            if (!a || !a.courseId) return;

            if (!map.has(a.courseId)) map.set(a.courseId, []);
            map.get(a.courseId).push(a);
        });
        
        return map;
    }

    // Add subject
    function addSubject() {
        const name = subjectNameInput.value.trim();

        if (!name) {
            showSubjectStatus("Please enter a subject name.", { tone: "negative" });
            return;
        }

        const subjects = loadSubjects();

        // prevents duplicates (case-sensitive)
        const exists = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            showSubjectStatus("That subject already exists.", { tone: "negative" });
            return;
        }

        const now = Date.now();
        const newSubject = {
            id: `subject_${Date.now()}`, 
            name,
            createdAt: now,
            updatedAt: now
        };

        subjects.push(newSubject);
        saveSubjects(subjects);
        refreshSubjectViews();
        showSubjectStatus("Subject added.", { closeAfter: true, tone: "positive" });
    }

    function saveSubjectEdits() {
        if (!editingSubjectId) return;

        const name = subjectNameInput.value.trim();
        if (!name) {
            showSubjectStatus("Subject name is required.", { tone: "negative" });
            return;
        }

        const subjects = loadSubjects();

        const duplicate = subjects.some(
            s => s.id !== editingSubjectId && s.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            showSubjectStatus("That subject already exists.", { tone: "negative" });
            return;
        }

        const idx = subjects.findIndex(s => s.id === editingSubjectId);
        if (idx === -1) return;

        subjects[idx].name = name;
        subjects[idx].updatedAt = Date.now();

        saveSubjects(subjects);
        refreshSubjectViews();
        showSubjectStatus("Subject updated.", { closeAfter: true, tone: "neutral" });
    }

    function deleteSubject() {
        if (!editingSubjectId) return;

        const subjects = loadSubjects().filter(s => s.id !== editingSubjectId);

        saveSubjects(subjects);
        refreshSubjectViews();
        showSubjectStatus("Subject deleted.", { closeAfter: true, tone: "negative" });
    }

    // Add Assignment
    function loadAssignments() {
        try {
            const raw = storage.getItem(ASSIGNMENTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];

            return parsed.filter(a =>
                a &&
                typeof a.id === "string" &&
                typeof a.courseId === "string" &&
                typeof a.task === "string"
            );
        } catch (e) {
            console.warn("Failed to parse assignments:", e);
            return [];
        }
    }

    function saveAssignments(assignments) {
        storage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    }

    function getSubjectWeightingTotal(courseId, excludeAssignmentId = null) {
        return loadAssignments()
            .filter(a => a.courseId === courseId && a.id !== excludeAssignmentId)
            .reduce((total, assignment) => total + (Number(assignment.weighting) || 0), 0);
    }

    function getMissingRequiredAssignmentFields() {
        const missingFields = [];

        if (!assignmentCourse.value) missingFields.push("subject");
        if (!assignmentTask.value.trim()) missingFields.push("task");
        if (!assignmentWeight.value.trim()) missingFields.push("weighting");
        if (!assignmentDue.value) missingFields.push("due date");

        return missingFields;
    }

    function formatDueDate(iso) {
        if (!iso) return "";

        const d = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(d.getTime())) return iso;
    
        const formatted = new Intl.DateTimeFormat("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
        
        const parts = formatted.split(" ");
        if (parts.length === 3) return `${parts[0]} ${parts[1]}, ${parts[2]}`; // e.g., the date should be returned as: 20 March, 2026

        return formatted;
    }

    function getTodayAtNoon() {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    }

    function getDaysUntil(targetDate, fromDate) {
        return Math.round((targetDate - fromDate) / 86400000);
    }

    function normalizeAssignmentStatus(assignment) {
        return (assignment?.status || "not-started").trim().toLowerCase();
    }

    function isReminderAssignmentIncomplete(assignment) {
        return normalizeAssignmentStatus(assignment) !== "completed";
    }

    function getReminderTone(assignment, daysUntil) {
        if (daysUntil < 0 || daysUntil <= 3) return "critical";
        if (daysUntil <= 7) return "important";
        if (daysUntil <= 14) return "watch";
        return "neutral";
    }

    function formatReminderDays(daysUntil) {
        if (daysUntil < 0) return { value: "Overdue", label: "" };
        if (daysUntil === 0) return { value: "0", label: "DAYS" };
        if (daysUntil === 1) return { value: "1", label: "DAY" };
        return { value: String(daysUntil), label: "DAYS" };
    }

    function formatReminderBadge(daysUntil) {
        if (daysUntil < 0) return "Overdue";
        return `${daysUntil}d`;
    }

    function isHighPriorityAssignment(assignment) {
        return (assignment?.priority || "").toLowerCase() === "high";
    }

    function assignmentMatchesChartFilter(assignment) {
        if (!activeChartFilter.type || !activeChartFilter.value) return true;
        if (activeChartFilter.type === "subject") return assignment.courseId === activeChartFilter.value;
        if (activeChartFilter.type === "status") return normalizeAssignmentStatus(assignment) === activeChartFilter.value;
        if (activeChartFilter.type === "priority") return (assignment.priority || "").toLowerCase() === activeChartFilter.value;
        return true;
    }

    function hasActiveFilters() {
        return Boolean(activeChartFilter.type);
    }

    function updateClearFiltersButton() {
        clearFiltersBtn?.classList.toggle("hidden", !hasActiveFilters());
    }

    function clearAssignmentFilters() {
        activeChartFilter = { type: null, value: null };
        renderAssignments();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function getDefaultSortDirection(key) {
        return ["priority", "weighting", "share"].includes(key) ? "desc" : "asc";
    }

    function toggleAssignmentSort(key) {
        const isSameColumn = assignmentTableSort.key === key;
        assignmentTableSort = {
            key,
            direction: isSameColumn
                ? (assignmentTableSort.direction === "asc" ? "desc" : "asc")
                : getDefaultSortDirection(key)
        };
        renderAssignments();
    }

    function renderAssignmentSortButtons() {
        assignmentSortBtns.forEach((btn) => {
            const isActive = btn.dataset.assignmentSort === assignmentTableSort.key;
            btn.classList.toggle("is-active", isActive);
            btn.dataset.sortDirection = isActive ? assignmentTableSort.direction : "none";
            btn.closest("th")?.setAttribute("aria-sort", isActive ? (assignmentTableSort.direction === "asc" ? "ascending" : "descending") : "none");
            btn.setAttribute(
                "aria-label",
                `Sort assignments by ${btn.textContent.trim()} ${isActive && assignmentTableSort.direction === "asc" ? "descending" : "ascending"}`
            );
        });
    }

    function formatWeight(num) {
        if (num === null || num === undefined || num === "") return "";
        const n = Number(num);
        if (!Number.isFinite(n)) return "";
        return n.toFixed(1);
    }

    function wordCount(str) {
        return (str || "").trim().split(/\s+/).filter(Boolean).length;
    }

    function populateCourseOptions() {
        const subjects = loadSubjects(); // uses existing local storage to load subjects in
        assignmentCourse.innerHTML = "";

        if (!subjects.length) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = EMPTY_COPY.subjectDropdown;
            assignmentCourse.appendChild(opt);
            assignmentCourse.disabled = true;
            return;
        }

        assignmentCourse.disabled = false;

        subjects.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            assignmentCourse.appendChild(opt);
        });
    }

    function parseISODate(iso) {
        if (!iso) return null;
        const d = new Date(`${iso}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function priorityRank(p) {
        return p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0;
    }

    function statusRank(status) {
        const normalized = (status || "").toLowerCase();
        if (normalized === "not-started") return 1;
        if (normalized === "in-progress") return 2;
        if (normalized === "completed") return 3;
        return 4;
    }

    function calculateSubjectTotals(assignments) {
        const totals = new Map();

        assignments.forEach(a => {
            const w = Number(a.weighting);
            if (!Number.isFinite(w)) return;

            const current = totals.get(a.courseId) || 0;
            totals.set(a.courseId, current + w);
        });

        return totals;
    }

    function getAssignmentShareValue(assignment, subjectTotals) {
        const totalForSubject = subjectTotals.get(assignment.courseId) || 0;
        const weighting = Number(assignment.weighting);
        if (!Number.isFinite(weighting) || totalForSubject <= 0) return null;
        return (weighting / totalForSubject) * 100;
    }

    function compareNullable(a, b, direction) {
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        return direction === "asc" ? a - b : b - a;
    }

    function compareAssignmentRows(a, b, subjectNameById, subjectTotals) {
        const direction = assignmentTableSort.direction;
        const textDirection = direction === "asc" ? 1 : -1;

        switch (assignmentTableSort.key) {
            case "course":
                return textDirection * (subjectNameById.get(a.courseId) || "(Deleted subject)").localeCompare(subjectNameById.get(b.courseId) || "(Deleted subject)");
            case "task":
                return textDirection * (a.task || "").localeCompare(b.task || "");
            case "priority":
                return direction === "asc"
                    ? priorityRank(a.priority) - priorityRank(b.priority)
                    : priorityRank(b.priority) - priorityRank(a.priority);
            case "status":
                return direction === "asc"
                    ? statusRank(a.status) - statusRank(b.status)
                    : statusRank(b.status) - statusRank(a.status);
            case "weighting":
                return compareNullable(Number.isFinite(Number(a.weighting)) ? Number(a.weighting) : null, Number.isFinite(Number(b.weighting)) ? Number(b.weighting) : null, direction);
            case "share":
                return compareNullable(getAssignmentShareValue(a, subjectTotals), getAssignmentShareValue(b, subjectTotals), direction);
            case "dueDate":
            default:
                return compareNullable(parseISODate(a.dueDate)?.getTime() ?? null, parseISODate(b.dueDate)?.getTime() ?? null, direction);
        }
    }

    function getAssignmentRowClasses(assignment) {
        const classes = [];
        const status = normalizeAssignmentStatus(assignment);
        const dueDateObj = parseISODate(assignment.dueDate);
        const priority = (assignment.priority || "unknown").toLowerCase();

        classes.push(`is-status-${status}`);
        classes.push(`is-priority-${priority}`);

        if (priority === "high") classes.push("is-urgent-priority");

        if (dueDateObj && status !== "completed") {
            const daysUntil = getDaysUntil(dueDateObj, getTodayAtNoon());
            if (daysUntil < 0) classes.push("is-overdue");
            else if (daysUntil <= 3) classes.push("is-due-soon");
        }

        return classes;
    }

    function renderAssignments() {
        const allAssignments = loadAssignments();
        let assignments = [...allAssignments];
        assignmentsBody.innerHTML = "";

        // Chart filters stack on top of the base table data without touching header sort state.
        assignments = assignments.filter(assignmentMatchesChartFilter);

        const subjects = loadSubjects();
        const subjectNameById = new Map(subjects.map(s => [s.id, s.name]));

        const subjectTotals = calculateSubjectTotals(allAssignments);
        assignments.sort((a, b) => {
            const primary = compareAssignmentRows(a, b, subjectNameById, subjectTotals);
            if (primary !== 0) return primary;
            return (a.task || "").localeCompare(b.task || "");
        });
        renderAssignmentSortButtons();

        if (!assignments.length) {
            const tr = document.createElement("tr");
            tr.className = "assignments-empty-row";
            const td = document.createElement("td");
            td.colSpan = 7;
            td.className = "empty-state-reveal";
            td.textContent = allAssignments.length ? EMPTY_COPY.filter : EMPTY_COPY.assignments;
            tr.appendChild(td);
            assignmentsBody.appendChild(tr);
            updateClearFiltersButton();
            return;
        }
        
        assignments.forEach(a => {
            const tr = document.createElement("tr");
            tr.dataset.assignmentId = a.id;
            tr.classList.add(...getAssignmentRowClasses(a));
            const courseName = subjectNameById.get(a.courseId) || "(Deleted subject)";
            const shareValue = getAssignmentShareValue(a, subjectTotals);
            const priority = (a.priority || "").toLowerCase();

            const shareText = shareValue === null ? "" : `${shareValue.toFixed(1)}%`;

            tr.innerHTML = `
                <td>${courseName}</td>
                <td>${a.task}</td>
                <td><span class="assignment-priority-pill is-${priority || "unknown"}">${priorityLabel(a.priority)}</span></td>
                <td>${statusLabel(normalizeAssignmentStatus(a))}</td>
                <td>${formatDueDate(a.dueDate)}</td>
                <td>${formatWeight(a.weighting)}</td>
                <td>${shareText}</td>
            `;

            assignmentsBody.appendChild(tr);
        });

        updateClearFiltersButton();
    }

    function renderAssignmentReminders() {
        if (!assignmentRemindersListEl) return;

        const today = getTodayAtNoon();
        const subjects = loadSubjects();
        const subjectNameById = new Map(subjects.map(s => [s.id, s.name]));

        const reminders = loadAssignments()
            .map((assignment) => ({
                ...assignment,
                dueDateObj: parseISODate(assignment.dueDate)
            }))
            .filter((assignment) => {
                if (!assignment || !assignment.dueDateObj || !isReminderAssignmentIncomplete(assignment)) return false;

                const daysUntil = getDaysUntil(assignment.dueDateObj, today);
                return daysUntil < 0 || daysUntil <= 14 || (isHighPriorityAssignment(assignment) && daysUntil <= 30);
            })
            .sort((a, b) => {
                const dueDateDiff = a.dueDateObj - b.dueDateObj;
                if (dueDateDiff !== 0) return dueDateDiff;

                const prioDiff = priorityRank(b.priority) - priorityRank(a.priority);
                if (prioDiff !== 0) return prioDiff;

                return (b.createdAt || 0) - (a.createdAt || 0);
            })
            .slice(0, ASSIGNMENT_REMINDERS_LIMIT);

        assignmentRemindersListEl.innerHTML = "";

        if (!reminders.length) {
            if (!assignmentReminderEmptyTemplate) return;
            assignmentRemindersListEl.appendChild(
                assignmentReminderEmptyTemplate.content.firstElementChild.cloneNode(true)
            );
            return;
        }

        reminders.forEach((assignment) => {
            if (!assignmentReminderItemTemplate) return;

            const item = assignmentReminderItemTemplate.content.firstElementChild.cloneNode(true);
            const linkEl = item.querySelector(".assignment-reminder-link");
            const daysValueEl = item.querySelector(".assignment-reminder-days-value");
            const daysLabelEl = item.querySelector(".assignment-reminder-days-label");
            const taskEl = item.querySelector(".assignment-reminder-task");
            const subjectEl = item.querySelector(".assignment-reminder-subject");
            const metaEl = item.querySelector(".assignment-reminder-meta");
            const daysUntil = getDaysUntil(assignment.dueDateObj, today);
            const tone = getReminderTone(assignment, daysUntil);

            item.classList.add(`is-${tone}`);
            if (linkEl) {
                linkEl.dataset.assignmentId = assignment.id;
                linkEl.setAttribute(
                    "aria-label",
                    `${assignment.task || "Assignment"}, due in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`
                );
            }
            if (daysValueEl) daysValueEl.textContent = formatReminderBadge(daysUntil);
            if (daysLabelEl) daysLabelEl.textContent = "";
            if (taskEl) taskEl.textContent = (assignment.task || "").trim() || "Assignment";
            if (subjectEl) subjectEl.textContent = subjectNameById.get(assignment.courseId) || "Unknown subject";
            if (metaEl) {
                metaEl.textContent = `${priorityLabel(assignment.priority)} priority - due ${formatDueDate(assignment.dueDate)}`;
            }

            assignmentRemindersListEl.appendChild(item);
        });
    }

    function openAssignmentModalAdd() {
        editingAssignmentId = null;

        populateCourseOptions();

        assignmentModalTitle.textContent = "ADD ASSIGNMENT";
        setButtonLabel(confirmAssignmentBtn, "Add");
        deleteAssignmentBtn.classList.add("hidden");
        showAssignmentStatus("");

        assignmentTask.value = "";
        assignmentDesc.value = "";
        assignmentPriority.value = "medium";
        assignmentStatus.value = "not-started";
        assignmentDue.value = "";
        assignmentWeight.value = "";

        backdrop.classList.remove("hidden");
        assignmentModal.classList.remove("hidden");
        assignmentTask.focus();
    }

    function openAssignmentModalEdit(assignmentId) {
        const assignments = loadAssignments();
        const a = assignments.find(x => x.id === assignmentId);
        if (!a) return;

        editingAssignmentId = assignmentId;

        populateCourseOptions();

        assignmentModalTitle.textContent = "EDIT ASSIGNMENT";
        setButtonLabel(confirmAssignmentBtn, "Save");
        deleteAssignmentBtn.classList.remove("hidden");
        showAssignmentStatus("");

        assignmentCourse.value = a.courseId || "";
        assignmentTask.value = a.task || "";
        assignmentDesc.value = a.description || "";
        assignmentPriority.value = a.priority || "medium";
        assignmentStatus.value = a.status || "not-started";
        assignmentDue.value = a.dueDate || "";
        assignmentWeight.value = (a.weighting ?? "");

        backdrop.classList.remove("hidden");
        assignmentModal.classList.remove("hidden");
    }

    function closeAssignmentModal() {
        assignmentModal.classList.add("hidden");
        showAssignmentStatus("");
        backdrop.classList.add("hidden");
    }

    function openViewAssignmentModal(assignment) {
        if (!viewAssignmentModal || !viewAssignmentTitle || !viewAssignmentDesc) return;

        const taskName = (assignment?.task || "").trim() || "Assignment";
        const description = (assignment?.description || "").trim() || EMPTY_COPY.description;

        viewAssignmentTitle.textContent = taskName;
        viewAssignmentDesc.textContent = description;

        backdrop.classList.remove("hidden");
        viewAssignmentModal.classList.remove("hidden");
    }

    function closeViewAssignmentModal() {
        if (!viewAssignmentModal) return;
        viewAssignmentModal.classList.add("hidden");
    }

    function openAssignmentFromHomeWidget() {
        const params = new URLSearchParams(window.location.search);
        const assignmentId = params.get("assignmentId");
        if (!assignmentId) return;

        // From my POV, if the user came here from the home page widget,
        // I want to open the exact assignment they clicked straight away.
        openAssignmentModalEdit(assignmentId);
        window.history.replaceState({}, "", window.location.pathname);
    }

    function addAssignment() {
        if (assignmentCourse.disabled) {
            showAssignmentStatus("Add a subject first.", "negative");
            return;
        }

        const missingFields = getMissingRequiredAssignmentFields();
        if (missingFields.length === 1) {
            showAssignmentStatus(`You must enter a ${missingFields[0]} before saving this assignment.`, "negative");
            return;
        }

        if (missingFields.length > 1) {
            showAssignmentStatus(`You must enter the following before saving this assignment: ${missingFields.join(", ")}.`, "negative");
            return;
        }

        const task = assignmentTask.value.trim();
        const desc = assignmentDesc.value.trim();
        if (wordCount(desc) > 500) {
            showAssignmentStatus("Description exceeds 500 words. Please enter less characters.", "negative");
            return;
        }
        
        const weightRaw = assignmentWeight.value.trim();
        const weighting = weightRaw === "" ?  null : Number(weightRaw);
        if (weighting !== null && !Number.isFinite(weighting)) {
            showAssignmentStatus("Weighting must be a number.", "negative");
            return;
        }

        const currentSubjectTotal = getSubjectWeightingTotal(assignmentCourse.value);
        if (weighting !== null) {
            const remaining = Math.max(0, 100 - currentSubjectTotal);

            if (remaining === 0) {
                showAssignmentStatus("This subject already has 100% allocated. No more assignments can be added.", "negative");
                return;
            } else if (currentSubjectTotal + weighting > 100) {
                showAssignmentStatus(`This subject already has ${currentSubjectTotal}% allocated. You can only add up to ${remaining}% more.`, "negative");
                return;
            }
        }

        const now = Date.now();
        const assignments = loadAssignments();

        const newAssignment = {
            id: `assignment_${now}`,
            courseId: assignmentCourse.value,
            task,
            description: desc,
            priority: assignmentPriority.value,
            status: assignmentStatus.value,
            dueDate: assignmentDue.value,
            weighting,
            createdAt: now,
            updatedAt: now
        };

        assignments.push(newAssignment);
        saveAssignments(assignments);
        refreshAssignmentViews();
        closeAssignmentModal();
        showToast("Assignment added.", "positive");
    }

    function saveAssignmentEdits() {
        if (!editingAssignmentId) return;

        const missingFields = getMissingRequiredAssignmentFields();
        if (missingFields.length === 1) {
            showAssignmentStatus(`You must enter a ${missingFields[0]} before saving this assignment.`, "negative");
            return;
        }

        if (missingFields.length > 1) {
            showAssignmentStatus(`You must enter the following before saving this assignment: ${missingFields.join(", ")}.`, "negative");
            return;
        }

        const task = assignmentTask.value.trim();
        const desc = assignmentDesc.value.trim();
        if (wordCount(desc) > 500) {
            showAssignmentStatus("Description exceeds 500 words. Please enter less characters.", "negative");
            return;
        }
        
        const weightRaw = assignmentWeight.value.trim();
        const weighting = weightRaw === "" ? null : Number(weightRaw);
        if (weighting !== null && !Number.isFinite(weighting)) {
            showAssignmentStatus("Weighting must be a number.", "negative");
            return;
        }

        const assignments = loadAssignments();
        const idx = assignments.findIndex(a => a.id === editingAssignmentId);
        if (idx === -1) return;

        const currentSubjectTotal = getSubjectWeightingTotal(assignmentCourse.value, editingAssignmentId);
        if (weighting !== null && currentSubjectTotal + weighting > 100) {
            // From my POV, when editing I need to ignore this assignment's current weight,
            // so the user can keep or reduce it without being blocked unfairly.
            showAssignmentStatus(`This subject already has ${currentSubjectTotal}% allocated outside this assignment. You can only set this assignment up to ${Math.max(0, 100 - currentSubjectTotal)}%.`, "negative");
            return;
        }

        assignments[idx] = {
            ...assignments[idx],
            courseId: assignmentCourse.value,
            task,
            description: desc,
            priority: assignmentPriority.value,
            status: assignmentStatus.value,
            dueDate: assignmentDue.value,
            weighting,
            updatedAt: Date.now()
        };

        saveAssignments(assignments);
        refreshAssignmentViews();
        closeAssignmentModal();
        showToast("Assignment updated.", "neutral");
    }

    function deleteAssignment() {
        if (!editingAssignmentId) return;
        const assignments = loadAssignments().filter(a => a.id !== editingAssignmentId);
        saveAssignments(assignments);
        refreshAssignmentViews();
        closeAssignmentModal();
        showToast("Assignment deleted.", "negative");
    }

    async function resetAllAssignments() {
        const assignments = loadAssignments();
        if (!assignments.length) {
            showToast("No assignments to reset.", "neutral");
            return;
        }

        const confirmed = await confirmAction({
            title: "Reset assignments?",
            message: "This will permanently delete every assignment in the table.",
            tone: "negative",
            confirmLabel: "Reset",
            cancelLabel: "Cancel"
        });
        if (!confirmed) return;

        storage.removeItem(ASSIGNMENTS_KEY);
        editingAssignmentId = null;
        activeChartFilter = { type: null, value: null };
        assignmentTableSort = { ...DEFAULT_ASSIGNMENT_SORT };

        closeAssignmentModal();
        refreshAssignmentViews();
        showToast("Assignments reset.", "negative");
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(list) {
        return list[randomInt(0, list.length - 1)];
    }

    function formatISODate(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function handleAppDataReset() {
        editingAssignmentId = null;
        editingSubjectId = null;

        if (subjectModal && !subjectModal.classList.contains("hidden")) {
            closeSubjectModal();
        }
        closeViewAssignmentModal();
        refreshSubjectViews();
        renderSemesterLabel();
        renderDashboard();
        updateSubjectsOverflowHint();
    }

    function generateDemoAssignmentsData() {
        const subjectPool = [
            "Introduction to (University Studies)",
            "Research Methods",
            "Critical Thinking",
            "Professional Practice",
            "Global Perspectives",
            "Contemporary Issues",
            "Applied Studies",
            "Ethics and Society",
            "Global Perspectives",
            "Principles of Communication",
            "Statistics",
            "Academic Writing",
            "Business Fundamentals"
        ];
        const taskPool = [
            "Quiz",
            "Lab Report",
            "Case Study",
            "Team Presentation",
            "Project Milestone",
            "Final Exam",
            "Reflection",
            "Research Summary",
            "Project Report",
            "Group Presentation",
            "Research Paper",
            "Reflection Journal",
            "Literature Review"
        ];
        const descPool = [
            "Summarise the key concepts and support your ideas with references.",
            "Apply the weekly material to analyse the given scenario.",
            "Work with your group to deveop and present your findings.",
            "Demonstrate your understanding of the topic through clear examples.",
            "Use credible sources to support your arguments.",
            "Structure your work clearly and reference all sources",
            "Focus on the main themes discussed during the semester.",
            "Provide a concise explanation of your reasoning."
        ];
        const priorities = ["low", "medium", "high"];
        const statuses = ["not-started", "in-progress", "completed"];
        const now = Date.now();
        const today = new Date();
        const subjectCount = randomInt(4, 5);
        const subjects = [];
        const assignments = [];

        const shuffledSubjects = [...subjectPool].sort(() => Math.random() - 0.5).slice(0, subjectCount);

        shuffledSubjects.forEach((name, subjectIndex) => {
            const subjectId = `subject_demo_${now}_${subjectIndex}`;
            subjects.push({
                id: subjectId,
                name,
                createdAt: now - subjectIndex * 1000,
                updatedAt: now - subjectIndex * 1000
            });

            const assignmentCount = randomInt(1, 5);
            const weightingTemplates = {
                1: [
                    [100]
                ],
                2: [
                    [50, 50],
                    [40, 60],
                    [30, 70]
                ],
                3: [
                    [20, 30, 50],
                    [25, 25, 50],
                    [30, 30, 40],
                    [20, 40, 40]
                ],
                4: [
                    [25, 25, 25, 25],
                    [20, 20, 20, 40],
                    [10, 20, 30, 40],
                    [15, 20, 25, 40]
                ],
                5: [
                    [10, 15, 20, 25, 30],
                    [10, 20, 20, 20, 30],
                    [15, 15, 20, 25, 25],
                    [10, 10, 20, 30, 30]
                ]
            };

            function shuffleArray(arr) {
                return [...arr].sort(() => Math.random() - 0.5);
            }

            function pickWeightings(count) {
                const templates = weightingTemplates[count];
                const chosen = pick(templates);
                return shuffleArray(chosen);
            }

            const weightings = pickWeightings(assignmentCount);

            for (let i = 0; i < assignmentCount; i += 1) {
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + randomInt(2, 120));
                const taskType = pick(taskPool);

                assignments.push({
                    id: `assignment_demo_${now}_${subjectIndex}_${i}`,
                    courseId: subjectId,
                    task: `${taskType} ${i + 1}`,
                    description: pick(descPool),
                    priority: pick(priorities),
                    status: pick(statuses),
                    dueDate: formatISODate(dueDate),
                    weighting: Number(weightings[i].toFixed(1)),
                    createdAt: now - randomInt(0, 10) * 86400000,
                    updatedAt: now - randomInt(0, 3) * 3600000
                });
            }
        });

        return { subjects, assignments };
    }

    function loadDemoAssignmentsData() {
        const demo = generateDemoAssignmentsData();
        storage.setItem(STORAGE_KEY, JSON.stringify(demo.subjects));
        storage.setItem(ASSIGNMENTS_KEY, JSON.stringify(demo.assignments));
        storage.setItem(USER_NAME_KEY, "Demo Student");
        storage.setItem(SEMESTER_KEY, DEFAULT_SEMESTER_LABEL);

        editingAssignmentId = null;
        editingSubjectId = null;
        refreshSubjectViews();
        renderSemesterLabel();
        renderDashboard();
        updateSubjectsOverflowHint();
    }

    // Widget FUNCTIONS
    function createPieSVG(assignmentsForSubject) {
        const cssPieSize = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--pie-size")
        );
        const size = Number.isFinite(cssPieSize) && cssPieSize > 0 ? cssPieSize : 160;
        const radius = size / 2;
        const svgNS = "http://www.w3.org/2000/svg";

        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";

        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

        const validAssignments = (assignmentsForSubject || []).filter(a => a && typeof a.task === "string");
        if (!validAssignments.length) {
            const msg = document.createElement("div");
            msg.className = "assignments-soft-empty empty-state-reveal";
            msg.textContent = EMPTY_COPY.assignments;
            msg.style.fontSize = "12px";
            msg.style.opacity = "0.8";
            wrapper.appendChild(msg);
            return wrapper;
        }

        const slices = validAssignments.map((a, index) => {
            const rawWeight = Number(a.weighting);
            return {
                assignment: a,
                index,
                rawWeight: Number.isFinite(rawWeight) && rawWeight >= 0 ? rawWeight : 0
            };
        });

        const totalWeight = slices.reduce((sum, s) => sum + s.rawWeight, 0);
        const equalShare = totalWeight <= 0 ? 1 / slices.length : 0;

        let startAngle = 0;

        slices.forEach((slice) => {
            const ratio = totalWeight > 0 ? (slice.rawWeight / totalWeight) : equalShare;
            const sliceAngle = ratio * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            const hue = (slice.index * 60) % 360;
            const pct = ratio * 100;
            const midAngle = startAngle + sliceAngle / 2;

            const isFullCircle = sliceAngle >= (2 * Math.PI - 1e-6);

            if (isFullCircle) {
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", radius);
                circle.setAttribute("cy", radius);
                circle.setAttribute("r", radius);
                // Intentional chart colour: generated per slice, not tokenised.
                circle.setAttribute("fill", `hsl(${hue}, 70%, 55%)`);
                circle.classList.add("pie-slice");
                circle.addEventListener("click", () => openViewAssignmentModal(slice.assignment));
                svg.appendChild(circle);
            } else {
                const x1 = radius + radius * Math.cos(startAngle);
                const y1 = radius + radius * Math.sin(startAngle);
                const x2 = radius + radius * Math.cos(endAngle);
                const y2 = radius + radius * Math.sin(endAngle);
                const largeArc = sliceAngle > Math.PI ? 1 : 0;

                const path = document.createElementNS(svgNS, "path");
                path.setAttribute(
                    "d",
                    `M ${radius} ${radius}
                    L ${x1} ${y1}
                    A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                    Z`
                );
                // Intentional chart colour: generated per slice, not tokenised.
                path.setAttribute("fill", `hsl(${hue}, 70%, 55%)`);
                path.classList.add("pie-slice");
                path.addEventListener("click", () => openViewAssignmentModal(slice.assignment));
                svg.appendChild(path);
            }

            // Label inside each slice: task + weighting %
            const labelRadius = radius * 0.62;
            const tx = isFullCircle ? radius : radius + Math.cos(midAngle) * labelRadius;
            const ty = isFullCircle ? radius : radius + Math.sin(midAngle) * labelRadius;

            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("x", tx);
            label.setAttribute("y", ty);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.classList.add("pie-label");

            const fullTaskName = (slice.assignment.task || "Task").trim() || "Task";
            const title = document.createElementNS(svgNS, "title");
            title.textContent = fullTaskName;
            label.appendChild(title);

            const line1 = document.createElementNS(svgNS, "tspan");
            line1.setAttribute("x", tx);
            line1.setAttribute("dy", "-0.45em");
            line1.textContent = truncatePieAssignmentLabel(fullTaskName);

            const line2 = document.createElementNS(svgNS, "tspan");
            line2.setAttribute("x", tx);
            line2.setAttribute("dy", "1.2em");
            line2.textContent = `${pct.toFixed(1)}%`;

            label.appendChild(line1);
            label.appendChild(line2);
            svg.appendChild(label);

            startAngle = endAngle;
        });

        wrapper.appendChild(svg);
        return wrapper;
    }

    function truncatePieAssignmentLabel(value) {
        const text = (value || "Task").trim() || "Task";
        if (text.length <= PIE_ASSIGNMENT_LABEL_MAX) return text;

        return `${text.slice(0, PIE_ASSIGNMENT_LABEL_MAX - 3).trimEnd()}...`;
    }

    function renderCarousel() {
        const subjectEl = document.getElementById("carousel-subject");
        const slideEl = document.getElementById("carousel-slide");
        const dotsEl = document.getElementById("carousel-dots");
        if (!subjectEl || !slideEl || !dotsEl) return;

        slideEl.innerHTML = "";
        dotsEl.innerHTML = "";
        subjectEl.textContent = "";

        if (!carouselSubjects.length) {
            slideEl.innerHTML = "";
            const msg = document.createElement("div");
            msg.className = "assignments-soft-empty empty-state-reveal";
            msg.textContent = EMPTY_COPY.assignments;
            slideEl.appendChild(msg);
            return;
        }

        if (carouselIndex >= carouselSubjects.length) carouselIndex = 0;
        if (carouselIndex < 0 || carouselIndex >= carouselSubjects.length) carouselIndex = 0;

        const current = carouselSubjects[carouselIndex];
        subjectEl.textContent = current.name;
        slideEl.appendChild(
            createPieSVG(current.assignments)
        );

        carouselSubjects.forEach((_, i) => {
            const dot = document.createElement("span");
            if (i === carouselIndex) dot.classList.add("active");
            dotsEl.appendChild(dot);
        });
    }

    function rebuildCarousel() {
        const currentSubjectId = carouselSubjects[carouselIndex]?.id || null;
        const assignments = loadAssignments();
        const subjects = loadSubjects();
        const grouped = groupAssignmentsBySubject(assignments);

        carouselSubjects = [];

        subjects.forEach(s => {
            const list = grouped.get(s.id) || [];
            
            if (!list.length) return;

            carouselSubjects.push({
                id: s.id,
                name: s.name,
                assignments: list
            });
        });

        const preservedIndex = carouselSubjects.findIndex(s => s.id === currentSubjectId);
        carouselIndex = preservedIndex >= 0 ? preservedIndex : 0;
        renderCarousel();
    }

    function refreshAssignmentViews() {
        renderAssignments();
        renderAssignmentReminders();
        rebuildCarousel();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function refreshSubjectViews() {
        renderSubjects(loadSubjects());
        populateCourseOptions();
        renderAssignments();
        renderAssignmentReminders();
        rebuildCarousel();
        renderTotalCourseAssignmentsWidget();
    }

    function getSubjectColour(i) {
        // Intentional chart colours: no approved token mapping for this generated palette.
        const palette = [
            "hsl(210, 70%, 55%)",
            "hsl(120, 70%, 50%)",
            "hsl(40, 100%, 50%)",
            "hsl(290, 65%, 60%)",
            "hsl(0, 75%, 60%)",
            "hsl(180, 65%, 45%)"
        ];
        return palette[i % palette.length];
        }

        function countAssignmentsBySubject(assignments) {
        const counts = new Map();
        assignments.forEach(a => {
            if (!a || !a.courseId) return;
            counts.set(a.courseId, (counts.get(a.courseId) || 0) + 1);
        });
        return counts;
        }

    function getPercentageText(count, total) {
        if (!total) return "0.0%";
        return `${((count / total) * 100).toFixed(1)}%`;
    }

    function getClosestUpcomingAssignment(assignments) {
        const today = getTodayAtNoon();

        return assignments
            .map((assignment) => ({
                ...assignment,
                dueDateObj: parseISODate(assignment.dueDate)
            }))
            .filter((assignment) => assignment.dueDateObj && assignment.dueDateObj >= today)
            .sort((a, b) => {
                const dueDateDiff = a.dueDateObj - b.dueDateObj;
                if (dueDateDiff !== 0) return dueDateDiff;
                return priorityRank(b.priority) - priorityRank(a.priority);
            })[0] || null;
    }

    function addChartTooltip(targetEl, details) {
        if (!targetEl) return;

        const tooltip = document.createElement("div");
        tooltip.className = "chart-tooltip";

        const title = document.createElement("div");
        title.className = "chart-tooltip-title";
        title.textContent = details.label;
        tooltip.appendChild(title);

        details.lines.forEach((text) => {
            const line = document.createElement("div");
            line.className = "chart-tooltip-line";
            line.textContent = text;
            tooltip.appendChild(line);
        });

        targetEl.appendChild(tooltip);
    }

    function toggleChartFilter(type, value) {
        const isSameFilter = activeChartFilter.type === type && activeChartFilter.value === value;
        activeChartFilter = isSameFilter ? { type: null, value: null } : { type, value };
        renderAssignments();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function isActiveChartFilter(type, value) {
        return activeChartFilter.type === type && activeChartFilter.value === value;
    }

    function renderTotalCourseAssignmentsWidget() {
        const barsEl = document.getElementById("total-assignments-bars");
        const legendEl = document.getElementById("total-assignments-legend");
        const maxEl = document.getElementById("total-assignments-max");
        if (!barsEl || !legendEl) return;

        const subjects = loadSubjects();
        const assignments = loadAssignments();
        const counts = countAssignmentsBySubject(assignments);
        const totalAssignments = assignments.length;

        // build rows (keep only subjects that exist)
        const rows = subjects.map((s, idx) => ({
            id: s.id,
            name: s.name,
            count: counts.get(s.id) || 0,
            colour: getSubjectColour(idx)
        }));

        // choose axis max: fixed 6 (as you requested), but auto-expand if user exceeds it
        const maxCount = Math.max(6, ...rows.map(r => r.count));
        if (maxEl) maxEl.textContent = String(maxCount);

        barsEl.innerHTML = "";
        legendEl.innerHTML = "";

        if (!rows.length) {
            barsEl.innerHTML = "";
            const msg = document.createElement("div");
            msg.className = "assignments-soft-empty empty-state-reveal";
            msg.textContent = EMPTY_COPY.subjects;
            barsEl.appendChild(msg);
            return;
        }

        // OPTIONAL: you can sort by count desc for readability
        rows.sort((a, b) => b.count - a.count);

        rows.forEach(r => {
            const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;

            const row = document.createElement("div");
            row.className = "bar-row";
            row.dataset.chartFilterType = "subject";
            row.dataset.chartFilterValue = r.id;
            row.setAttribute("role", "button");
            row.setAttribute("tabindex", "0");
            row.setAttribute("aria-label", `Filter assignments by ${r.name}`);
            row.classList.toggle("active-chart-filter", isActiveChartFilter("subject", r.id));

            row.innerHTML = `
            <div class="bar-label">${r.name}</div>
            <div class="bar-trackline">
                <div class="bar-track">
                <div class="bar-fill"></div>
                </div>
                <div class="bar-count">${r.count}</div>
            </div>
            `;

            const fill = row.querySelector(".bar-fill");
            fill.style.width = `${pct}%`;
            fill.style.background = r.colour;

            const subjectAssignments = assignments.filter((assignment) => assignment.courseId === r.id);
            const nextAssignment = getClosestUpcomingAssignment(subjectAssignments);
            addChartTooltip(row, {
                label: r.name,
                lines: [
                    `${getPercentageText(r.count, totalAssignments)} of total course assignments`,
                    `Next: ${nextAssignment?.task || "No upcoming assignment"}`,
                    `Due: ${nextAssignment ? formatDueDate(nextAssignment.dueDate) : "N/A"}`
                ]
            });

            row.addEventListener("click", () => toggleChartFilter("subject", r.id));
            row.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleChartFilter("subject", r.id);
            });

            barsEl.appendChild(row);

            // legend item
            const item = document.createElement("div");
            item.className = "legend-item";
            item.innerHTML = `
            <span class="legend-swatch"></span>
            <span>${r.name}</span>
            `;
            item.querySelector(".legend-swatch").style.background = r.colour;
            legendEl.appendChild(item);
        });
    }

    /* ===== Assignments Dashboard (Status/Priority slides) ===== */
    let dashIndex = 0;
    const dashSlides = ["status", "priority"];

    // Swipe configuration (Assessment weightings + Assignment Dashboard cards for now):
    const SWIPE_X_THRESHOLD = 45; // Minimum horizontal swipe distance before we treat a gesture as intentional navigation

    function statusLabel(s) {
    // stored values are: not-started, in-progress, completed
    if (s === "not-started") return "Not started";
    if (s === "in-progress") return "In progress";
    if (s === "completed") return "Completed";
    return "Other";
    }

    function priorityLabel(s) {
    // stored values are: not-started, in-progress, completed
    if (s === "low") return "Low";
    if (s === "medium") return "Medium";
    if (s === "high") return "High";
    return "Other";
    }

    function buildStatusCounts(assignments) {
    const counts = new Map([
        ["not-started", 0],
        ["in-progress", 0],
        ["completed", 0],
    ]);

    assignments.forEach(a => {
        const key = (a?.status || "").toLowerCase();
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
        else counts.set("other", (counts.get("other") || 0) + 1);
    });

    // remove "other" if unused
    if ((counts.get("other") || 0) === 0) counts.delete("other");
    return counts;
    }

    function buildPriorityCounts(assignments) {
    const counts = new Map([
        ["low", 0],
        ["medium", 0],
        ["high", 0],
    ]);

    assignments.forEach(a => {
        const key = (a?.priority || "").toLowerCase();
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
        else counts.set("other", (counts.get("other") || 0) + 1);
    });

    // remove "other" if unused
    if ((counts.get("other") || 0) === 0) counts.delete("other");
    return counts;
    }

    function coloursForStatus(key) {
    if (key === "completed") return "var(--color-status-complete)";
    if (key === "in-progress") return "var(--color-status-progress)";
    if (key === "not-started") return "var(--color-status-danger)";
    return "var(--grey-status)";
    }

    function coloursForPriority(key) {
    if (key === "low") return "var(--color-status-complete)";
    if (key === "medium") return "var(--color-status-progress)";
    if (key === "high") return "var(--color-status-danger)";
    return "var(--grey-status)";
    }

    function dashboardTooltipNote(filterType, key) {
    if (filterType === "status") {
        if (key === "not-started") return "Worth starting soon.";
        if (key === "in-progress") return "Keep the momentum going.";
        if (key === "completed") return "Done and dusted.";
    }

    if (filterType === "priority") {
        if (key === "low") return "Low pressure, still worth tracking.";
        if (key === "medium") return "Keep this on your radar.";
        if (key === "high") return "Needs attention soon.";
    }

    return "";
    }

    function createVerticalBarChart({ title, countsMap, colourFn, labelFn, filterType = null, assignments = [], assignmentFilterFn = null }) {
    const wrapper = document.createElement("div");
    wrapper.className = "vchart";

    const plot = document.createElement("div");
    plot.className = "vchart-plot";

    const entries = Array.from(countsMap.entries());
    const max = Math.max(1, ...entries.map(([, v]) => v)); // avoid divide by zero

    entries.forEach(([key, val]) => {
        const col = document.createElement("div");
        col.className = "vbar-column";
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.alignItems = "center";
        col.style.gap = "0";

        const bar = document.createElement("div");
        bar.className = "vbar";
        if (filterType) {
            bar.classList.toggle("active-chart-filter", isActiveChartFilter(filterType, key));
            bar.dataset.chartFilterType = filterType;
            bar.dataset.chartFilterValue = key;
            bar.setAttribute("role", "button");
            bar.setAttribute("tabindex", "0");
            bar.setAttribute("aria-label", `Filter assignments by ${labelFn(key)}`);
        }

        const fill = document.createElement("div");
        fill.className = "vbar-fill";
        fill.style.setProperty("--h", `${(val / max) * 100}%`);
        fill.style.setProperty("background", colourFn(key), "important");

        const count = document.createElement("div");
        count.className = "vbar-count";
        count.textContent = String(val);

        bar.appendChild(fill);
        bar.appendChild(count);
        col.appendChild(bar);

        const matchingAssignments = typeof assignmentFilterFn === "function"
            ? assignments.filter((assignment) => assignmentFilterFn(assignment, key))
            : [];
        const nextAssignment = getClosestUpcomingAssignment(matchingAssignments);
        addChartTooltip(col, {
            label: labelFn(key),
            lines: [
                `${getPercentageText(val, assignments.length)} of total assignments`,
                dashboardTooltipNote(filterType, key),
                `Next: ${nextAssignment?.task || "No upcoming assignment"}`,
                `Due: ${nextAssignment ? formatDueDate(nextAssignment.dueDate) : "N/A"}`
            ].filter(Boolean)
        });

        if (filterType) {
            col.addEventListener("click", () => toggleChartFilter(filterType, key));
            col.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleChartFilter(filterType, key);
            });
        }

        plot.appendChild(col);
    });

    const divider = document.createElement("div");
    divider.className = "vchart-divider";

    const legend = document.createElement("div");
    legend.className = "vchart-legend";

    entries.forEach(([key]) => {
        const item = document.createElement("div");
        item.className = "vchart-legend-item";

        const sw = document.createElement("span");
        sw.className = "vchart-swatch";
        sw.style.background = colourFn(key);

        const txt = document.createElement("span");
        txt.textContent = labelFn(key);

        item.appendChild(sw);
        item.appendChild(txt);
        legend.appendChild(item);
    });

    wrapper.appendChild(plot);
    wrapper.appendChild(divider);
    wrapper.appendChild(legend);

    return wrapper;
    }

    function renderDashboard() {
    const slideEl = document.getElementById("dash-slide");
    const labelEl = document.getElementById("dash-label");
    const dotsEl = document.getElementById("dash-dots");
    if (!slideEl || !labelEl || !dotsEl) return;

    slideEl.innerHTML = "";
    dotsEl.innerHTML = "";

    const assignments = loadAssignments();
    const mode = dashSlides[dashIndex];

    if (mode === "status") {
        labelEl.textContent = "Status";

        const counts = buildStatusCounts(assignments);

        // if truly nothing exists, show a simple message
        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        if (total === 0) {
        const msg = document.createElement("div");
        msg.className = "assignments-soft-empty empty-state-reveal";
        msg.textContent = EMPTY_COPY.assignments;
        slideEl.appendChild(msg);
        } else {
        slideEl.appendChild(
            createVerticalBarChart({
            title: "Status",
            countsMap: counts,
            colourFn: coloursForStatus,
            labelFn: (k) => (k === "other" ? "Other" : statusLabel(k)),
            filterType: "status",
            assignments,
            assignmentFilterFn: (assignment, key) => normalizeAssignmentStatus(assignment) === key
            })
        );
        }
    } else {
        labelEl.textContent = "Priority";

        const counts = buildPriorityCounts(assignments);
        
        // if truly nothing exists, show a simple message
        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        if (total === 0) {
        const msg = document.createElement("div");
        msg.className = "assignments-soft-empty empty-state-reveal";
        msg.textContent = EMPTY_COPY.assignments;
        slideEl.appendChild(msg);
        } else {
        slideEl.appendChild(
            createVerticalBarChart({
            title: "Priority",
            countsMap: counts,
            colourFn: coloursForPriority,
            labelFn: (k) => (k === "other" ? "Other" : priorityLabel(k)),
            filterType: "priority",
            assignments,
            assignmentFilterFn: (assignment, key) => (assignment?.priority || "").toLowerCase() === key
            })
        );
        }
    }

    dashSlides.forEach((_, i) => {
        const dot = document.createElement("span");
        if (i === dashIndex) dot.classList.add("active");
        dotsEl.appendChild(dot);
    });
    }

    /* Swipe functionality implementation */
    function goToPreviousDashboardSlide() {
        dashIndex = (dashIndex - 1 + dashSlides.length) % dashSlides.length;
        renderDashboard();
    }

    function goToNextDashboardSlide() {
        dashIndex = (dashIndex + 1) % dashSlides.length;
        renderDashboard();
    }

    function goToPreviousCarouselSlide() {
        if (!carouselSubjects.length) return;
        carouselIndex = (carouselIndex - 1 + carouselSubjects.length) % carouselSubjects.length;
        renderCarousel();
    }

    function goToNextCarouselSlide() {
        if (!carouselSubjects.length) return;
        carouselIndex = (carouselIndex + 1) % carouselSubjects.length;
        renderCarousel();
    }

    function attachHorizontalSwipeNavigation(container, { onPrev, onNext }) {
        if (!container) return;

        let accumulatedDeltaX = 0;
        let gestureTriggered = false;
        let gestureResetTimer = null;

        container.addEventListener("wheel", (event) => {
            // Keep buttons and other explicit controls behaving normally.
            if (event.target.closest("button")) return; // basically, leave the button and existing behaviour alone IF it exists

            const horizontalMovement = Math.abs(event.deltaX);
            const verticalMovement = Math.abs(event.deltaY);

            // Only treat clearly horizontal gestures as swipe navigation.
            // This avoids overriding normal page scrolling (vertical).
            if (horizontalMovement <= verticalMovement || horizontalMovement < 2) {
                accumulatedDeltaX = 0;
                return;
            }

            event.preventDefault();

            // Every wheel event refreshes the current gesture window.
            // We only allow a new swipe once wheel input has gone quiet.
            if (gestureResetTimer) clearTimeout(gestureResetTimer);
            gestureResetTimer = setTimeout(() => {
                accumulatedDeltaX = 0;
                gestureTriggered = false;
            }, 220);

            // If this gesture already changed slide once, ignore the rest
            // of the same swipe burst, including aggressive momentum events.
            if (gestureTriggered) return;

            accumulatedDeltaX += event.deltaX;
            if (Math.abs(accumulatedDeltaX) < SWIPE_X_THRESHOLD) return;

            if (accumulatedDeltaX > 0) {
                onNext();
            } else {
                onPrev();
            }

            // Mark this entire gesture as consumed so any remaining momentum
            // from the same swipe cannot skip extra slides.
            gestureTriggered = true;
            accumulatedDeltaX = 0;
        }, { passive: false });
    }

    /* dashboard nav wiring */
    document.getElementById("dash-prev")?.addEventListener("click", () => {
        goToPreviousDashboardSlide();
    });

    document.getElementById("dash-next")?.addEventListener("click", () => {
        goToNextDashboardSlide();
    });

    // Wiring up the events (subjects)
    addSubjectBtn.addEventListener("click", openSubjectModal);
    cancelSubjectBtn.addEventListener("click", closeSubjectModal);
    closeSubjectModalBtn?.addEventListener("click", closeSubjectModal);
    subjectBackdrop.addEventListener("click", closeSubjectModal);
    deleteSubjectBtn.addEventListener("click", deleteSubject);

    confirmSubjectBtn.addEventListener("click", () => {
        if (editingSubjectId) saveSubjectEdits();
        else addSubject();
    });

    // click a subject -> set active + open the "edit" modal
    subjectsListEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".subject-item");
        if (!btn || btn.disabled) return;

        document.querySelectorAll("#subjects-list .subject-item")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const subjectId = btn.dataset.subjectId;
        editSubjectModal(subjectId);
    });

    // Keyboard behaviour
    subjectNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            if (editingSubjectId) saveSubjectEdits();
            else addSubject();
        }
        if (e.key === "Escape") closeSubjectModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSubjectModal();
    });

    // Wiring up the events (assignments)
    addAssignmentBtn.addEventListener("click", openAssignmentModalAdd);
    cancelAssignmentBtn.addEventListener("click", closeAssignmentModal);
    closeAssignmentModalBtn?.addEventListener("click", closeAssignmentModal);
    closeViewAssignmentModalBtn?.addEventListener("click", closeViewAssignmentModal);
    deleteAssignmentBtn.addEventListener("click", deleteAssignment);
    assignmentSortBtns.forEach((btn) => {
        btn.addEventListener("click", () => toggleAssignmentSort(btn.dataset.assignmentSort));
    });
    clearFiltersBtn?.addEventListener("click", clearAssignmentFilters);
    resetAssignmentsBtn?.addEventListener("click", () => {
        resetAllAssignments().catch((error) => {
            console.error("Failed to reset assignments:", error);
            showToast("Could not reset assignments right now.", "negative");
        });
    });

    confirmAssignmentBtn.addEventListener("click", () => {
        if (editingAssignmentId) saveAssignmentEdits();
        else addAssignment();
    });

    assignmentsBody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr?.dataset.assignmentId) return;
        openAssignmentModalEdit(tr.dataset.assignmentId);
    });

    assignmentRemindersListEl?.addEventListener("click", (e) => {
        const btn = e.target.closest(".assignment-reminder-link");
        if (!btn?.dataset.assignmentId) return;
        openAssignmentModalEdit(btn.dataset.assignmentId);
    });

    backdrop.addEventListener("click", () => {
        closeAssignmentModal();
        closeViewAssignmentModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeAssignmentModal();
        closeViewAssignmentModal();
    });
    
    function updateSubjectsOverflowHint() {
        const panel = document.querySelector(".subjects-panel");
        if (!panel) return;
        const canScroll = subjectsListEl.scrollHeight > subjectsListEl.clientHeight + 1;
        panel.classList.toggle("has-more", canScroll);
    }

    // Wiring up the events (widgets)
    document.getElementById("carousel-prev")?.addEventListener("click", () => {
        goToPreviousCarouselSlide();
    });

    document.getElementById("carousel-next")?.addEventListener("click", () => {
        goToNextCarouselSlide();
    });

    // Adds a light trackpad/two-finger swipe layer on top of the existing prev/next functionality facilitated by buttons
    // arrow-button navigation for the two carousel-like cards only.
    attachHorizontalSwipeNavigation(document.getElementById("weighting-carousel"), {
        onPrev: goToPreviousCarouselSlide,
        onNext: goToNextCarouselSlide
    });

    attachHorizontalSwipeNavigation(document.querySelector(".dash-widget"), {
        onPrev: goToPreviousDashboardSlide,
        onNext: goToNextDashboardSlide
    });

     // Initial render
    refreshSubjectViews();
    renderSemesterLabel();
    renderDashboard();
    openAssignmentFromHomeWidget();
    window.addEventListener("nexa:load-demo-data", loadDemoAssignmentsData);
    window.addEventListener("nexa:app-data-reset", handleAppDataReset);
    window.addEventListener("nexa:account-updated", renderSemesterLabel);
    subjectsListEl.addEventListener("scroll", updateSubjectsOverflowHint);
    window.addEventListener("resize", updateSubjectsOverflowHint);
});
