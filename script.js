// =============================================
// StudyLong — script.js
// =============================================

// ─── TIMER ───────────────────────────────────
let timerInterval = null;
let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let isRunning = false;
let sessionsCompleted = 0;
let isBreak = false;

const CIRCUMFERENCE = 2 * Math.PI * 100; // r=100

function updateTimerDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const el = document.getElementById('time');
    if (el) el.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const progress = document.getElementById('progressCircle');
    if (progress) {
        const offset = CIRCUMFERENCE - (remainingSeconds / totalSeconds) * CIRCUMFERENCE;
        progress.style.strokeDashoffset = offset;
        progress.style.strokeDasharray = CIRCUMFERENCE;
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            onTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    remainingSeconds = totalSeconds;
    updateTimerDisplay();
}

function setTimer(minutes, breakMode = false) {
    clearInterval(timerInterval);
    isRunning = false;
    isBreak = breakMode;
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;

    // update active mode button
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active-mode'));
    const active = document.querySelector(`[data-mins="${minutes}"]`);
    if (active) active.classList.add('active-mode');

    const label = document.querySelector('.timer-label');
    if (label) label.textContent = breakMode ? '— BREAK —' : (minutes >= 50 ? '— DEEP WORK —' : '— FOCUS SESSION —');

    updateTimerDisplay();
}

function onTimerComplete() {
    sessionsCompleted++;
    const el = document.getElementById('sessionsCount');
    if (el) el.textContent = sessionsCompleted;

    // update streak for today
    if (!isBreak) markTodayFocused();

    // notify
    if (Notification.permission === 'granted') {
        new Notification('Session Complete! 🎯', { body: isBreak ? 'Break over. Back to work!' : 'Great focus session! Take a break.' });
    }

    // play beep
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 150, 300].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay/1000);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay/1000 + 0.3);
            osc.start(ctx.currentTime + delay/1000);
            osc.stop(ctx.currentTime + delay/1000 + 0.3);
        });
    } catch(e) {}
}

// ─── STREAKS ──────────────────────────────────
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function markTodayFocused() {
    const focused = JSON.parse(localStorage.getItem('sl_focused_days') || '[]');
    const today = getTodayKey();
    if (!focused.includes(today)) {
        focused.push(today);
        localStorage.setItem('sl_focused_days', JSON.stringify(focused));
        renderStreakGrid();
        renderMonthlyGrid();
    }
}

function getFocusedDays() {
    return JSON.parse(localStorage.getItem('sl_focused_days') || '[]');
}

function getCurrentStreak() {
    const focused = getFocusedDays().sort();
    if (focused.length === 0) return 0;
    let streak = 0;
    let d = new Date();
    while (true) {
        const key = d.toISOString().split('T')[0];
        if (focused.includes(key)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else break;
    }
    return streak;
}

function renderStreakGrid() {
    const grid = document.getElementById('streakGrid');
    if (!grid) return;
    const focused = getFocusedDays();
    grid.innerHTML = '';
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const div = document.createElement('div');
        div.className = 'streak-day' + (focused.includes(key) ? ' active' : '');
        div.title = key;
        grid.appendChild(div);
    }
    const streakEl = document.getElementById('currentStreak');
    if (streakEl) streakEl.textContent = getCurrentStreak();
    const totalEl = document.getElementById('totalDays');
    if (totalEl) totalEl.textContent = focused.length;
}

// ─── MONTHLY STREAK ───────────────────────────
let currentMonthOffset = 0;

function renderMonthlyGrid() {
    const grid = document.getElementById('monthlyGrid');
    if (!grid) return;
    const focused = getFocusedDays();
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthLabel = document.getElementById('monthLabel');
    if (monthLabel) monthLabel.textContent = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = today.toISOString().split('T')[0];

    grid.innerHTML = '';

    // Day labels
    ['S','M','T','W','T','F','S'].forEach(d => {
        const label = document.createElement('div');
        label.className = 'monthly-day-label';
        label.textContent = d;
        grid.appendChild(label);
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'monthly-day empty';
        grid.appendChild(empty);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const div = document.createElement('div');
        div.className = 'monthly-day';
        div.textContent = day;
        if (focused.includes(dateStr)) div.classList.add('focused');
        if (dateStr === todayKey) div.classList.add('today');
        grid.appendChild(div);
    }

    // Update stats
    const focusedDaysEl = document.getElementById('focusedDays');
    const streakEl = document.getElementById('currentStreak');
    if (focusedDaysEl) focusedDaysEl.textContent = focused.length;
    if (streakEl) streakEl.textContent = getCurrentStreak();
}

// ─── TASKS ────────────────────────────────────
function loadTasks() {
    return JSON.parse(localStorage.getItem('sl_tasks') || '[]');
}

function saveTasks(tasks) {
    localStorage.setItem('sl_tasks', JSON.stringify(tasks));
}

function addTask() {
    const input = document.getElementById('taskInput');
    const priorityEl = document.getElementById('taskPriority');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const priority = priorityEl ? priorityEl.value : 'med';
    const tasks = loadTasks();
    tasks.push({ id: Date.now(), text, priority, completed: false });
    saveTasks(tasks);
    input.value = '';
    renderTasks();
}

function deleteTask(id) {
    let tasks = loadTasks().filter(t => t.id !== id);
    saveTasks(tasks);
    renderTasks();
}

function toggleTask(id) {
    let tasks = loadTasks().map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(tasks);
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById('taskList');
    if (!list) return;
    const tasks = loadTasks();
    const done = tasks.filter(t => t.completed).length;
    const totalEl = document.getElementById('taskTotal');
    const doneEl = document.getElementById('taskDone');
    if (totalEl) totalEl.textContent = tasks.length;
    if (doneEl) doneEl.textContent = done;

    list.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        const priorityLabel = { high: 'HIGH', med: 'MED', low: 'LOW' }[task.priority] || 'MED';
        const priorityClass = { high: 'priority-high', med: 'priority-med', low: 'priority-low' }[task.priority] || 'priority-med';
        li.innerHTML = `
            <div class="task-left">
                <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></button>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <span class="task-priority ${priorityClass}">${priorityLabel}</span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${task.id})">✕</button>
        `;
        list.appendChild(li);
    });
}

function handleTaskKeydown(e) {
    if (e.key === 'Enter') addTask();
}

function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── PLANNER ──────────────────────────────────
function loadGoals() {
    return JSON.parse(localStorage.getItem('sl_goals') || '[]');
}

function saveGoals(goals) {
    localStorage.setItem('sl_goals', JSON.stringify(goals));
}

function createGoal() {
    const nameEl = document.getElementById('goalInput');
    const daysEl = document.getElementById('dayInput');
    if (!nameEl || !daysEl) return;
    const name = nameEl.value.trim();
    const days = parseInt(daysEl.value);
    if (!name || isNaN(days) || days < 1 || days > 365) {
        if (!name) nameEl.focus();
        return;
    }
    const goals = loadGoals();
    const tasks = Array.from({ length: days }, (_, i) => ({ day: i + 1, task: '', done: false }));
    goals.push({ id: Date.now(), name, days, tasks });
    saveGoals(goals);
    nameEl.value = '';
    daysEl.value = '';
    renderPlanner();
}

function deleteGoal(id) {
    const goals = loadGoals().filter(g => g.id !== id);
    saveGoals(goals);
    renderPlanner();
}

function updateDayTask(goalId, dayIndex, value) {
    const goals = loadGoals();
    const g = goals.find(g => g.id === goalId);
    if (g) {
        g.tasks[dayIndex].task = value;
        saveGoals(goals);
    }
}

function toggleDayDone(goalId, dayIndex) {
    const goals = loadGoals();
    const g = goals.find(g => g.id === goalId);
    if (g) {
        g.tasks[dayIndex].done = !g.tasks[dayIndex].done;
        saveGoals(goals);
        renderPlanner();
    }
}

function renderPlanner() {
    const container = document.getElementById('plannerContainer');
    if (!container) return;
    const goals = loadGoals();
    container.innerHTML = '';
    if (goals.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px; font-family: Space Mono, monospace; font-size: 0.85rem;">No roadmaps yet. Create one above!</p>';
        return;
    }
    goals.forEach(goal => {
        const doneDays = goal.tasks.filter(t => t.done).length;
        const pct = Math.round((doneDays / goal.days) * 100);
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">📌 ${escapeHtml(goal.name)}</div>
                <div style="display:flex;gap:10px;align-items:center;">
                    <span class="goal-progress">${doneDays}/${goal.days} days · ${pct}%</span>
                    <button class="delete-goal-btn" onclick="deleteGoal(${goal.id})">Delete</button>
                </div>
            </div>
            <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
            <div class="day-grid" id="days-${goal.id}"></div>
        `;
        container.appendChild(card);

        const dayGrid = document.getElementById(`days-${goal.id}`);
        goal.tasks.forEach((t, i) => {
            const box = document.createElement('div');
            box.className = 'day-box' + (t.done ? ' day-done' : '');
            box.innerHTML = `
                <div class="day-label" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>Day ${t.day}</span>
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleDayDone(${goal.id},${i})" style="accent-color:var(--primary);cursor:pointer;width:14px;height:14px;margin:0;">
                </div>
                <input type="text" value="${escapeHtml(t.task)}" placeholder="Topic..." 
                    oninput="updateDayTask(${goal.id},${i},this.value)"
                    onblur="saveGoals(loadGoals())">
            `;
            dayGrid.appendChild(box);
        });
    });
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Timer page
    if (document.getElementById('time')) {
        updateTimerDisplay();
        renderStreakGrid();
        // Request notification permission
        if (Notification && Notification.permission === 'default') Notification.requestPermission();
    }

    // Monthly streak page
    if (document.getElementById('monthlyGrid')) {
        renderMonthlyGrid();
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        if (prevBtn) prevBtn.addEventListener('click', () => { currentMonthOffset--; renderMonthlyGrid(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { currentMonthOffset = Math.min(0, currentMonthOffset + 1); renderMonthlyGrid(); });
    }

    // Tasks page
    if (document.getElementById('taskList')) {
        renderTasks();
        const input = document.getElementById('taskInput');
        if (input) input.addEventListener('keydown', handleTaskKeydown);
    }

    // Planner page
    if (document.getElementById('plannerContainer')) {
        renderPlanner();
        const goalInput = document.getElementById('goalInput');
        const dayInput = document.getElementById('dayInput');
        if (goalInput) goalInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('dayInput').focus(); });
        if (dayInput) dayInput.addEventListener('keydown', e => { if (e.key === 'Enter') createGoal(); });
    }
});
