// ============================================================================
// DATA STATE (Replacing Mock Data with Live Data from Backend)
// ============================================================================

let MOCK_DATA = {
    schedule: [],
    spaces: [],
    notes: [],
    labs: [],
    classes: []
};

const API_URL = 'http://localhost:5000/api';

// ============================================================================
// APP STATE
// ============================================================================

let currentUser = null;
let currentSpaceFilter = 'all';
let currentNoteSubject = 'all';
let currentLabFilter = 'all';
let currentClassDay = 'Monday';
let isCheckedIn = null; // { spaceId: 1, activity: 'Studying' }

// ============================================================================
// DOM ELEMENTS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Core Layout
    const toggleThemeBtn = document.querySelector('.toggle-theme');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Views Management
    const viewAuth = document.getElementById('auth-view');
    const viewApp = document.getElementById('app-view');
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const pageViews = document.querySelectorAll('.page-view');
    
    // Auth Forms
    const authForm = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('logout-btn');
    const togglePassword = document.querySelector('.toggle-password');
    
    // Modals
    const checkinModal = document.getElementById('checkin-modal');
    const uploadModal = document.getElementById('upload-modal');
    const closeModals = document.querySelectorAll('.close-modal, .cancel-modal');
    const quickCheckInBtn = document.getElementById('quick-check-in-btn');
    const uploadNoteBtn = document.getElementById('upload-note-btn');
    
    // File Upload logic
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const selectedFileUI = document.getElementById('selected-file');
    const filenameDisplay = document.getElementById('filename-display');
    const removeFileBtn = document.getElementById('remove-file');
    const uploadForm = document.getElementById('upload-form');

    // Filters
    const spaceBuildingFilter = document.getElementById('space-building-filter');
    const noteSearch = document.getElementById('note-search');
    const noteTags = document.querySelectorAll('#notes-tags .tag');
    const labFilters = document.querySelectorAll('.lab-filters .btn-filter');
    const classDayFilters = document.querySelectorAll('#class-day-filters .btn-filter');

    // ============================================================================
    // INITIALIZATION & DATA FETCHING
    // ============================================================================
    
    // Auto-login from saved session
    const savedUser = localStorage.getItem('smartcampus_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            document.getElementById('user-name-display').innerText = currentUser.name;
            viewAuth.classList.remove('active');
            viewApp.classList.add('active');
            loadDataFromBackend(); // Fetch live data
        } catch(e) {
            console.error('Failed to parse saved user credentials');
        }
    }

    async function loadDataFromBackend() {
        try {
            const res = await fetch(`${API_URL}/data`);
            const db = await res.json();
            MOCK_DATA = db; // Inject the live database here
            
            // Re-render everything
            renderDashboardSchedule();
            renderDashboardSpaces();
            renderSpaces();
            renderNotes();
            renderLabs();
            renderClasses();
        } catch (error) {
            console.error(error);
            showToast('Warning: Cannot connect to Backend Database!', 'error');
        }
    }

    // ============================================================================
    // VIEW ROUTING
    // ============================================================================
    
    function switchPage(targetId) {
        navLinks.forEach(link => {
            if(link.getAttribute('data-target') === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        pageViews.forEach(view => {
            if(view.id === `view-${targetId}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            switchPage(link.getAttribute('data-target'));
        });
    });

    // ============================================================================
    // AUTHENTICATION
    // ============================================================================
    
    let isLoginMode = true;
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const nameGroup = document.getElementById('name-group');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleAuthLink = document.getElementById('toggle-auth');
    const authPrompt = document.getElementById('auth-prompt');
    const forgotPasswordDiv = document.getElementById('forgot-password-div');

    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            authTitle.innerText = 'Welcome back';
            authSubtitle.innerText = 'Access your campus resources, real-time availability, and shared notes.';
            nameGroup.style.display = 'none';
            document.getElementById('name').removeAttribute('required');
            authSubmitBtn.innerHTML = `Sign In <i class='bx bx-right-arrow-alt'></i>`;
            if(forgotPasswordDiv) forgotPasswordDiv.style.display = 'block';
            authPrompt.innerText = `Don't have an account? `;
            toggleAuthLink.innerText = `Request access`;
        } else {
            authTitle.innerText = 'Create Account';
            authSubtitle.innerText = 'Join SmartCampus to access resources and study spaces.';
            nameGroup.style.display = 'block';
            document.getElementById('name').setAttribute('required', 'true');
            authSubmitBtn.innerHTML = `Sign Up <i class='bx bx-right-arrow-alt'></i>`;
            if(forgotPasswordDiv) forgotPasswordDiv.style.display = 'none';
            authPrompt.innerText = `Already have an account? `;
            toggleAuthLink.innerText = `Sign in`;
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name') ? document.getElementById('name').value : '';
        
        if (email && password && (isLoginMode || name)) {
            const btn = authSubmitBtn;
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> ${isLoginMode ? 'Authenticating...' : 'Creating Account...'}`;
            btn.disabled = true;
            
            const endpoint = isLoginMode ? '/login' : '/signup';
            const payload = isLoginMode ? { email, password } : { name, email, password };
            
            try {
                const res = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                let data;
                const text = await res.text();
                try {
                    data = JSON.parse(text);
                } catch(e) {
                    data = { success: false, error: 'Invalid server response' };
                }
                
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('smartcampus_user', JSON.stringify(currentUser));
                    localStorage.setItem('smartcampus_token', data.token);
                    document.getElementById('user-name-display').innerText = currentUser.name;
                    document.getElementById('auth-view').classList.remove('active');
                    document.getElementById('app-view').classList.add('active');
                    
                    // Fetch data to start app
                    await loadDataFromBackend();
                    
                    showToast(data.message || (isLoginMode ? 'Successfully logged in!' : 'Account created!'), 'success');
                } else {
                    showToast(data.error || (isLoginMode ? 'Login Failed!' : 'Signup Failed!'), 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Server connection failed. Is the backend running?', 'error');
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('smartcampus_user');
        localStorage.removeItem('smartcampus_token');
        viewApp.classList.remove('active');
        viewAuth.classList.add('active');
        showToast('You have been logged out.');
        
        isCheckedIn = null;
        updateCheckinStatusUI();
    });

    togglePassword.addEventListener('click', () => {
        const input = document.getElementById('password');
        const icon = togglePassword.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('bx-hide', 'bx-show');
        } else {
            input.type = 'password';
            icon.classList.replace('bx-show', 'bx-hide');
        }
    });

    // ============================================================================
    // UI INTERACTIONS
    // ============================================================================
    
    toggleThemeBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            toggleThemeBtn.querySelector('span').innerText = 'Dark Mode';
            toggleThemeBtn.querySelector('i').className = 'bx bx-moon';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            toggleThemeBtn.querySelector('span').innerText = 'Light Mode';
            toggleThemeBtn.querySelector('i').className = 'bx bx-sun';
        }
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    function openModal(modalEl) {
        modalEl.classList.add('active');
    }
    
    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    closeModals.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    });

    // ============================================================================
    // RENDERING DATA: DASHBOARD
    // ============================================================================

    function renderDashboardSchedule() {
        const container = document.getElementById('dashboard-schedule');
        container.innerHTML = MOCK_DATA.schedule.map(item => `
            <li class="timeline-item">
                <span class="time">${item.time}</span>
                <h4>${item.course}</h4>
                <p><i class='bx bx-current-location'></i> ${item.location}</p>
            </li>
        `).join('');
    }

    function renderDashboardSpaces() {
        const container = document.getElementById('dashboard-spaces');
        const trending = [...MOCK_DATA.spaces].sort((a,b) => (b.current/b.capacity) - (a.current/a.capacity)).slice(0, 3);
        
        container.innerHTML = trending.map(space => {
            const perc = Math.round((space.current / space.capacity) * 100);
            let statusClass = 'status-low';
            if (perc > 80) statusClass = 'status-high';
            else if (perc > 50) statusClass = 'status-medium';

            return `
                <div class="space-item-small">
                    <div class="space-info">
                        <h4>${space.name}</h4>
                        <p><span class="status-indicator ${statusClass}"></span> ${space.type}</p>
                    </div>
                    <div class="capacity">
                        ${perc}% Full
                    </div>
                </div>
            `;
        }).join('');
    }

    // ============================================================================
    // RENDERING DATA: SPACES & CHECK-IN
    // ============================================================================

    function renderSpaces() {
        const container = document.getElementById('spaces-container');
        const filtered = currentSpaceFilter === 'all' 
            ? MOCK_DATA.spaces 
            : MOCK_DATA.spaces.filter(s => s.building === currentSpaceFilter);

        container.innerHTML = filtered.map(space => {
            const perc = Math.round((space.current / space.capacity) * 100);
            let meterColor = 'var(--success)';
            if (perc > 85) meterColor = 'var(--danger)';
            else if (perc > 60) meterColor = 'var(--warning)';

            return `
                <div class="space-card">
                    <img src="${space.img}" alt="${space.name}" class="space-img">
                    <div class="space-content">
                        <div class="space-header">
                            <h3>${space.name}</h3>
                            <span class="space-type">${space.type}</span>
                        </div>
                        <p><i class='bx bx-buildings'></i> ${space.building.toUpperCase()} Building</p>
                        
                        <div class="crowd-meter">
                            <div class="meter-header">
                                <span>Capacity</span>
                                <span><strong>${space.current}</strong> / ${space.capacity} (${perc}%)</span>
                            </div>
                            <div class="meter-bar">
                                <div class="meter-fill" style="width: 0%; background-color: ${meterColor};" data-target-width="${perc}%"></div>
                            </div>
                        </div>
                        
                        <button class="btn btn-outline btn-block" onclick="window.triggerCheckIn(${space.id})">
                            <i class='bx bx-qr-scan'></i> Check In Here
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            container.querySelectorAll('.meter-fill').forEach(fill => {
                fill.style.width = fill.getAttribute('data-target-width');
            });
        }, 100);
    }

    spaceBuildingFilter.addEventListener('change', (e) => {
        currentSpaceFilter = e.target.value;
        renderSpaces();
    });

    window.triggerCheckIn = (spaceId) => {
        if (isCheckedIn) {
            showToast('You are already checked in somewhere else! Checkout first.', 'error');
            return;
        }
        const space = MOCK_DATA.spaces.find(s => s.id === spaceId);
        document.getElementById('checkin-location-name').innerText = space.name;
        document.getElementById('checkin-form').dataset.spaceId = spaceId;
        openModal(checkinModal);
    };

    quickCheckInBtn.addEventListener('click', async () => {
        if (isCheckedIn) {
            try {
                // Checkout API call
                await fetch(`${API_URL}/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('smartcampus_token')}` },
                    body: JSON.stringify({ spaceId: isCheckedIn.spaceId })
                });
                await loadDataFromBackend();
                
                isCheckedIn = null;
                updateCheckinStatusUI();
                showToast('Successfully checked out!', 'success');
            } catch (e) {
                showToast('Failed to checkout', 'error');
            }
        } else {
            window.triggerCheckIn(1);
        }
    });

    document.getElementById('checkin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const spaceId = parseInt(e.target.dataset.spaceId);
        const activity = document.getElementById('checkin-activity').value || 'Studying';
        
        try {
            // Checkin API call
            await fetch(`${API_URL}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('smartcampus_token')}` },
                body: JSON.stringify({ spaceId })
            });

            isCheckedIn = { spaceId, activity };
            await loadDataFromBackend(); // refresh UI based on updated DB

            updateCheckinStatusUI();
            closeModal();
            showToast('Successfully checked in!', 'success');
        } catch(error) {
            showToast('Error syncing with backend', 'error');
        }
    });

    function updateCheckinStatusUI() {
        const display = document.getElementById('current-status-text');
        
        if (isCheckedIn) {
            const space = MOCK_DATA.spaces.find(s => s.id === isCheckedIn.spaceId);
            display.innerHTML = `<span style="color:var(--success)">Checked in at ${space.name}</span>`;
            quickCheckInBtn.innerHTML = `<i class='bx bx-log-out'></i> Check Out`;
            quickCheckInBtn.classList.replace('btn-primary', 'btn-outline');
        } else {
            display.innerText = "Not Checked In";
            quickCheckInBtn.innerHTML = `<i class='bx bx-qr-scan'></i> Check In`;
            quickCheckInBtn.classList.replace('btn-outline', 'btn-primary');
        }
    }

    // ============================================================================
    // RENDERING DATA: NOTES HUB
    // ============================================================================

    function renderNotes() {
        const container = document.getElementById('notes-container');
        const query = noteSearch.value.toLowerCase();
        
        const filtered = MOCK_DATA.notes.filter(n => {
            const matchSubject = currentNoteSubject === 'all' || n.subject === currentNoteSubject;
            const matchQuery = n.title.toLowerCase().includes(query) || n.course.toLowerCase().includes(query);
            return matchSubject && matchQuery;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted)">
                <i class='bx bx-folder-open' style="font-size: 3rem;"></i>
                <p>No notes found matching your criteria.</p>
            </div>`;
            return;
        }

        container.innerHTML = filtered.map(note => {
            const fileLink = note.fileUrl ? `<a href="http://localhost:5000${note.fileUrl}" target="_blank" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-bottom: 1rem; display: inline-block;"><i class='bx bx-link-external'></i> View File</a>` : '';
            return `
            <div class="note-card">
                <div class="note-icon">
                    <i class='bx bxs-file-pdf'></i>
                </div>
                <h3>${note.title}</h3>
                <span class="note-course">${note.course}</span>
                <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Uploaded by ${note.author}</p>
                ${fileLink}
                <div class="note-meta">
                    <span><i class='bx bx-calendar'></i> ${note.date}</span>
                    <span><i class='bx bx-download'></i> ${note.downloads}</span>
                </div>
            </div>
        `}).join('');
    }

    noteSearch.addEventListener('input', renderNotes);
    
    noteTags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            noteTags.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentNoteSubject = e.target.getAttribute('data-subject');
            renderNotes();
        });
    });

    uploadNoteBtn.addEventListener('click', () => {
        openModal(uploadModal);
    });

    // Drag and Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if(file.type !== "application/pdf") {
                showToast("Only PDF files are allowed", "error");
                return;
            }
            dropzone.style.display = 'none';
            selectedFileUI.style.display = 'flex';
            filenameDisplay.innerText = file.name;
        }
    }

    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        dropzone.style.display = 'block';
        selectedFileUI.style.display = 'none';
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selectedFileUI.style.display === 'none') {
            showToast('Please select a PDF file first', 'error');
            return;
        }
        
        const inputs = uploadForm.querySelectorAll('input, select');
        const course = inputs[1].value;
        const subject = inputs[2].value;
        const title = inputs[3].value;
        const file = fileInput.files[0];

        const formData = new FormData();
        formData.append('title', title);
        formData.append('course', course);
        formData.append('subject', subject);
        formData.append('author', currentUser.name);
        formData.append('file', file);

        try {
            // Push via API
            await fetch(`${API_URL}/notes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('smartcampus_token')}` },
                body: formData
            });

            await loadDataFromBackend(); // Reload UI

            closeModal();
            showToast('Notes uploaded successfully!', 'success');
            
            uploadForm.reset();
            fileInput.value = '';
            dropzone.style.display = 'block';
            selectedFileUI.style.display = 'none';
        } catch (err) {
            showToast('Failed to upload notes permanently.', 'error');
        }
    });

    // ============================================================================
    // RENDERING DATA: LAB SCHEDULE
    // ============================================================================

    function renderLabs() {
        const container = document.getElementById('labs-container');
        
        const filtered = currentLabFilter === 'all'
            ? MOCK_DATA.labs
            : MOCK_DATA.labs.filter(l => l.type === currentLabFilter || l.type === 'all');
            
        container.innerHTML = filtered.map(lab => {
            const rowWidth = 10;
            const blockHtml = lab.bookings.map(b => {
                const widthPerc = (b.length / rowWidth) * 100;
                const leftPerc = (b.startIdx / rowWidth) * 100;
                return `
                    <div class="booking-block booking-${b.type}" style="left: ${leftPerc}%; width: ${widthPerc}%;" title="${b.label}">
                        ${b.label}
                    </div>
                `;
            }).join('');

            return `
                <div class="lab-row">
                    <div class="lab-info">
                        <h4>${lab.name}</h4>
                        <span>${lab.type.toUpperCase()}</span>
                    </div>
                    <div class="lab-slots">
                        ${blockHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    labFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            labFilters.forEach(f => f.classList.remove('active'));
            e.target.classList.add('active');
            currentLabFilter = e.target.getAttribute('data-lab');
            renderLabs();
        });
    });

    // ============================================================================
    // RENDERING DATA: CLASS SCHEDULE
    // ============================================================================

    function renderClasses() {
        if (!MOCK_DATA.classes) return;
        const container = document.getElementById('classes-list-container');
        const header = document.getElementById('class-list-header');
        
        if (header) {
            header.innerText = `Classes for ${currentClassDay}`;
        }
        
        const filtered = MOCK_DATA.classes.filter(c => c.day === currentClassDay);
        
        if (filtered.length === 0) {
            container.innerHTML = `<li class="timeline-item" style="padding: 2rem; text-align: center;"><p style="font-size: 1.1rem; color: var(--text-muted);"><i class='bx bx-info-circle'></i> No regular theory classes scheduled for ${currentClassDay}.</p></li>`;
            return;
        }

        container.innerHTML = filtered.map((c, index) => `
            <div class="timeline-h-item" style="animation-delay: ${index * 0.1}s; opacity: 0;">
                <div><span class="time">${c.time}</span></div>
                <h4>${c.course}</h4>
                <p><i class='bx bx-current-location'></i> Room ${c.location}</p>
            </div>
        `).join('');
    }

    if (classDayFilters) {
        classDayFilters.forEach(btn => {
            btn.addEventListener('click', (e) => {
                classDayFilters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                currentClassDay = e.target.getAttribute('data-day');
                renderClasses();
            });
        });
    }

    // ============================================================================
    // TOAST NOTIFICATIONS
    // ============================================================================

    function showToast(message, type = 'default') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'bx-info-circle';
        if (type === 'success') icon = 'bx-check-circle';
        if (type === 'error') icon = 'bx-x-circle';
        
        toast.innerHTML = `
            <i class='bx ${icon}'></i>
            <span class="toast-msg">${message}</span>
        `;
        
        container.appendChild(toast);
        
        void toast.offsetWidth;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    window.showToast = showToast;
});
