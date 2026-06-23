// Audio Context for Web Audio API synthesis (Rain, Forest, Ribbit chime)
let audioCtx = null;
let rainNode = null;
let forestNode = null;
let ribbitTimer = null;

// Account / Sync state variables
let isLoggedIn = false;
let loggedInUser = null;

// Initial volume multipliers (0.0 to 1.0)
let rainVolume = 0.5;
let forestVolume = 0.5;
let pondVolume = 0.5;

// Audio synth functions
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate White Noise for Rain
function createRainNode() {
    initAudio();
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to make it sound like gentle rain (lowpass filter around 800Hz-1200Hz)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = audioCtx.createGain();
    gain.gain.value = rainVolume * 0.3; // Scaled rain volume

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    return { source: whiteNoise, gainNode: gain };
}

// Generate Pink/Brown Noise for Forest Wind/Rustles
function createForestNode() {
    initAudio();
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    
    // Brown noise filter approximation for deep wind rustle
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate loss
    }

    const brownNoise = audioCtx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    // Lowpass filter modulating with LFO for rustling wind effect
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 1.0;

    // LFO to modulate bandpass filter frequency
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.15; // slow drift
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 150; // modulate by 150Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = audioCtx.createGain();
    gain.gain.value = forestVolume * 0.4; // Scaled forest volume

    brownNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    return { source: brownNoise, gainNode: gain, lfo: lfo };
}

// Synthesize a Ribbit Sound!
function playRibbit() {
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    // Run two chirp sound waves close together to make the signature "rib-bit"
    chirp(now);
    chirp(now + 0.18);
}

function chirp(time) {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    
    // Base frequency sweep to sound organic/croaky
    osc1.frequency.setValueAtTime(140, time);
    osc1.frequency.exponentialRampToValueAtTime(320, time + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(120, time + 0.12);
    
    osc2.frequency.setValueAtTime(280, time);
    osc2.frequency.exponentialRampToValueAtTime(640, time + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(240, time + 0.12);
    
    // Quick amplitude envelope
    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.linearRampToValueAtTime(0.12 * pondVolume, time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start(time);
    osc2.start(time);
    
    osc1.stop(time + 0.13);
    osc2.stop(time + 0.13);
}

// Toggle Ambient Atmosphere Sounds
function toggleAmbient(type) {
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (type === 'rain') {
        const btn = document.getElementById('ambient-rain');
        if (rainNode) {
            rainNode.source.stop();
            rainNode = null;
            btn.classList.remove('active');
        } else {
            rainNode = createRainNode();
            rainNode.source.start(0);
            btn.classList.add('active');
        }
    } else if (type === 'forest') {
        const btn = document.getElementById('ambient-forest');
        if (forestNode) {
            forestNode.source.stop();
            forestNode.lfo.stop();
            forestNode = null;
            btn.classList.remove('active');
        } else {
            forestNode = createForestNode();
            forestNode.source.start(0);
            btn.classList.add('active');
        }
    } else if (type === 'pond') {
        const btn = document.getElementById('ambient-pond');
        if (ribbitTimer) {
            clearInterval(ribbitTimer);
            ribbitTimer = null;
            btn.classList.remove('active');
        } else {
            btn.classList.add('active');
            playRibbit();
            // Ribbit randomly every 6 to 15 seconds
            const setNextRibbit = () => {
                const delay = (Math.random() * 9 + 6) * 1000;
                ribbitTimer = setTimeout(() => {
                    playRibbit();
                    setNextRibbit();
                }, delay);
            };
            setNextRibbit();
        }
    }
}

// Adjust ambient and sound effect volumes dynamically
function adjustVolume(type, value) {
    const val = parseFloat(value) / 100;
    if (type === 'rain') {
        rainVolume = val;
        if (rainNode) {
            rainNode.gainNode.gain.setValueAtTime(rainVolume * 0.3, audioCtx.currentTime);
        }
    } else if (type === 'forest') {
        forestVolume = val;
        if (forestNode) {
            forestNode.gainNode.gain.setValueAtTime(forestVolume * 0.4, audioCtx.currentTime);
        }
    } else if (type === 'pond') {
        pondVolume = val;
    }
}


/* --- Pomodoro Timer Logic --- */
let timerInterval = null;
let timeLeft = 0;
let workDuration = 25 * 60; // default 25 min in seconds
let breakDuration = 5 * 60;  // default 5 min in seconds
let totalSessions = 4;
let currentSession = 1;
let isTimerRunning = false;
let timerMode = 'work'; // 'work' or 'break'

const circle = document.querySelector('.progress-ring__circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

// Speech bubble responses for Lily the Frog
const LILY_SPEECH = {
    welcome: [
        "Welcome to the pond! Let's get cozy and make progress together, ribbit!",
        "Hoppy studying! Remember to take deep breaths and stretch your legs.",
        "Need a cozy vibe? Select a playlist from Froggy Pond Radio below!"
    ],
    workStart: [
        "Focus mode active! Time to work on your tasks, ribbit!",
        "Let's put our heads down and study. You've got this!",
        "Shh... Lily is studying with you. Let's make progress!"
    ],
    breakStart: [
        "Yay, break time! Go stretch, drink some water, or do a tiny hop!",
        "Time to rest your eyes and relax. Great job studying, ribbit!",
        "Break time! Let's watch the pond ripples together."
    ],
    timerComplete: [
        "Incredible! We finished all our study sessions today. Hoppy day!",
        "Ribbit! You did a amazing job! Give yourself a nice pat on the back.",
        "All sessions complete! You are officially a productivity champion!"
    ],
    taskAdded: [
        "New task added! Let's hop on it soon, ribbit!",
        "Another item on the list! One hop at a time.",
        "Got it! I've written that down on our lilypad."
    ],
    taskCompleted: [
        "Yay! You completed a task! Ribbit, ribbit!",
        "Beautiful! One task down, a cleaner pond ahead!",
        "Fantastic job checking that off! Feel the progress!"
    ]
};

function speak(category) {
    const list = LILY_SPEECH[category];
    const text = list[Math.floor(Math.random() * list.length)];
    document.getElementById('bubble-text').textContent = text;
}

function adjustCount(inputId, diff) {
    const input = document.getElementById(inputId);
    let val = parseInt(input.value) + diff;
    if (val >= parseInt(input.min) && val <= parseInt(input.max)) {
        input.value = val;
    }
}

function updateProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timer-countdown').textContent = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update progress circle
    const totalDuration = timerMode === 'work' ? workDuration : breakDuration;
    const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;
    updateProgress(progressPercent);

    // Update document title for easy tracking in tabs
    document.title = `(${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}) Froggy Pomodoro`;
}

function initTimerValues() {
    const workMin = parseInt(document.getElementById('session-length').value) || 25;
    const breakMin = parseInt(document.getElementById('break-length').value) || 5;
    totalSessions = parseInt(document.getElementById('work-sessions-input').value) || 4;

    workDuration = workMin * 60;
    breakDuration = breakMin * 60;
}

function toggleTimer() {
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const btn = document.getElementById('btn-timer-toggle');

    if (isTimerRunning) {
        // Pause timer
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.querySelector('span').textContent = 'Resume';
        btn.querySelector('svg').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
        document.getElementById('timer-state').textContent = 'PAUSED';
    } else {
        // Start/Resume timer
        if (timeLeft <= 0) {
            initTimerValues();
            timeLeft = timerMode === 'work' ? workDuration : breakDuration;
        }
        
        isTimerRunning = true;
        btn.querySelector('span').textContent = 'Pause';
        btn.querySelector('svg').innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        document.getElementById('timer-state').textContent = timerMode.toUpperCase();

        speak(timerMode === 'work' ? 'workStart' : 'breakStart');

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                handleTimerExpiry();
            }
        }, 1000);
    }
}

function handleTimerExpiry() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    playRibbit();

    if (timerMode === 'work') {
        // Finished a work session
        if (currentSession < totalSessions) {
            timerMode = 'break';
            timeLeft = breakDuration;
            document.getElementById('timer-state').textContent = 'BREAK';
            speak('breakStart');
            toggleTimer(); // auto start break
        } else {
            // Completed all sessions
            timerMode = 'work';
            timeLeft = 0;
            currentSession = 1;
            document.getElementById('timer-state').textContent = 'COMPLETED';
            document.getElementById('session-counter').textContent = `Done with ${totalSessions} sessions!`;
            speak('timerComplete');
            resetTimerButtons();
            return;
        }
    } else {
        // Finished a break session
        currentSession++;
        timerMode = 'work';
        timeLeft = workDuration;
        document.getElementById('timer-state').textContent = 'FOCUS';
        document.getElementById('session-counter').textContent = `Session ${currentSession} of ${totalSessions}`;
        speak('workStart');
        toggleTimer(); // auto start next work session
    }
}

function resetTimerButtons() {
    const btn = document.getElementById('btn-timer-toggle');
    btn.querySelector('span').textContent = 'Start';
    btn.querySelector('svg').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerMode = 'work';
    currentSession = 1;
    
    initTimerValues();
    timeLeft = workDuration;
    
    document.getElementById('timer-state').textContent = 'FOCUS';
    document.getElementById('session-counter').textContent = `Session 1 of ${totalSessions}`;
    resetTimerButtons();
    updateTimerDisplay();
    document.title = "Froggy Pomodoro - Study, Relax & Hop";
}


/* --- Tasks (To-Do) Backend APIs & Cloud Sync --- */
/* --- State Variables for Calendar, Category, and Urgency --- */
let allTasks = [];
let calendarDate = new Date(Date.UTC(2026, 5, 22)); // Initialized to mock current month: June 2026 in UTC
let selectedDateFilter = null; // YYYY-MM-DD
let customCategories = JSON.parse(localStorage.getItem('froggy_custom_categories') || '[]');

/* --- Tasks (To-Do) Backend APIs & Cloud Sync --- */
// Get tasks from localStorage
function getLocalTasks() {
    const data = localStorage.getItem('froggy_guest_tasks');
    return data ? JSON.parse(data) : [];
}

// Save tasks to localStorage
function saveLocalTasks(tasks) {
    localStorage.setItem('froggy_guest_tasks', JSON.stringify(tasks));
}

// Fetch tasks (either backend or localStorage)
async function fetchTasks() {
    if (isLoggedIn) {
        try {
            const response = await fetch('/api/tasks');
            if (response.ok) {
                const tasks = await response.json();
                allTasks = tasks;
                filterAndSortTasks();
            } else if (response.status === 401) {
                isLoggedIn = false;
                loggedInUser = null;
                updateAuthUI();
                fetchTasks();
            }
        } catch (err) {
            console.error("Error fetching backend tasks:", err);
        }
    } else {
        allTasks = getLocalTasks();
        filterAndSortTasks();
    }
}

// Filter and Sort Pipeline
function filterAndSortTasks() {
    const categoryFilter = document.getElementById('filter-category').value;
    const sortVal = document.getElementById('sort-tasks').value;
    
    let filtered = [...allTasks];
    
    // 1. Filter by category
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => (t.category || 'School') === categoryFilter);
    }
    
    // 2. Filter by calendar selected date
    if (selectedDateFilter) {
        filtered = filtered.filter(t => t.due_date === selectedDateFilter);
    }
    
    // 3. Sort tasks
    const urgencyWeight = { 'high': 3, 'medium': 2, 'low': 1 };
    filtered.sort((a, b) => {
        // Completed tasks are pushed to the bottom
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        if (sortVal === 'dueDateAsc') {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date.localeCompare(b.due_date);
        } else if (sortVal === 'dueDateDesc') {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return b.due_date.localeCompare(a.due_date);
        } else if (sortVal === 'urgencyDesc') {
            const wA = urgencyWeight[a.urgency || 'medium'] || 2;
            const wB = urgencyWeight[b.urgency || 'medium'] || 2;
            return wB - wA;
        } else if (sortVal === 'urgencyAsc') {
            const wA = urgencyWeight[a.urgency || 'medium'] || 2;
            const wB = urgencyWeight[b.urgency || 'medium'] || 2;
            return wA - wB;
        } else {
            // Default: sort by ID descending
            return (b.id + '').localeCompare(a.id + '');
        }
    });
    
    renderTasks(filtered);
    renderCalendar();
}

function renderTasks(tasks) {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    
    let completedCount = 0;
    tasks.forEach(task => {
        if (task.completed) completedCount++;

        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        
        const catColor = getCategoryColor(task.category || 'School');
        const formattedDate = task.due_date ? formatReadableDate(task.due_date) : 'No due date';
        
        li.innerHTML = `
            <div class="todo-item-left">
                <input type="checkbox" class="lily-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', this.checked)">
                <div class="todo-item-content">
                    <span class="todo-text">${escapeHTML(task.title)}</span>
                    <div class="todo-meta-row">
                        ${task.due_date ? `<span class="todo-meta-badge due-badge">📅 ${formattedDate}</span>` : ''}
                        <span class="todo-meta-badge urgency-badge urgency-${task.urgency || 'medium'}">⚡ ${capitalize(task.urgency || 'medium')}</span>
                        <span class="todo-meta-badge category-badge" style="background: ${catColor}22; color: ${catColor}; border: 1px solid ${catColor}44;">🏷️ ${escapeHTML(task.category || 'School')}</span>
                    </div>
                </div>
            </div>
            <button class="btn-delete-task" onclick="deleteTask('${task.id}')" aria-label="Delete task">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/></svg>
            </button>
        `;
        list.appendChild(li);
    });

    document.getElementById('task-stats').textContent = `${completedCount}/${tasks.length} completed`;
}

async function handleAddTask(event) {
    event.preventDefault();
    const input = document.getElementById('task-input');
    const title = input.value.trim();
    if (!title) return;

    const dueDate = document.getElementById('task-due-date').value || null;
    const urgency = document.getElementById('task-urgency').value || 'medium';
    const category = document.getElementById('task-category').value || 'School';

    if (isLoggedIn) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: title,
                    due_date: dueDate,
                    category: category,
                    urgency: urgency
                })
            });
            if (response.ok) {
                input.value = '';
                // reset fields back to defaults
                document.getElementById('task-due-date').value = '2026-06-22';
                document.getElementById('task-urgency').value = 'medium';
                speak('taskAdded');
                fetchTasks();
            } else {
                const errData = await response.json();
                alert("Error adding task: " + (errData.error || response.statusText));
            }
        } catch (err) {
            console.error("Error adding task to backend:", err);
        }
    } else {
        const tasks = getLocalTasks();
        const newTask = {
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            completed: false,
            created_at: new Date().toISOString(),
            due_date: dueDate,
            category: category,
            urgency: urgency
        };
        tasks.unshift(newTask);
        saveLocalTasks(tasks);
        input.value = '';
        document.getElementById('task-due-date').value = '2026-06-22';
        document.getElementById('task-urgency').value = 'medium';
        speak('taskAdded');
        fetchTasks();
    }
}

async function toggleTask(id, completed) {
    if (isLoggedIn) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: completed })
            });
            if (response.ok) {
                if (completed) {
                    playRibbit();
                    speak('taskCompleted');
                }
                fetchTasks();
            }
        } catch (err) {
            console.error("Error updating task on backend:", err);
        }
    } else {
        const tasks = getLocalTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = completed;
            saveLocalTasks(tasks);
            if (completed) {
                playRibbit();
                speak('taskCompleted');
            }
            fetchTasks();
        }
    }
}

async function deleteTask(id) {
    if (confirm("Delete this task from the lily pad, ribbit?")) {
        if (isLoggedIn) {
            try {
                const response = await fetch(`/api/tasks/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    fetchTasks();
                }
            } catch (err) {
                console.error("Error deleting task on backend:", err);
            }
        } else {
            let tasks = getLocalTasks();
            tasks = tasks.filter(t => t.id !== id);
            saveLocalTasks(tasks);
            fetchTasks();
        }
    }
}


/* --- Spotify Integration Player --- */
function playCurated(btn) {
    // Remove active class from other playlist buttons
    document.querySelectorAll('.playlist-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const uri = btn.getAttribute('data-spotify-uri');
    setSpotifyEmbed(uri);
}

function loadCustomSpotify() {
    const input = document.getElementById('spotify-link-input');
    let url = input.value.trim();
    if (!url) return;

    try {
        // Handle spotify:type:id URI
        if (url.startsWith('spotify:')) {
            const parts = url.split(':');
            if (parts.length >= 3) {
                const type = parts[1];
                const id = parts[2];
                if (['playlist', 'track', 'album'].includes(type)) {
                    setSpotifyEmbed(`embed/${type}/${id}`);
                    document.querySelectorAll('.playlist-btn').forEach(b => b.classList.remove('active'));
                    input.value = '';
                    return;
                }
            }
        }

        // Support open.spotify.com links (with optional embed path and search params)
        const matches = url.match(/spotify\.com\/(?:embed\/)?(playlist|track|album)\/([a-zA-Z0-9]+)/);
        if (matches && matches.length >= 3) {
            const type = matches[1];
            const id = matches[2];
            const embedUri = `embed/${type}/${id}`;
            setSpotifyEmbed(embedUri);
            
            // Remove active from predefined buttons since we loaded a custom one
            document.querySelectorAll('.playlist-btn').forEach(b => b.classList.remove('active'));
            input.value = '';
        } else {
            alert("Invalid Spotify link. Please paste a valid Spotify playlist, track, or album URL.");
        }
    } catch (err) {
        console.error("Error parsing Spotify URL:", err);
    }
}

function setSpotifyEmbed(uri) {
    const player = document.getElementById('spotify-player');
    // Ensure we don't duplicate 'embed/' by cleaning the uri first
    const cleanUri = uri.replace(/^embed\//, '');
    player.src = `https://open.spotify.com/embed/${cleanUri}?utm_source=generator&theme=0`;
    
    // Activate head bobbing animation and visual feedback on the frog mascot
    const mascotContainer = document.querySelector('.frog-headphone-container');
    if (mascotContainer) mascotContainer.classList.add('music-playing');
    
    // Make vinyl/spotify logo spin
    const spotifyLogo = document.querySelector('.spotify-logo');
    if (spotifyLogo) spotifyLogo.classList.add('active');
    
    document.getElementById('bubble-text').textContent = "Excellent selection! Cozy tunes active, let's keep working!";
}


/* --- Helpers & Initializations --- */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Page Load Setup
window.addEventListener('DOMContentLoaded', () => {
    // Load initial greeting
    const welcomeTexts = LILY_SPEECH.welcome;
    document.getElementById('bubble-text').textContent = welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)];
    
    // Initialize standard timer inputs display
    initTimerValues();
    timeLeft = workDuration;
    updateTimerDisplay();

    // Set mock date on due date field: 2026-06-22
    document.getElementById('task-due-date').value = '2026-06-22';
    
    // Populate categories select lists
    populateCategoryDropdowns();

    // Check user login status on load
    checkUserStatus();

    // Initial render calendar
    renderCalendar();
});

/* --- Category Management Helpers --- */
function populateCategoryDropdowns() {
    const taskCatSelect = document.getElementById('task-category');
    const filterCatSelect = document.getElementById('filter-category');
    const calCatSelect = document.getElementById('cal-item-category');
    
    const taskSelected = taskCatSelect.value;
    const filterSelected = filterCatSelect.value;
    const calSelected = calCatSelect ? calCatSelect.value : '';
    
    const categories = ['School', 'Work', ...customCategories];
    
    taskCatSelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        taskCatSelect.appendChild(opt);
    });
    
    filterCatSelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filterCatSelect.appendChild(opt);
    });
    
    if (calCatSelect) {
        calCatSelect.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            calCatSelect.appendChild(opt);
        });
        if (categories.includes(calSelected)) {
            calCatSelect.value = calSelected;
        }
    }
    
    if (categories.includes(taskSelected)) {
        taskCatSelect.value = taskSelected;
    }
    if (categories.includes(filterSelected) || filterSelected === 'all') {
        filterCatSelect.value = filterSelected;
    }
}

function promptAddCategory() {
    const newCatName = prompt("Enter new category name, ribbit:");
    if (newCatName) {
        const trimmed = newCatName.trim();
        if (trimmed) {
            const exists = ['school', 'work', ...customCategories.map(c => c.toLowerCase())].includes(trimmed.toLowerCase());
            if (exists) {
                alert("This category already exists, ribbit!");
                return;
            }
            customCategories.push(trimmed);
            localStorage.setItem('froggy_custom_categories', JSON.stringify(customCategories));
            populateCategoryDropdowns();
            document.getElementById('task-category').value = trimmed;
        }
    }
}

function getCategoryColor(categoryName) {
    const defaults = {
        'School': '#87c38f', // Sage Green
        'Work': '#f29e4c',   // Warm Orange
    };
    if (defaults[categoryName]) return defaults[categoryName];
    
    // Hash-based pastel color generator
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#e76f51', // Terracotta
        '#2a9d8f', // Teal
        '#b58db6', // Lavender
        '#457b9d', // Slate blue
        '#b5a48c', // Cozy warm brown
        '#a8dadc'  // Light blue
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

function formatReadableDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const date = new Date(Date.UTC(year, month, day));
    const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString('en-US', options);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* --- Monthly Calendar Functions --- */
function renderCalendar() {
    const grid = document.getElementById('calendar-days-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid || !monthYearLabel) return;
    
    grid.innerHTML = '';
    
    const year = calendarDate.getUTCFullYear();
    const month = calendarDate.getUTCMonth();
    
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;
    
    const firstDayIndex = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    
    // Weekday Padding
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        grid.appendChild(emptyCell);
    }
    
    const mockTodayStr = '2026-06-22';
    
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (dateStr === mockTodayStr) {
            cell.classList.add('today');
        }
        if (dateStr === selectedDateFilter) {
            cell.classList.add('selected');
        }
        
        // Day Num
        const numSpan = document.createElement('span');
        numSpan.className = 'day-num';
        numSpan.textContent = day;
        cell.appendChild(numSpan);
        
        // Day tasks indicators
        const dayTasks = allTasks.filter(t => t.due_date === dateStr);
        if (dayTasks.length > 0) {
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'day-tasks';
            
            const visible = dayTasks.slice(0, 2);
            visible.forEach(task => {
                const ind = document.createElement('div');
                ind.className = `mini-task-indicator urgency-${task.urgency || 'medium'} ${task.completed ? 'completed' : ''}`;
                ind.textContent = task.title;
                ind.title = task.title;
                tasksContainer.appendChild(ind);
            });
            
            if (dayTasks.length > 2) {
                const more = document.createElement('div');
                more.className = 'mini-task-indicator-more';
                more.style.fontSize = '0.68rem';
                more.style.color = 'var(--color-sage)';
                more.style.marginTop = '2px';
                more.textContent = `+${dayTasks.length - 2} more`;
                tasksContainer.appendChild(more);
            }
            
            cell.appendChild(tasksContainer);
        }
        
        cell.addEventListener('click', () => {
            selectCalendarDate(dateStr);
        });
        
        grid.appendChild(cell);
    }
    
    // Sync the quick-add date picker default value with current calendar view
    const calDateInput = document.getElementById('cal-item-date');
    if (calDateInput) {
        if (selectedDateFilter) {
            const parts = selectedDateFilter.split('-');
            const selYear = parseInt(parts[0], 10);
            const selMonth = parseInt(parts[1], 10) - 1;
            if (selYear !== year || selMonth !== month) {
                calDateInput.value = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            } else {
                calDateInput.value = selectedDateFilter;
            }
        } else {
            calDateInput.value = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        }
    }
}

function selectCalendarDate(dateStr) {
    const clearBtn = document.getElementById('btn-clear-date-filter');
    if (selectedDateFilter === dateStr) {
        selectedDateFilter = null;
        if (clearBtn) clearBtn.classList.add('hidden');
    } else {
        selectedDateFilter = dateStr;
        if (clearBtn) {
            clearBtn.classList.remove('hidden');
            clearBtn.textContent = `Clear Filter (${formatReadableDate(dateStr)})`;
        }
    }
    const calDateInput = document.getElementById('cal-item-date');
    if (calDateInput) {
        calDateInput.value = dateStr;
    }
    filterAndSortTasks();
    renderCalendar(); // Highlight selection instantly
}

function clearDateFilter() {
    selectedDateFilter = null;
    const clearBtn = document.getElementById('btn-clear-date-filter');
    if (clearBtn) clearBtn.classList.add('hidden');
    filterAndSortTasks();
    renderCalendar(); // Remove highlighting instantly
}

function changeMonth(dir) {
    calendarDate.setUTCMonth(calendarDate.getUTCMonth() + dir);
    renderCalendar();
}

function openCalendarModal() {
    closeGamesModal(); // Close games drawer if open
    const modal = document.getElementById('calendar-modal');
    if (modal) {
        modal.classList.add('open');
        document.getElementById('cal-item-date').value = selectedDateFilter || '2026-06-22';
        populateCategoryDropdowns();
        renderCalendar();
    }
    const sidebarCalBtn = document.getElementById('btn-sidebar-calendar');
    if (sidebarCalBtn) sidebarCalBtn.classList.add('active');
}

function closeCalendarModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) {
        modal.classList.remove('open');
    }
    const sidebarCalBtn = document.getElementById('btn-sidebar-calendar');
    if (sidebarCalBtn) sidebarCalBtn.classList.remove('active');
}

async function handleCalendarAdd(event) {
    event.preventDefault();
    const titleInput = document.getElementById('cal-item-title');
    const dateInput = document.getElementById('cal-item-date');
    const urgencyInput = document.getElementById('cal-item-urgency');
    const categoryInput = document.getElementById('cal-item-category');
    
    const title = titleInput.value.trim();
    const dueDate = dateInput.value;
    const urgency = urgencyInput.value;
    const category = categoryInput.value;
    
    if (!title || !dueDate) return;
    
    if (isLoggedIn) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: title,
                    due_date: dueDate,
                    category: category,
                    urgency: urgency
                })
            });
            if (response.ok) {
                titleInput.value = '';
                dateInput.value = selectedDateFilter || '2026-06-22';
                speak('taskAdded');
                fetchTasks();
            } else {
                const errData = await response.json();
                alert("Error adding calendar item: " + (errData.error || response.statusText));
            }
        } catch (err) {
            console.error("Error adding calendar item:", err);
        }
    } else {
        const tasks = getLocalTasks();
        const newTask = {
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            completed: false,
            created_at: new Date().toISOString(),
            due_date: dueDate,
            category: category,
            urgency: urgency
        };
        tasks.unshift(newTask);
        saveLocalTasks(tasks);
        titleInput.value = '';
        dateInput.value = selectedDateFilter || '2026-06-22';
        speak('taskAdded');
        fetchTasks();
    }
}

window.openCalendarModal = openCalendarModal;
window.closeCalendarModal = closeCalendarModal;
window.handleCalendarAdd = handleCalendarAdd;


/* --- SQLite Backend Auth Helpers --- */
async function checkUserStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            if (data.logged_in) {
                isLoggedIn = true;
                loggedInUser = data.username;
            } else {
                isLoggedIn = false;
                loggedInUser = null;
            }
            updateAuthUI();
            fetchTasks();
        }
    } catch (err) {
        console.error("Error checking user status:", err);
        isLoggedIn = false;
        loggedInUser = null;
        updateAuthUI();
        fetchTasks();
    }
}

function updateAuthUI() {
    const btnSync = document.getElementById('btn-cloud-sync');
    const syncStatusText = document.getElementById('sync-status-text');
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const loggedInUsername = document.getElementById('logged-in-username');

    if (isLoggedIn && loggedInUser) {
        if (btnSync) btnSync.classList.add('active');
        if (syncStatusText) syncStatusText.textContent = 'Sync Active';
        if (authLoggedOut) authLoggedOut.style.display = 'none';
        if (authLoggedIn) authLoggedIn.style.display = 'block';
        if (loggedInUsername) loggedInUsername.textContent = loggedInUser;
    } else {
        if (btnSync) btnSync.classList.remove('active');
        if (syncStatusText) syncStatusText.textContent = 'Sign In';
        if (authLoggedOut) authLoggedOut.style.display = 'block';
        if (authLoggedIn) authLoggedIn.style.display = 'none';
    }
}

async function handleBackendLogin() {
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        
        if (response.ok) {
            const data = await response.json();
            isLoggedIn = true;
            loggedInUser = data.username;
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            updateAuthUI();
            fetchTasks();
            closeSyncModal();
        } else {
            const errData = await response.json();
            alert("Login failed: " + (errData.error || response.statusText));
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Error connecting to server. Please try again.");
    }
}

async function handleBackendSignup() {
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        
        if (response.ok) {
            const data = await response.json();
            isLoggedIn = true;
            loggedInUser = data.username;
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            updateAuthUI();
            fetchTasks();
            closeSyncModal();
        } else {
            const errData = await response.json();
            alert("Registration failed: " + (errData.error || response.statusText));
        }
    } catch (err) {
        console.error("Registration error:", err);
        alert("Error connecting to server. Please try again.");
    }
}

async function handleBackendLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        if (response.ok) {
            isLoggedIn = false;
            loggedInUser = null;
            updateAuthUI();
            fetchTasks();
            closeSyncModal();
        }
    } catch (err) {
        console.error("Logout error:", err);
    }
}

/* --- Modal Controls --- */
function openSyncModal() {
    document.getElementById('sync-modal').classList.add('open');
}

function closeSyncModal() {
    document.getElementById('sync-modal').classList.remove('open');
}

/* --- Games Modal & 2048 Game Engine --- */
let isGamesModalOpen = false;
let board2048 = [];
let score2048 = 0;
let bestScore2048 = parseInt(localStorage.getItem('froggy_2048_best') || '0', 10);
let hasWon2048 = false;
let isGameOver2048 = false;

function openGamesModal() {
    closeCalendarModal(); // Close calendar drawer if open
    const modal = document.getElementById('games-modal');
    if (modal) {
        modal.classList.add('open');
        isGamesModalOpen = true;
        
        const sidebarGamesBtn = document.getElementById('btn-sidebar-games');
        if (sidebarGamesBtn) sidebarGamesBtn.classList.add('active');
        
        // Initialize game on first open or if empty
        if (board2048.length === 0) {
            init2048();
        }
    }
}

function closeGamesModal() {
    const modal = document.getElementById('games-modal');
    if (modal) {
        modal.classList.remove('open');
    }
    isGamesModalOpen = false;
    const sidebarGamesBtn = document.getElementById('btn-sidebar-games');
    if (sidebarGamesBtn) sidebarGamesBtn.classList.remove('active');
}

function init2048() {
    board2048 = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    score2048 = 0;
    hasWon2048 = false;
    isGameOver2048 = false;
    
    // Hide status overlay
    const msgOverlay = document.getElementById('game-message-2048');
    if (msgOverlay) {
        msgOverlay.className = 'game-message-2048';
    }
    
    spawnTile2048();
    spawnTile2048();
    draw2048();
}

function restart2048() {
    init2048();
}

function spawnTile2048() {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board2048[r][c] === 0) {
                emptyCells.push({r: r, c: c});
            }
        }
    }
    if (emptyCells.length > 0) {
        let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board2048[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    }
}

function draw2048() {
    const tileContainer = document.getElementById('tile-container-2048');
    if (!tileContainer) return;
    
    tileContainer.innerHTML = '';
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const val = board2048[r][c];
            if (val > 0) {
                const tileElem = document.createElement('div');
                tileElem.className = `tile-2048-elem tile-pos-${r}-${c} tile-val-${val}`;
                
                const innerElem = document.createElement('div');
                innerElem.className = 'tile-inner-2048';
                innerElem.textContent = val === 2048 ? '2048 🐸' : val;
                
                tileElem.appendChild(innerElem);
                tileContainer.appendChild(tileElem);
            }
        }
    }
    
    // Update scores
    document.getElementById('score-2048').textContent = score2048;
    if (score2048 > bestScore2048) {
        bestScore2048 = score2048;
        localStorage.setItem('froggy_2048_best', bestScore2048);
    }
    document.getElementById('best-2048').textContent = bestScore2048;
}

// 2048 line slide function
function slideLineLeft(line) {
    let filtered = line.filter(x => x !== 0);
    for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i+1]) {
            filtered[i] *= 2;
            score2048 += filtered[i];
            filtered[i+1] = 0;
            if (filtered[i] === 2048 && !hasWon2048) {
                hasWon2048 = true;
                handle2048Win();
            }
        }
    }
    filtered = filtered.filter(x => x !== 0);
    while (filtered.length < 4) {
        filtered.push(0);
    }
    return filtered;
}

function move2048(direction) {
    if (isGameOver2048) return;
    
    let originalBoard = JSON.stringify(board2048);
    
    if (direction === 'left') {
        for (let r = 0; r < 4; r++) {
            board2048[r] = slideLineLeft(board2048[r]);
        }
    } else if (direction === 'right') {
        for (let r = 0; r < 4; r++) {
            let reversed = [...board2048[r]].reverse();
            let slid = slideLineLeft(reversed);
            board2048[r] = slid.reverse();
        }
    } else if (direction === 'up') {
        for (let c = 0; c < 4; c++) {
            let column = [board2048[0][c], board2048[1][c], board2048[2][c], board2048[3][c]];
            let slid = slideLineLeft(column);
            for (let r = 0; r < 4; r++) {
                board2048[r][c] = slid[r];
            }
        }
    } else if (direction === 'down') {
        for (let c = 0; c < 4; c++) {
            let column = [board2048[0][c], board2048[1][c], board2048[2][c], board2048[3][c]].reverse();
            let slid = slideLineLeft(column);
            slid.reverse();
            for (let r = 0; r < 4; r++) {
                board2048[r][c] = slid[r];
            }
        }
    }
    
    // Check if board state changed
    if (originalBoard !== JSON.stringify(board2048)) {
        spawnTile2048();
        draw2048();
        check2048GameOver();
    }
}

function check2048GameOver() {
    // Check for empty cells
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board2048[r][c] === 0) return;
        }
    }
    
    // Check for adjacent merges
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (c < 3 && board2048[r][c] === board2048[r][c+1]) return;
            if (r < 3 && board2048[r][c] === board2048[r+1][c]) return;
        }
    }
    
    isGameOver2048 = true;
    handle2048Loss();
}

function handle2048Win() {
    const msgOverlay = document.getElementById('game-message-2048');
    const msgText = document.getElementById('game-status-text-2048');
    if (msgOverlay && msgText) {
        msgText.textContent = "You Won! 🐸";
        msgOverlay.className = 'game-message-2048 game-won';
    }
    speak('taskCompleted');
}

function handle2048Loss() {
    const msgOverlay = document.getElementById('game-message-2048');
    const msgText = document.getElementById('game-status-text-2048');
    if (msgOverlay && msgText) {
        msgText.textContent = "Game Over!";
        msgOverlay.className = 'game-message-2048 game-over';
    }
}

// Keyboard arrow controls
window.addEventListener('keydown', function(event) {
    if (!isGamesModalOpen) return;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        
        if (event.key === 'ArrowUp') move2048('up');
        else if (event.key === 'ArrowDown') move2048('down');
        else if (event.key === 'ArrowLeft') move2048('left');
        else if (event.key === 'ArrowRight') move2048('right');
    }
});

// Expose bindings to window
window.openGamesModal = openGamesModal;
window.closeGamesModal = closeGamesModal;
window.restart2048 = restart2048;
window.move2048 = move2048;
