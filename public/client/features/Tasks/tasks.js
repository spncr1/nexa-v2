document.addEventListener("DOMContentLoaded", async () => {
    await window.NexaAppStorage.ready;
    const storage = window.NexaAppStorage;
    const TASKS_KEY = "tasksByDate";
    const SUBJECTS_KEY = "studenthub_subjects";
    const ASSIGNMENTS_KEY = "studenthub_assignments";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const DEFAULT_SEMESTER_LABEL = "Untitled Semester";

    const todayBtn = document.getElementById("today-btn");
    const previousBtn = document.getElementById("previous-btn");
    const nextBtn = document.getElementById("next-btn");
    const weekViewBtn = document.getElementById("week-view-btn");
    const monthViewBtn = document.getElementById("month-view-btn");
    const rangeLabelEl = document.getElementById("tasks-range-label");

    const weekViewEl = document.getElementById("tasks-week-view");
    const monthViewEl = document.getElementById("tasks-month-view");

    const weekSummaryEl = document.getElementById("tasks-week-summary");
    const weekBoardEl = document.getElementById("tasks-week-board");
    const weekBoardWrapEl = weekBoardEl?.closest(".tasks-week-board-wrap");

    const monthDaysEl = document.getElementById("tasks-month-days");
    const monthSummaryEl = document.getElementById("tasks-month-summary");
    const monthTbdLaneEl = document.getElementById("tasks-month-tbd-lane");
    const monthBodyEl = document.getElementById("tasks-month-body");
    const monthTimeRailEl = document.getElementById("tasks-month-time-rail");
    const selectedDateLabelEl = document.getElementById("tasks-selected-date-label");

    const backdrop = document.getElementById("modal-backdrop");
    const modal = document.getElementById("add-task-modal");
    const modalTitleEl = document.getElementById("task-modal-title");
    const scheduleContextEl = document.getElementById("task-schedule-context");
    const titleInput = document.getElementById("task-title");
    const notesInput = document.getElementById("task-notes");
    const prioritySelect = document.getElementById("task-priority");
    const taskWorkflowStatusSelect = document.getElementById("task-workflow-status");
    const timeInput = document.getElementById("task-time");
    const statusEl = document.getElementById("task-status");
    const cancelBtn = document.getElementById("cancel-task-btn");
    const closeTaskModalBtn = document.getElementById("close-task-modal-btn");
    const deleteBtn = document.getElementById("delete-task-btn");
    const confirmBtn = document.getElementById("confirm-task-btn");

    let viewMode = "week";
    let activeDate = atNoon(new Date());
    let selectedMonthDate = atNoon(new Date());
    let editingTaskId = null;
    let modalDateKey = "";
    let modalHour = null;
    let monthDragPayload = null;
    const weekDayFilters = new Map();
    const FILTER_OPTIONS = [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Done" },
        { value: "high", label: "High" },
        { value: "medium", label: "Med" },
        { value: "low", label: "Low" }
    ];

    function copy(key, fallback = "") {
        return window.NexaCopy?.get?.(key, fallback) ?? fallback;
    }

    function atNoon(value) {
        const d = value instanceof Date ? new Date(value) : new Date(value);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    function dateKey(dateObj) {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    }

    function dateFromKey(key) {
        const [year, month, day] = key.split("-").map(Number);
        return atNoon(new Date(year, month - 1, day));
    }

    function startOfWeekMonday(dateObj) {
        const date = atNoon(dateObj);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        return date;
    }

    function sameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function hourLabel(hour24) {
        const suffix = hour24 < 12 ? "AM" : "PM";
        const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
        return `${displayHour} ${suffix}`;
    }

    function hourToTimeInput(hour24) {
        return `${String(hour24).padStart(2, "0")}:00`;
    }

    function normalizeTimeInput(value) {
        if (!value || typeof value !== "string") return null;
        const [hourStr, minuteStr] = value.split(":");
        const hour = Number(hourStr);
        const minute = Number(minuteStr);
        if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
        if (hour < 0 || hour > 23) return null;
        if (minute < 0 || minute > 59) return null;
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    function formatTimeForDisplay(value) {
        const normalized = normalizeTimeInput(value);
        if (!normalized) return null;

        const [hourStr, minuteStr] = normalized.split(":");
        const hour = Number(hourStr);
        const suffix = hour < 12 ? "AM" : "PM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${minuteStr} ${suffix}`;
    }

    function parseHourFromTimeInput(value) {
        const normalized = normalizeTimeInput(value);
        if (!normalized) return null;
        const [hours] = normalized.split(":");
        const hour = Number(hours);
        return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
    }

    function parseMinuteFromTimeInput(value) {
        const normalized = normalizeTimeInput(value);
        if (!normalized) return null;
        return Number(normalized.split(":")[1]);
    }

    function getTaskTimeParts(task) {
        if (typeof task.scheduledTime === "string") {
            const normalized = normalizeTimeInput(task.scheduledTime);
            if (normalized) {
                const [h, m] = normalized.split(":");
                return { hour: Number(h), minute: Number(m), normalized };
            }
        }

        if (Number.isInteger(task.scheduledHour) && task.scheduledHour >= 0 && task.scheduledHour <= 23) {
            return {
                hour: task.scheduledHour,
                minute: 0,
                normalized: hourToTimeInput(task.scheduledHour)
            };
        }

        return null;
    }

    function formatCompactDayMonth(dateObj) {
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("en-AU", { month: "short" });
        return `${day} ${month}`;
    }

    function formatMonthYear(dateObj) {
        return dateObj.toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric"
        });
    }

    function getWeekDates(anchorDate) {
        const start = startOfWeekMonday(anchorDate);
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }

    function loadAllTasks() {
        try {
            const raw = storage.getItem(TASKS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            if (!parsed || typeof parsed !== "object") return {};
            return parsed;
        } catch (e) {
            console.warn("Failed to parse tasks:", e);
            return {};
        }
    }

    function saveAllTasks(tasksByDate) {
        storage.setItem(TASKS_KEY, JSON.stringify(tasksByDate));
    }

    function normalizeTaskStatus(task) {
        const status = (task?.status || "").trim().toLowerCase();
        if (status === "completed" || task?.done === true) return "completed";
        if (status === "in-progress") return "in-progress";
        return "not-started";
    }

    function getTasksForDate(key) {
        const tasksByDate = loadAllTasks();
        const tasks = tasksByDate[key];
        return Array.isArray(tasks) ? tasks : [];
    }

    function getWeekTaskMap(weekDates) {
        const map = new Map();
        weekDates.forEach((date) => {
            const key = dateKey(date);
            map.set(key, getTasksForDate(key));
        });
        return map;
    }

    function renderTimeRail(targetEl) {
        if (!targetEl) return;
        targetEl.innerHTML = "";

        for (let hour = 0; hour < 24; hour += 1) {
            const label = document.createElement("div");
            label.className = "time-label";
            label.textContent = hourLabel(hour);
            targetEl.appendChild(label);
        }
    }

    function toLabel(value) {
        return String(value || "")
            .replaceAll("-", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function priorityLabel(priority) {
        return toLabel(priority || "medium");
    }

    function statusLabel(task) {
        return toLabel(normalizeTaskStatus(task));
    }

    function taskHasTime(task) {
        return getTaskTimeParts(task) !== null;
    }

    function getTaskSortTime(task) {
        const time = getTaskTimeParts(task);
        if (!time) return Number.MAX_SAFE_INTEGER;
        return time.hour * 60 + time.minute;
    }

    function sortTasksForBoard(tasks) {
        return [...tasks].sort((a, b) => {
            const timeDiff = getTaskSortTime(a) - getTaskSortTime(b);
            if (timeDiff !== 0) return timeDiff;
            const statusDiff = (normalizeTaskStatus(a) === "completed" ? 1 : 0) - (normalizeTaskStatus(b) === "completed" ? 1 : 0);
            if (statusDiff !== 0) return statusDiff;
            return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });
    }

    function filterTasks(tasks, filterValue) {
        if (filterValue === "active") {
            return tasks.filter((task) => normalizeTaskStatus(task) !== "completed");
        }

        if (filterValue === "completed") {
            return tasks.filter((task) => normalizeTaskStatus(task) === "completed");
        }

        if (["high", "medium", "low"].includes(filterValue)) {
            return tasks.filter((task) => (task.priority || "medium").toLowerCase() === filterValue);
        }

        return tasks;
    }

    function getTaskBreakdown(tasks) {
        return tasks.reduce((summary, task) => {
            const status = normalizeTaskStatus(task);
            const priority = (task.priority || "medium").toLowerCase();

            summary.total += 1;
            if (status === "completed") {
                summary.completed += 1;
            } else {
                summary.active += 1;
            }

            if (taskHasTime(task)) {
                summary.timed += 1;
            } else {
                summary.unscheduled += 1;
            }

            if (priority === "high") summary.high += 1;
            if (priority === "medium") summary.medium += 1;
            if (priority === "low") summary.low += 1;

            return summary;
        }, {
            total: 0,
            active: 0,
            completed: 0,
            timed: 0,
            unscheduled: 0,
            high: 0,
            medium: 0,
            low: 0
        });
    }

    function createSummaryMetric(label, value, tone = "") {
        const metric = document.createElement("div");
        metric.className = tone ? `tasks-summary-metric ${tone}` : "tasks-summary-metric";

        const valueEl = document.createElement("strong");
        valueEl.textContent = String(value);

        const labelEl = document.createElement("span");
        labelEl.textContent = label;

        metric.appendChild(valueEl);
        metric.appendChild(labelEl);
        return metric;
    }

    function createSummaryGroup(label, metrics, tone = "") {
        const group = document.createElement("div");
        group.className = tone ? `tasks-summary-group ${tone}` : "tasks-summary-group";

        const labelEl = document.createElement("span");
        labelEl.className = "tasks-summary-group-label";
        labelEl.textContent = label;

        const metricsEl = document.createElement("div");
        metricsEl.className = "tasks-summary-group-metrics";
        metrics.forEach((metric) => metricsEl.appendChild(metric));

        group.appendChild(labelEl);
        group.appendChild(metricsEl);
        return group;
    }

    function renderSummary(targetEl, title, tasks) {
        if (!targetEl) return;
        const summary = getTaskBreakdown(tasks);

        targetEl.innerHTML = "";

        const heading = document.createElement("div");
        heading.className = "tasks-summary-heading";

        const titleEl = document.createElement("h3");
        titleEl.textContent = title;

        const helper = document.createElement("p");
        helper.textContent = summary.total
            ? `${summary.active} active, ${summary.completed} completed`
            : copy("tasks.summary.empty", "No tasks to show yet.");

        heading.appendChild(titleEl);
        heading.appendChild(helper);

        const metrics = document.createElement("div");
        metrics.className = "tasks-summary-metrics";
        metrics.appendChild(createSummaryGroup("Total", [
            createSummaryMetric("Total", summary.total, "is-total")
        ], "is-total-group"));
        metrics.appendChild(createSummaryGroup("Status", [
            createSummaryMetric("Active", summary.active),
            createSummaryMetric("Completed", summary.completed)
        ]));
        metrics.appendChild(createSummaryGroup("Scheduling", [
            createSummaryMetric("Scheduled", summary.timed),
            createSummaryMetric("Unscheduled", summary.unscheduled)
        ]));
        metrics.appendChild(createSummaryGroup("Priority", [
            createSummaryMetric("High", summary.high, "priority-high"),
            createSummaryMetric("Medium", summary.medium, "priority-medium"),
            createSummaryMetric("Low", summary.low, "priority-low")
        ]));

        targetEl.appendChild(heading);
        targetEl.appendChild(metrics);
    }

    function createTaskCard(task, key) {
        const status = normalizeTaskStatus(task);
        const priority = (task.priority || "medium").toLowerCase();
        const time = getTaskTimeParts(task);

        const card = document.createElement("button");
        card.type = "button";
        card.className = `task-card priority-${priority} status-${status}`;
        if (status === "completed") {
            card.classList.add("is-completed");
        }
        card.setAttribute("aria-label", `Edit ${task.title || "task"}`);

        const title = document.createElement("span");
        title.className = "task-card-title";
        title.textContent = task.title || "Task";

        const meta = document.createElement("span");
        meta.className = "task-card-meta";
        meta.textContent = `${time ? formatTimeForDisplay(time.normalized) : "No time"} - ${priorityLabel(priority)} - ${statusLabel(task)}`;

        card.appendChild(title);
        card.appendChild(meta);
        card.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(key, task.id);
        });

        return card;
    }

    function createMonthTaskCard(task, key) {
        const card = createTaskCard(task, key);
        card.classList.add("month-draggable-task");
        card.draggable = true;

        card.addEventListener("dragstart", (e) => {
            monthDragPayload = {
                taskId: task.id,
                fromDateKey: key
            };
            card.classList.add("is-dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(task.id));
        });

        card.addEventListener("dragend", () => {
            monthDragPayload = null;
            card.classList.remove("is-dragging");
        });

        return card;
    }

    function createFilterControls(key) {
        const filters = document.createElement("div");
        filters.className = "tasks-day-filters";
        filters.setAttribute("aria-label", "Filter tasks");

        const currentFilter = weekDayFilters.get(key) || "all";
        FILTER_OPTIONS.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tasks-filter-btn";
            button.textContent = option.label;
            button.dataset.filter = option.value;
            button.setAttribute("aria-pressed", (option.value === currentFilter).toString());
            if (option.value === currentFilter) {
                button.classList.add("active");
            }

            button.addEventListener("click", () => {
                weekDayFilters.set(key, option.value);
                renderWeekView();
            });

            filters.appendChild(button);
        });

        return filters;
    }

    function createEmptyDayMessage(filterValue) {
        const empty = document.createElement("p");
        empty.className = "tasks-day-empty";
        empty.textContent = filterValue === "all"
            ? copy("tasks.day.emptyAll", "Nothing scheduled.")
            : copy("tasks.day.emptyFiltered", "No tasks to show.");
        return empty;
    }

    function renderWeekView() {
        if (!weekBoardEl) return;
        const weekDates = getWeekDates(activeDate);
        const today = atNoon(new Date());
        const taskMap = getWeekTaskMap(weekDates);

        weekBoardEl.innerHTML = "";
        renderSummary(weekSummaryEl, "This week", weekDates.flatMap((date) => taskMap.get(dateKey(date)) || []));

        weekDates.forEach((date) => {
            const key = dateKey(date);
            const tasks = sortTasksForBoard(taskMap.get(key) || []);
            const currentFilter = weekDayFilters.get(key) || "all";
            const visibleTasks = filterTasks(tasks, currentFilter);

            const column = document.createElement("article");
            column.className = "tasks-day-column";
            if (sameDay(date, today)) {
                column.classList.add("today");
            }

            const header = document.createElement("div");
            header.className = "tasks-day-header";

            const titleWrap = document.createElement("div");
            titleWrap.className = "tasks-day-title-wrap";

            const weekday = document.createElement("span");
            weekday.className = "tasks-day-name";
            weekday.textContent = date.toLocaleDateString("en-AU", { weekday: "short" });

            const day = document.createElement("strong");
            day.className = "tasks-day-date";
            day.textContent = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });

            titleWrap.appendChild(weekday);
            titleWrap.appendChild(day);

            const count = document.createElement("span");
            count.className = "tasks-day-count";
            count.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

            header.appendChild(titleWrap);
            header.appendChild(count);

            const tools = document.createElement("div");
            tools.className = "tasks-day-tools";

            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "tasks-day-add-btn";
            addBtn.setAttribute("aria-label", `Add task on ${date.toDateString()}`);
            addBtn.innerHTML = `<span class="app-icon icon-add" aria-hidden="true"></span>`;
            addBtn.addEventListener("click", () => openAddModal(key, null));

            tools.appendChild(addBtn);
            tools.appendChild(createFilterControls(key));

            const list = document.createElement("div");
            list.className = "tasks-day-list";
            if (visibleTasks.length) {
                visibleTasks.forEach((task) => {
                    list.appendChild(createTaskCard(task, key));
                });
            } else {
                list.appendChild(createEmptyDayMessage(currentFilter));
            }

            column.appendChild(header);
            column.appendChild(tools);
            column.appendChild(list);
            weekBoardEl.appendChild(column);
        });

        requestAnimationFrame(updateWeekBoardFade);
    }

    function updateWeekBoardFade() {
        if (!weekBoardEl || !weekBoardWrapEl) return;

        const maxScroll = weekBoardEl.scrollWidth - weekBoardEl.clientWidth;
        if (maxScroll <= 1) {
            weekBoardWrapEl.style.setProperty("--tasks-fade-left-opacity", "0");
            weekBoardWrapEl.style.setProperty("--tasks-fade-right-opacity", "0");
            return;
        }

        const progress = Math.min(Math.max(weekBoardEl.scrollLeft / maxScroll, 0), 1);
        weekBoardWrapEl.style.setProperty("--tasks-fade-left-opacity", progress.toFixed(3));
        weekBoardWrapEl.style.setProperty("--tasks-fade-right-opacity", (1 - progress).toFixed(3));
    }

    function getMonthTasks(monthDate) {
        const tasks = [];
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= lastDay; day += 1) {
            tasks.push(...getTasksForDate(dateKey(atNoon(new Date(year, month, day)))));
        }

        return tasks;
    }

    function renderMonthSummary() {
        renderSummary(monthSummaryEl, "This month", getMonthTasks(atNoon(activeDate)));
    }

    function setMonthDropState(el, isActive) {
        if (!el) return;
        el.classList.toggle("is-drop-target", isActive);
    }

    function enableMonthDropTarget(el, onDrop) {
        if (!el) return;

        el.ondragover = (e) => {
            if (!monthDragPayload) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setMonthDropState(el, true);
        };

        el.ondragleave = (e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setMonthDropState(el, false);
        };

        el.ondrop = (e) => {
            if (!monthDragPayload) return;
            e.preventDefault();
            setMonthDropState(el, false);
            onDrop(monthDragPayload);
            monthDragPayload = null;
        };
    }

    function moveMonthTask(payload, toDateKey, targetHour = null) {
        if (!payload?.taskId || !payload?.fromDateKey || !toDateKey) return;

        const tasksByDate = loadAllTasks();
        const fromList = Array.isArray(tasksByDate[payload.fromDateKey]) ? tasksByDate[payload.fromDateKey] : [];
        const fromIndex = fromList.findIndex((task) => task.id === payload.taskId);
        if (fromIndex === -1) return;

        const [task] = fromList.splice(fromIndex, 1);
        const hasHour = Number.isInteger(targetHour);
        task.scheduledHour = hasHour ? targetHour : null;
        task.scheduledMinute = hasHour ? 0 : null;
        task.scheduledTime = hasHour ? hourToTimeInput(targetHour) : null;
        task.updatedAt = Date.now();

        if (!Array.isArray(tasksByDate[toDateKey])) {
            tasksByDate[toDateKey] = [];
        }

        if (payload.fromDateKey === toDateKey) {
            fromList.push(task);
            tasksByDate[toDateKey] = fromList;
        } else {
            tasksByDate[payload.fromDateKey] = fromList;
            tasksByDate[toDateKey].push(task);
        }

        saveAllTasks(tasksByDate);
        refreshCalendarViews();
        showTaskToast(hasHour ? `Task scheduled for ${hourLabel(targetHour)}.` : "Task moved to Time TBD.", "neutral");
    }

    function renderMonthGrid() {
        if (!monthDaysEl) return;

        const monthDate = atNoon(activeDate);
        const monthStart = atNoon(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
        const offset = (monthStart.getDay() + 6) % 7;
        const gridStart = atNoon(new Date(monthStart));
        gridStart.setDate(monthStart.getDate() - offset);

        const today = atNoon(new Date());
        monthDaysEl.innerHTML = "";

        for (let i = 0; i < 42; i += 1) {
            const dayDate = atNoon(new Date(gridStart));
            dayDate.setDate(gridStart.getDate() + i);

            const key = dateKey(dayDate);
            const tasks = getTasksForDate(key);
            const button = document.createElement("button");

            button.type = "button";
            button.className = "tasks-month-day";
            button.dataset.date = key;

            if (dayDate.getMonth() !== monthDate.getMonth()) {
                button.classList.add("outside");
            }

            if (sameDay(dayDate, today)) {
                button.classList.add("today");
            }

            if (sameDay(dayDate, selectedMonthDate)) {
                button.classList.add("selected");
            }

            const dayNum = document.createElement("div");
            dayNum.className = "tasks-month-day-num";
            dayNum.textContent = String(dayDate.getDate());

            const count = document.createElement("div");
            count.className = "tasks-month-day-count";
            count.textContent = tasks.length ? `${tasks.length} task${tasks.length > 1 ? "s" : ""}` : "";

            button.appendChild(dayNum);
            button.appendChild(count);

            button.addEventListener("click", () => {
                selectedMonthDate = atNoon(dayDate);
                renderMonthGrid();
                updateSelectedDateLabel();
                renderMonthAgenda();
            });

            monthDaysEl.appendChild(button);
        }
    }

    function renderMonthAgenda() {
        if (!monthBodyEl) return;

        const key = dateKey(selectedMonthDate);
        const tasks = getTasksForDate(key);

        monthBodyEl.innerHTML = "";
        if (monthTimeRailEl) {
            monthTimeRailEl.innerHTML = "";

            for (let hour = 0; hour < 24; hour += 1) {
                const label = document.createElement("div");
                label.className = "time-label";
                label.textContent = hourLabel(hour);
                monthTimeRailEl.appendChild(label);
            }
        }

        const tbd = sortTasksForBoard(tasks.filter((task) => !taskHasTime(task)));
        if (monthTbdLaneEl) {
            monthTbdLaneEl.innerHTML = "";

            const label = document.createElement("div");
            label.className = "month-tbd-label";
            label.textContent = "Time TBD";
            monthTbdLaneEl.appendChild(label);

            const chips = document.createElement("div");
            chips.className = "month-tbd-chips";
            if (tbd.length) {
                tbd.forEach((task) => {
                    chips.appendChild(createMonthTaskCard(task, key));
                });
            } else {
                const empty = document.createElement("p");
                empty.className = "month-tbd-empty";
                empty.textContent = copy("tasks.month.unscheduledEmpty", "No unscheduled tasks.");
                chips.appendChild(empty);
            }
            monthTbdLaneEl.appendChild(chips);
            enableMonthDropTarget(monthTbdLaneEl, (payload) => moveMonthTask(payload, key, null));
        }

        for (let hour = 0; hour < 24; hour += 1) {
            const slot = document.createElement("div");
            slot.className = "month-slot";
            slot.dataset.hour = String(hour);
            enableMonthDropTarget(slot, (payload) => moveMonthTask(payload, key, hour));

            const timedTasks = tasks
                .map((task) => ({ task, time: getTaskTimeParts(task) }))
                .filter((entry) => entry.time && entry.time.hour === hour)
                .sort((a, b) => (a.time.minute - b.time.minute) || ((a.task.createdAt || 0) - (b.task.createdAt || 0)));

            timedTasks.forEach(({ task, time }) => {
                const card = createMonthTaskCard(task, key);
                card.dataset.timeLabel = formatTimeForDisplay(time.normalized);
                slot.appendChild(card);
            });

            monthBodyEl.appendChild(slot);
        }
    }

    function updateSelectedDateLabel() {
        if (!selectedDateLabelEl) return;
        selectedDateLabelEl.textContent = `${selectedMonthDate.toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        })}`;
    }

    function updateRangeLabel() {
        if (!rangeLabelEl) return;

        if (viewMode === "week") {
            const weekDates = getWeekDates(activeDate);
            const start = weekDates[0];
            const end = weekDates[6];
            rangeLabelEl.textContent = `${formatCompactDayMonth(start)} - ${formatCompactDayMonth(end)}`;
            return;
        }

        rangeLabelEl.textContent = formatMonthYear(activeDate);
    }

    function setViewMode(nextMode) {
        viewMode = nextMode;
        const isWeek = viewMode === "week";

        weekViewEl.classList.toggle("hidden", !isWeek);
        monthViewEl.classList.toggle("hidden", isWeek);

        weekViewBtn.classList.toggle("active", isWeek);
        weekViewBtn.setAttribute("aria-selected", isWeek.toString());

        monthViewBtn.classList.toggle("active", !isWeek);
        monthViewBtn.setAttribute("aria-selected", (!isWeek).toString());

        updateRangeLabel();
        if (isWeek) {
            requestAnimationFrame(updateWeekBoardFade);
        }
    }

    function refreshCalendarViews() {
        renderWeekView();
        renderMonthGrid();
        renderMonthSummary();
        renderMonthAgenda();
        updateSelectedDateLabel();
        updateRangeLabel();
    }

    function shiftPeriod(direction) {
        if (viewMode === "week") {
            activeDate.setDate(activeDate.getDate() + 7 * direction);
            activeDate = atNoon(activeDate);
            renderWeekView();
        } else {
            activeDate.setMonth(activeDate.getMonth() + direction);
            activeDate = atNoon(activeDate);
            renderMonthGrid();
            renderMonthSummary();
        }

        updateRangeLabel();
    }

    function goToToday() {
        activeDate = atNoon(new Date());
        selectedMonthDate = atNoon(new Date());
        refreshCalendarViews();
    }

    function showInlineStatus(message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.notice(statusEl, message, { tone });
            return;
        }

        statusEl.textContent = message;
    }

    function showTaskToast(message, tone = "neutral") {
        if (window.NexaFeedback) {
            window.NexaFeedback.toast(message, { tone });
            return;
        }

        showInlineStatus(message, tone);
    }

    function closeTaskModal() {
        if (!backdrop || !modal) return;
        backdrop.classList.add("hidden");
        modal.classList.add("hidden");
        showInlineStatus("");
        editingTaskId = null;
        modalDateKey = "";
        modalHour = null;
    }

    function setModalContext() {
        if (!scheduleContextEl) return;
        if (!modalDateKey) {
            scheduleContextEl.textContent = "";
            return;
        }

        const dateObj = dateFromKey(modalDateKey);
        const selectedTime = formatTimeForDisplay(timeInput ? timeInput.value : "");
        if (selectedTime) {
            scheduleContextEl.textContent = `Scheduled: ${dateObj.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long"
            })}, ${selectedTime}`;
        } else {
            scheduleContextEl.textContent = `Scheduled: ${dateObj.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long"
            })} (TBD)`;
        }
    }

    function setButtonLabel(button, label) {
        const labelEl = button?.querySelector(".ui-btn-label");
        if (labelEl) {
            labelEl.textContent = label;
            return;
        }
        if (button) button.textContent = label;
    }

    function openAddModal(targetDateKey, targetHour) {
        editingTaskId = null;
        modalDateKey = targetDateKey;
        modalHour = targetHour;

        modalTitleEl.textContent = "ADD TASK";
        setButtonLabel(confirmBtn, "Add");
        deleteBtn.classList.add("hidden");

        titleInput.value = "";
        notesInput.value = "";
        prioritySelect.value = "medium";
        if (taskWorkflowStatusSelect) taskWorkflowStatusSelect.value = "not-started";
        timeInput.value = Number.isInteger(targetHour) ? hourToTimeInput(targetHour) : "";
        showInlineStatus("");

        setModalContext();
        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
        titleInput.focus();
    }

    function openEditModal(targetDateKey, taskId) {
        const tasks = getTasksForDate(targetDateKey);
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;

        editingTaskId = taskId;
        modalDateKey = targetDateKey;
        modalHour = Number.isInteger(task.scheduledHour) ? task.scheduledHour : null;
        const taskTime = getTaskTimeParts(task);

        modalTitleEl.textContent = "EDIT TASK";
        setButtonLabel(confirmBtn, "Save");
        deleteBtn.classList.remove("hidden");

        titleInput.value = task.title || "";
        notesInput.value = task.notes || "";
        prioritySelect.value = task.priority || "medium";
        if (taskWorkflowStatusSelect) taskWorkflowStatusSelect.value = normalizeTaskStatus(task);
        timeInput.value = taskTime ? taskTime.normalized : "";
        showInlineStatus("");

        setModalContext();
        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
        titleInput.focus();
    }

    function upsertTask() {
        const title = titleInput.value.trim();
        const notes = notesInput.value.trim();
        const priority = prioritySelect.value;
        const workflowStatus = taskWorkflowStatusSelect?.value || "not-started";
        const normalizedTime = normalizeTimeInput(timeInput.value);
        const chosenHour = parseHourFromTimeInput(timeInput.value);
        const chosenMinute = parseMinuteFromTimeInput(timeInput.value);

        if (!title) {
            showInlineStatus("Please enter a task title.", "negative");
            return;
        }

        const tasksByDate = loadAllTasks();
        const key = modalDateKey || dateKey(activeDate);
        const list = Array.isArray(tasksByDate[key]) ? tasksByDate[key] : [];

        if (editingTaskId) {
            const index = list.findIndex((task) => task.id === editingTaskId);
            if (index === -1) return;

            list[index].title = title;
            list[index].notes = notes;
            list[index].priority = priority;
            list[index].status = workflowStatus;
            list[index].done = workflowStatus === "completed";
            list[index].scheduledHour = chosenHour;
            list[index].scheduledMinute = chosenMinute;
            list[index].scheduledTime = normalizedTime;
            list[index].updatedAt = Date.now();
            showTaskToast(copy("tasks.toast.updated", "Task updated."), "neutral");
        } else {
            list.push({
                id: Date.now(),
                title,
                notes,
                priority,
                status: workflowStatus,
                done: workflowStatus === "completed",
                scheduledHour: chosenHour,
                scheduledMinute: chosenMinute,
                scheduledTime: normalizedTime,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            showTaskToast(copy("tasks.toast.added", "Task added."), "positive");
        }

        tasksByDate[key] = list;
        saveAllTasks(tasksByDate);

        refreshCalendarViews();
        closeTaskModal();
    }

    function deleteTask() {
        if (!editingTaskId || !modalDateKey) return;

        const tasksByDate = loadAllTasks();
        const list = Array.isArray(tasksByDate[modalDateKey]) ? tasksByDate[modalDateKey] : [];
        tasksByDate[modalDateKey] = list.filter((task) => task.id !== editingTaskId);

        saveAllTasks(tasksByDate);
        refreshCalendarViews();
        closeTaskModal();
        showTaskToast(copy("tasks.toast.deleted", "Task deleted."), "negative");
    }

    function handleAppDataReset() {
        editingTaskId = null;
        modalDateKey = "";
        modalHour = null;
        activeDate = atNoon(new Date());
        selectedMonthDate = atNoon(new Date());
        refreshCalendarViews();
    }

    if (todayBtn) {
        todayBtn.addEventListener("click", goToToday);
    }

    if (previousBtn) {
        previousBtn.addEventListener("click", () => shiftPeriod(-1));
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => shiftPeriod(1));
    }

    if (weekViewBtn) {
        weekViewBtn.addEventListener("click", () => setViewMode("week"));
    }

    if (monthViewBtn) {
        monthViewBtn.addEventListener("click", () => setViewMode("month"));
    }

    if (weekBoardEl) {
        weekBoardEl.addEventListener("scroll", updateWeekBoardFade, { passive: true });
        window.addEventListener("resize", updateWeekBoardFade);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeTaskModal);
    }

    if (closeTaskModalBtn) {
        closeTaskModalBtn.addEventListener("click", closeTaskModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", upsertTask);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", deleteTask);
    }

    if (timeInput) {
        timeInput.addEventListener("change", () => {
            modalHour = parseHourFromTimeInput(timeInput.value);
            setModalContext();
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", () => {
            if (modal && !modal.classList.contains("hidden")) {
                closeTaskModal();
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        if (modal && !modal.classList.contains("hidden")) {
            closeTaskModal();
        }
    });
    window.addEventListener("nexa:app-data-reset", handleAppDataReset);
    window.NexaPreferences?.onChange?.((prefs, changedKey) => {
        if (changedKey === "appTone") {
            refreshCalendarViews();
        }
    });
    renderTimeRail(monthTimeRailEl);
    refreshCalendarViews();
    setViewMode("week");
});
