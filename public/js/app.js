// CodeShelf - Folder-First Controller
let state = {
  layout: 'line', // Always default to 'line' (Line by Line)
  subjects: [],
  folders: [],
  activeFolderId: null,
  activeFolder: null,
  folderPrograms: [],
  stats: null,
  filters: {
    subject_id: '',
    search: '',
    language: '',
  },
  editingProgramId: null,
};

// Language file extension mapping for downloads
const LANG_EXTENSIONS = {
  c: 'c',
  cpp: 'cpp',
  python: 'py',
  java: 'java',
  sql: 'sql',
  javascript: 'js',
  typescript: 'ts',
  go: 'go',
  rust: 'rs',
  html: 'html',
  css: 'css',
  php: 'php',
  ruby: 'rb',
  csharp: 'cs',
  kotlin: 'kt',
  swift: 'swift',
  dart: 'dart',
  bash: 'sh',
};

// Admin Mode & Direct Access (Zero Auth required)
function isAdmin() {
  return true;
}

function updateAdminUI() {
  if (!state.activeFolderId) {
    renderFoldersDirectory();
  } else {
    renderFolderPrograms();
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initLayoutSwitcher();
  updateAdminUI();
  loadData();
});

// Event Listeners Setup
function initEventListeners() {
  // Global / Folder Search with Debounce
  const searchInput = document.getElementById('globalSearch');
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        if (state.activeFolderId) {
          loadFolderPrograms(state.activeFolderId);
        } else {
          loadFolders();
        }
      }, 250);
    });
  }

  // Layout Switcher: Side by Side vs Line by Line
  const btnGrid = document.getElementById('btnLayoutGrid');
  const btnList = document.getElementById('btnLayoutList');
  if (btnGrid) btnGrid.addEventListener('click', () => setLayout('grid'));
  if (btnList) btnList.addEventListener('click', () => setLayout('line'));

  // Inside-Folder Language Filter
  const folderLangFilter = document.getElementById('folderLanguageFilter');
  if (folderLangFilter) {
    folderLangFilter.addEventListener('change', (e) => {
      state.filters.language = e.target.value;
      if (state.activeFolderId) {
        loadFolderPrograms(state.activeFolderId);
      }
    });
  }

  // Add Code / Program Button inside Active Folder
  const btnAddProgToCurrentFolder = document.getElementById('btnAddProgToCurrentFolder');
  if (btnAddProgToCurrentFolder) {
    btnAddProgToCurrentFolder.addEventListener('click', () => {
      if (state.activeFolder) {
        openProgramModal(null, state.activeFolder.subject_id, state.activeFolder.id);
      } else {
        openProgramModal();
      }
    });
  }

  // Modal Close Handlers
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.btn-close') || e.target.closest('.btn-modal-cancel')) {
        closeAllModals();
      }
    });
  });

  // Forms
  document.getElementById('programForm').addEventListener('submit', handleProgramSubmit);
  document.getElementById('subjectForm').addEventListener('submit', handleSubjectSubmit);

  const folderForm = document.getElementById('folderForm');
  if (folderForm) {
    folderForm.addEventListener('submit', handleFolderSubmit);
  }

  // Keyboard Shortcuts (Ctrl+K for search, Escape for modal close)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Language Selector Custom Handling in Program Form
  const progLangSelect = document.getElementById('progLang');
  const progCustomLangInput = document.getElementById('progCustomLang');
  const btnToggleCustomLang = document.getElementById('btnToggleCustomLang');

  if (progLangSelect && progCustomLangInput) {
    progLangSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        progCustomLangInput.style.display = 'block';
        progCustomLangInput.focus();
      } else {
        progCustomLangInput.style.display = 'none';
      }
    });
  }

  if (btnToggleCustomLang && progCustomLangInput) {
    btnToggleCustomLang.addEventListener('click', () => {
      const isHidden = progCustomLangInput.style.display === 'none';
      progCustomLangInput.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        progLangSelect.value = '__custom__';
        progCustomLangInput.focus();
      }
    });
  }

  // Quick Add Subject Button from Program Form
  const btnQuickAddSubject = document.getElementById('btnQuickAddSubjectFromProg');
  if (btnQuickAddSubject) {
    btnQuickAddSubject.addEventListener('click', () => openSubjectModal());
  }

  // Manual Subject Toggle for Folder Modal
  const folderSubSelect = document.getElementById('folderSubject');
  const folderCustomSubInput = document.getElementById('folderCustomSubject');
  const btnToggleManualFolderSubModal = document.getElementById('btnToggleManualFolderSubjectModal');

  if (folderSubSelect && folderCustomSubInput) {
    folderSubSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        folderCustomSubInput.style.display = 'block';
        folderCustomSubInput.focus();
      } else {
        folderCustomSubInput.style.display = 'none';
      }
    });
  }

  if (btnToggleManualFolderSubModal && folderCustomSubInput && folderSubSelect) {
    btnToggleManualFolderSubModal.addEventListener('click', () => {
      const isHidden = folderCustomSubInput.style.display === 'none';
      folderCustomSubInput.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        folderSubSelect.value = '__custom__';
        folderCustomSubInput.focus();
      } else {
        folderSubSelect.value = '';
      }
    });
  }

  // Code Editor Tab Key Handling (insert 4 spaces)
  const codeEditor = document.getElementById('progCode');
  if (codeEditor) {
    codeEditor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
      }
    });
  }
}

// Layout Switcher (Side by Side vs Line by Line)
function initLayoutSwitcher() {
  setLayout(state.layout, false);
}

function setLayout(mode, shouldRerender = true) {
  state.layout = mode;
  localStorage.setItem('codeshelf_layout', mode);

  const btnGrid = document.getElementById('btnLayoutGrid');
  const btnList = document.getElementById('btnLayoutList');

  if (btnGrid && btnList) {
    btnGrid.classList.toggle('active', mode === 'grid');
    btnList.classList.toggle('active', mode === 'line');
  }

  if (shouldRerender && state.activeFolderId) {
    renderFolderPrograms();
  }
}

// Master Data Load
async function loadData() {
  try {
    await Promise.all([loadStats(), loadSubjects(), loadLanguages(), loadFolders()]);
  } catch (err) {
    console.error('Initial load error:', err);
    showToast('Failed to connect to CodeShelf API.', 'error');
  }
}

// Load dynamic languages
async function loadLanguages() {
  try {
    const langs = await API.getLanguages();
    const folderLangFilter = document.getElementById('folderLanguageFilter');
    const baseLangs = [
      'c', 'cpp', 'python', 'java', 'sql', 'javascript', 'typescript',
      'go', 'rust', 'csharp', 'php', 'kotlin', 'swift', 'dart', 'ruby', 'bash'
    ];
    const allLangs = Array.from(new Set([...baseLangs, ...(langs || [])])).sort();

    if (folderLangFilter) {
      folderLangFilter.innerHTML = '<option value="">All Languages</option>';
      allLangs.forEach((l) => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l.toUpperCase();
        if (state.filters.language && state.filters.language.toLowerCase() === l.toLowerCase()) {
          opt.selected = true;
        }
        folderLangFilter.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn('Could not populate languages:', e);
  }
}

// Load Live Repository Stats
async function loadStats() {
  try {
    const stats = await API.getStats();
    state.stats = stats;
    const folders = await API.getAllFolders();
    const folderCount = folders ? folders.length : 0;

    const statFolders = document.getElementById('statFolders');
    const statSubjects = document.getElementById('statSubjects');
    const statPrograms = document.getElementById('statPrograms');

    if (statFolders) statFolders.textContent = folderCount;
    if (statSubjects) statSubjects.textContent = stats.total_subjects || 0;
    if (statPrograms) statPrograms.textContent = stats.total_programs || 0;
  } catch (e) {
    console.warn('Could not load stats:', e);
  }
}

// Load Subjects into Select Dropdowns
async function loadSubjects() {
  try {
    const subjects = await API.getSubjects();
    state.subjects = subjects;

    // 1. Inline folder form subject dropdown (Start screen)
    const inlineSubSelect = document.getElementById('inlineFolderSubject');
    if (inlineSubSelect) {
      inlineSubSelect.innerHTML = '<option value="">Select Subject Category...</option>';
      subjects.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.program_count || 0} pgms)`;
        inlineSubSelect.appendChild(opt);
      });
    }

    // 2. Folder Explorer Filter Dropdown
    const folderExpFilter = document.getElementById('folderExplorerSubjectFilter');
    if (folderExpFilter) {
      folderExpFilter.innerHTML = '<option value="">All Subjects</option>';
      subjects.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        if (String(state.filters.subject_id) === String(s.id)) opt.selected = true;
        folderExpFilter.appendChild(opt);
      });
    }

    // 3. Program Modal Subject Dropdown
    const progSubjectSelect = document.getElementById('progSubject');
    if (progSubjectSelect) {
      progSubjectSelect.innerHTML = '<option value="">Select a Subject...</option>';
      subjects.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        progSubjectSelect.appendChild(opt);
      });
    }

    // 4. Modal Folder Form Subject Dropdown
    const folderSubjectSelect = document.getElementById('folderSubject');
    if (folderSubjectSelect) {
      folderSubjectSelect.innerHTML = '<option value="">General (Optional)</option>';
      subjects.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        folderSubjectSelect.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = '__custom__';
      customOpt.textContent = '+ Enter Custom / New Subject...';
      folderSubjectSelect.appendChild(customOpt);
    }
  } catch (e) {
    console.error('Error loading subjects:', e);
  }
}

// ==========================================
// FOLDER CREATION & DIRECTORY
// ==========================================

// Open Folder Modal
function openFolderModal(defaultSubjectId = '') {
  const form = document.getElementById('folderForm');
  if (form) form.reset();
  const customSubInput = document.getElementById('folderCustomSubject');
  if (customSubInput) customSubInput.style.display = 'none';

  const select = document.getElementById('folderSubject');
  if (select) {
    if (defaultSubjectId) {
      select.value = defaultSubjectId;
    } else if (state.subjects.length > 0) {
      select.value = state.subjects[0].id;
    }
  }
  const modal = document.getElementById('folderModal');
  if (modal) modal.classList.add('active');
}

// Handle Folder Form Submission
async function handleFolderSubmit(e) {
  e.preventDefault();
  let subjectId = document.getElementById('folderSubject').value;
  const customSubInput = document.getElementById('folderCustomSubject');
  const customSubName = customSubInput ? customSubInput.value.trim() : '';
  const name = document.getElementById('folderName').value.trim();
  const description = document.getElementById('folderDesc').value.trim();

  if (!name) {
    alert('Folder name is required.');
    return;
  }

  // Handle manual subject adding
  if (customSubName || subjectId === '__custom__') {
    if (!customSubName) {
      alert('Please enter a name for the new subject category.');
      if (customSubInput) {
        customSubInput.style.display = 'block';
        customSubInput.focus();
      }
      return;
    }
    let existingSub = state.subjects.find((s) => s.name.toLowerCase() === customSubName.toLowerCase());
    if (existingSub) {
      subjectId = existingSub.id;
    } else {
      try {
        const createdSub = await API.createSubject({
          name: customSubName,
          description: `${customSubName} programming topics`,
          icon: '📁'
        });
        state.subjects.push(createdSub);
        subjectId = createdSub.id;
      } catch (err) {
        showToast('Subject error: ' + err.message, 'error');
        return;
      }
    }
  } else if (!subjectId) {
    let generalSub = state.subjects.find((s) => s.name.toLowerCase() === 'general');
    if (!generalSub && state.subjects.length > 0) {
      try {
        generalSub = await API.createSubject({ name: 'General', description: 'General Topics', icon: '📁' });
        state.subjects.push(generalSub);
      } catch (err) {
        generalSub = state.subjects[0];
      }
    }
    subjectId = generalSub ? generalSub.id : 1;
  }

  try {
    const createdFolder = await API.createFolder(subjectId, { name, description });
    showToast(`Folder "${name}" created! Opening workspace...`, 'success');
    closeAllModals();
    if (customSubInput) customSubInput.style.display = 'none';

    await Promise.all([loadStats(), loadSubjects(), loadFolders()]);

    // Immediately open the newly created folder!
    openFolderDetail(createdFolder.id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load All Folders across subjects
async function loadFolders() {
  try {
    const folders = await API.getAllFolders(state.filters.subject_id);
    state.folders = folders || [];
    if (!state.activeFolderId) {
      renderFoldersDirectory();
    }
  } catch (err) {
    console.error('Error loading folders:', err);
  }
}

// Render Folder Cards in the Start Directory
function renderFoldersDirectory() {
  const container = document.getElementById('foldersContainer');
  if (!container) return;
  container.innerHTML = '';

  let filtered = state.folders;
  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.subject_name && f.subject_name.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📁</div>
        <h3 style="color: #fff; margin-bottom: 6px;">No folders found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          No topic folders available.
        </p>
      </div>
    `;
    return;
  }

  filtered.forEach((f) => {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.onclick = () => openFolderDetail(f.id);

    card.innerHTML = `
      <div class="folder-card-top">
        <div class="folder-card-icon">📁</div>
        <span class="badge-subject">${escapeHtml(f.subject_name || 'Subject')}</span>
      </div>

      <div>
        <h3 class="folder-card-name">${escapeHtml(f.name)}</h3>
        <p class="folder-card-desc">${escapeHtml(f.description || 'Topic folder for programming solutions.')}</p>
      </div>

      <div class="folder-card-footer">
        <span class="folder-count-badge">💻 ${f.program_count || 0} Programs</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openFolderDetail(${f.id})">
          Open Folder →
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// FOLDER WORKSPACE (ADDING & VIEWING PROGRAMS)
// ==========================================

// Open and view programs inside a specific folder
async function openFolderDetail(folderId) {
  try {
    state.activeFolderId = folderId;
    const folder = await API.getFolderById(folderId);
    state.activeFolder = folder;

    const startView = document.getElementById('startFoldersView');
    const activeView = document.getElementById('activeFolderView');

    if (startView) startView.style.display = 'none';
    if (activeView) activeView.style.display = 'block';

    const titleEl = document.getElementById('activeFolderTitle');
    if (titleEl) {
      titleEl.innerHTML = `📁 <strong>${escapeHtml(folder.name)}</strong> <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(${escapeHtml(folder.subject_name || 'Subject')})</span>`;
    }

    state.filters.language = '';
    await loadFolderPrograms(folderId);
  } catch (err) {
    showToast('Failed to open folder: ' + err.message, 'error');
  }
}

// Load programs inside active folder
async function loadFolderPrograms(folderId) {
  try {
    const filters = { folder_id: folderId };
    if (state.filters.search) filters.search = state.filters.search;

    const progs = await API.getPrograms(filters);
    state.folderPrograms = progs || [];

    renderFolderPrograms();
  } catch (err) {
    console.error('Error loading folder programs:', err);
  }
}

// Render programs inside active folder (Streamlined Line-by-Line list view)
function renderFolderPrograms() {
  const container = document.getElementById('folderProgramsContainer');
  if (!container) return;

  container.innerHTML = '';
  container.classList.add('line-by-line');

  if (state.folderPrograms.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="width: 100%;">
        <div class="empty-icon">📝</div>
        <h3 style="color: #fff; margin-bottom: 6px;">This folder has no programs yet</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          No programs added to this folder yet.
        </p>
      </div>
    `;
    return;
  }

  // ☰ Line by Line Layout (Horizontal Rows)
  state.folderPrograms.forEach((prog) => {
    const row = document.createElement('div');
    row.className = 'program-row';

    row.innerHTML = `
      <div class="program-row-main">
        <div class="program-row-header">
          <span class="badge-lang">${escapeHtml(prog.language)}</span>
          <span class="program-row-title" onclick="openViewProgramModal(${prog.id})">${escapeHtml(prog.title)}</span>
        </div>
        <div class="program-row-desc">${escapeHtml(prog.description || 'No description provided.')}</div>
      </div>

      <div class="program-row-aside">
        <button class="btn btn-secondary btn-sm" onclick="copyCodeQuick(event, ${prog.id})" title="Copy Code">
          📋 Copy Code
        </button>
        <button class="btn btn-outline btn-sm" onclick="openViewProgramModal(${prog.id})">
          View Details →
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}



// Return from Folder Workspace to Start Screen
function backToAllFolders(e) {
  if (e) e.preventDefault();
  state.activeFolderId = null;
  state.activeFolder = null;
  state.folderPrograms = [];

  const startView = document.getElementById('startFoldersView');
  const activeView = document.getElementById('activeFolderView');

  if (startView) startView.style.display = 'block';
  if (activeView) activeView.style.display = 'none';

  loadFolders();
  loadStats();
}

// Quick 1-click copy from card/row with visual feedback
function copyCodeQuick(e, programId) {
  e.stopPropagation();
  let prog = state.folderPrograms.find((p) => p.id === programId);
  if (!prog) return;

  const btn = e.currentTarget;
  const originalHtml = btn.innerHTML;

  navigator.clipboard.writeText(prog.code).then(() => {
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('btn-copied');
    showToast(`Source code for "${prog.title}" copied to clipboard!`, 'success');

    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.classList.remove('btn-copied');
    }, 2000);
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

// ==========================================
// PROGRAM MODAL (ADD / EDIT)
// ==========================================

// Open Program Form Modal (Locked to active folder & subject)
async function openProgramModal(existingProg = null, prefillSubjectId = null, prefillFolderId = null) {
  const modal = document.getElementById('programModal');
  const titleEl = document.getElementById('programModalHeaderTitle');
  const form = document.getElementById('programForm');
  const customLangInput = document.getElementById('progCustomLang');
  const langSelect = document.getElementById('progLang');

  if (customLangInput) {
    customLangInput.style.display = 'none';
    customLangInput.value = '';
  }

  if (existingProg) {
    state.editingProgramId = existingProg.id;
    titleEl.textContent = 'Edit Program';
    document.getElementById('progSubject').value = existingProg.subject_id;
    await updateProgramFolders(existingProg.subject_id, existingProg.folder_id);
    if (document.getElementById('progAuthor')) document.getElementById('progAuthor').value = existingProg.author_name || '';
    document.getElementById('progTitle').value = existingProg.title;

    const existingLangLower = (existingProg.language || 'python').toLowerCase();
    let found = false;
    for (let i = 0; i < langSelect.options.length; i++) {
      if (langSelect.options[i].value === existingLangLower) {
        langSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      langSelect.value = '__custom__';
      if (customLangInput) {
        customLangInput.style.display = 'block';
        customLangInput.value = existingProg.language;
      }
    }

    document.getElementById('progDesc').value = existingProg.description || '';
    document.getElementById('progCode').value = existingProg.code;
    if (document.getElementById('progOutput')) document.getElementById('progOutput').value = existingProg.sample_output || '';
    if (document.getElementById('progTime')) document.getElementById('progTime').value = existingProg.time_complexity || '';
    if (document.getElementById('progSpace')) document.getElementById('progSpace').value = existingProg.space_complexity || '';
    document.getElementById('progTags').value = existingProg.tags || '';
    document.getElementById('btnSaveProgram').textContent = 'Update Program';
  } else {
    state.editingProgramId = null;
    titleEl.textContent = 'Add Program to Folder';
    form.reset();
    if (document.getElementById('progAuthor')) document.getElementById('progAuthor').value = '';

    const targetSub = prefillSubjectId || (state.activeFolder ? state.activeFolder.subject_id : (state.subjects[0] ? state.subjects[0].id : ''));
    const targetFolder = prefillFolderId || (state.activeFolder ? state.activeFolder.id : '');

    if (targetSub) {
      document.getElementById('progSubject').value = targetSub;
      await updateProgramFolders(targetSub, targetFolder);
    }
    document.getElementById('btnSaveProgram').textContent = 'Save Program into Folder';
  }

  modal.classList.add('active');
}

// Update Program Form Folders Dropdown
async function updateProgramFolders(subjectId, selectedFolderId = null) {
  const progFolderSelect = document.getElementById('progFolder');
  if (!progFolderSelect) return;
  progFolderSelect.innerHTML = '<option value="">Root / General (No Sub-folder)</option>';
  if (!subjectId) return;

  try {
    const folders = await API.getFolders(subjectId);
    folders.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `📁 ${f.name} (${f.program_count || 0} pgms)`;
      if (selectedFolderId && String(selectedFolderId) === String(f.id)) {
        opt.selected = true;
      }
      progFolderSelect.appendChild(opt);
    });
  } catch (err) {
    console.warn('Could not load folders for program dropdown:', err);
  }
}

// Handle Program Form Submission (Permanent SQLite Save)
async function handleProgramSubmit(e) {
  e.preventDefault();
  const subjectId = document.getElementById('progSubject').value;
  const folderId = document.getElementById('progFolder') ? document.getElementById('progFolder').value : '';
  const authorName = document.getElementById('progAuthor') ? document.getElementById('progAuthor').value.trim() : 'Admin';
  const title = document.getElementById('progTitle').value.trim();

  let language = document.getElementById('progLang').value;
  const customLangInput = document.getElementById('progCustomLang');
  if (language === '__custom__' || (customLangInput && customLangInput.style.display !== 'none')) {
    const customVal = customLangInput.value.trim();
    if (!customVal) {
      alert('Please type the custom programming language name.');
      customLangInput.focus();
      return;
    }
    language = customVal.toLowerCase();
  }

  const description = document.getElementById('progDesc').value.trim();
  const code = document.getElementById('progCode').value;
  const sample_output = document.getElementById('progOutput') ? document.getElementById('progOutput').value.trim() : '';
  const time_complexity = document.getElementById('progTime') ? document.getElementById('progTime').value.trim() : '';
  const space_complexity = document.getElementById('progSpace') ? document.getElementById('progSpace').value.trim() : '';
  const tags = document.getElementById('progTags').value.trim();

  if (!subjectId) {
    alert('Please select a subject category.');
    return;
  }
  if (!title || !code) {
    alert('Title and Source Code are required.');
    return;
  }

  const payload = {
    subject_id: subjectId,
    folder_id: folderId || null,
    author_name: authorName || 'Admin',
    title,
    language,
    description,
    code,
    sample_output,
    time_complexity,
    space_complexity,
    tags,
  };

  try {
    let savedProg;
    if (state.editingProgramId) {
      await API.updateProgram(state.editingProgramId, payload);
      showToast('Program updated successfully in database!', 'success');
      savedProg = { id: state.editingProgramId };
    } else {
      savedProg = await API.createProgram(payload);
    }

    // Automatically copy the uploaded code to clipboard for the user!
    try {
      await navigator.clipboard.writeText(code);
      showToast(`🎉 Program "${title}" added to folder! Code copied to clipboard.`, 'success');
    } catch (clipErr) {
      showToast(`Program permanently saved to database!`, 'success');
    }

    closeAllModals();
    await Promise.all([loadStats(), loadSubjects(), loadLanguages()]);

    // If currently inside a folder, refresh it immediately
    const targetFolderToOpen = folderId || (state.activeFolder ? state.activeFolder.id : null);
    if (targetFolderToOpen) {
      await openFolderDetail(targetFolderToOpen);
    }

    // Immediately open the uploaded program in view modal so user can view & re-copy
    if (savedProg && savedProg.id) {
      openViewProgramModal(savedProg.id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// VIEW PROGRAM DETAILS MODAL
// ==========================================

async function openViewProgramModal(programId) {
  try {
    const prog = await API.getProgram(programId);
    document.getElementById('viewModalTitle').textContent = prog.title;
    document.getElementById('viewModalSubject').textContent = prog.subject_name;
    document.getElementById('viewModalLang').textContent = prog.language;

    const folderEl = document.getElementById('viewModalFolder');
    if (folderEl) {
      if (prog.folder_name) {
        folderEl.textContent = `📁 ${prog.folder_name}`;
        folderEl.style.display = 'inline-flex';
      } else {
        folderEl.style.display = 'none';
      }
    }

    const authorEl = document.getElementById('viewModalAuthor');
    if (authorEl) {
      authorEl.style.display = 'none';
    }

    const timeEl = document.getElementById('viewModalTime');
    if (timeEl) timeEl.textContent = `Time: ${prog.time_complexity || 'O(N)'}`;
    const spaceEl = document.getElementById('viewModalSpace');
    if (spaceEl) spaceEl.textContent = `Space: ${prog.space_complexity || 'O(1)'}`;

    // Code & Syntax Highlighting
    const codeEl = document.getElementById('viewModalCode');
    codeEl.className = `language-${prog.language}`;
    codeEl.textContent = prog.code;

    if (window.Prism) {
      Prism.highlightElement(codeEl);
    }

    // Sample Output
    const outputContainer = document.getElementById('viewModalOutputContainer');
    if (outputContainer) {
      if (prog.sample_output && prog.sample_output.trim()) {
        outputContainer.style.display = 'block';
        const outputEl = document.getElementById('viewModalOutput');
        if (outputEl) outputEl.textContent = prog.sample_output;
      } else {
        outputContainer.style.display = 'none';
      }
    }

    // Tags
    const tagsContainer = document.getElementById('viewModalTags');
    tagsContainer.innerHTML = '';
    if (prog.tags) {
      const tagList = prog.tags.split(',').map((t) => t.trim()).filter(Boolean);
      tagList.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = `#${tag}`;
        span.onclick = () => {
          closeAllModals();
          state.filters.search = tag;
          if (state.activeFolderId) {
            loadFolderPrograms(state.activeFolderId);
          }
        };
        tagsContainer.appendChild(span);
      });
    }

    // Modal Copy Button with feedback
    const copyBtnModal = document.getElementById('btnCopyCodeModal');
    copyBtnModal.textContent = '📋 Copy Code';
    copyBtnModal.classList.remove('btn-copied');
    copyBtnModal.onclick = () => {
      navigator.clipboard.writeText(prog.code).then(() => {
        copyBtnModal.textContent = '✅ Copied to Clipboard!';
        copyBtnModal.classList.add('btn-copied');
        showToast(`Code for "${prog.title}" copied to clipboard!`, 'success');
        setTimeout(() => {
          copyBtnModal.textContent = '📋 Copy Code';
          copyBtnModal.classList.remove('btn-copied');
        }, 2200);
      });
    };

    document.getElementById('btnDownloadCodeModal').onclick = () => {
      downloadCodeFile(prog);
    };

    const btnEditModal = document.getElementById('btnEditProgramModal');
    if (btnEditModal) {
      btnEditModal.style.display = isAdmin() ? 'inline-flex' : 'none';
      btnEditModal.onclick = () => {
        closeAllModals();
        openProgramModal(prog);
      };
    }



    document.getElementById('viewProgramModal').classList.add('active');
  } catch (err) {
    showToast('Failed to load program: ' + err.message, 'error');
  }
}

// Download source code file
function downloadCodeFile(prog) {
  const ext = LANG_EXTENSIONS[prog.language.toLowerCase()] || 'txt';
  const filename = `${prog.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
  const blob = new Blob([prog.code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`, 'success');
}

// ==========================================
// SUBJECT MODAL
// ==========================================

function openSubjectModal() {
  document.getElementById('subjectForm').reset();
  document.getElementById('subjectModal').classList.add('active');
}

async function handleSubjectSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('subjectName').value.trim();
  const description = document.getElementById('subjectDesc').value.trim();
  const icon = document.getElementById('subjectIcon').value;

  if (!name) {
    alert('Subject name is required.');
    return;
  }

  try {
    const createdSubject = await API.createSubject({ name, description, icon });
    showToast(`Subject "${name}" created!`, 'success');
    closeAllModals();
    await Promise.all([loadStats(), loadSubjects()]);

    // Select the newly created subject in the start screen form
    const inlineSub = document.getElementById('inlineFolderSubject');
    if (inlineSub && createdSubject.id) {
      inlineSub.value = createdSubject.id;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// DELETIONS & UTILS
// ==========================================

async function deleteFolderConfirm(e, folderId, folderName) {
  e.stopPropagation();
  if (confirm(`Are you sure you want to delete folder "${folderName}"? Programs inside will be moved to general.`)) {
    try {
      await API.deleteFolder(folderId);
      showToast(`Folder "${folderName}" deleted.`, 'success');
      if (state.activeFolderId === folderId) {
        backToAllFolders();
      } else {
        await Promise.all([loadStats(), loadFolders()]);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function deleteProgramConfirm(programId, title) {
  if (confirm(`Are you sure you want to permanently delete "${title}"?`)) {
    try {
      await API.deleteProgram(programId);
      showToast('Program deleted permanently from database.', 'success');
      closeAllModals();
      await loadStats();
      if (state.activeFolderId) {
        await openFolderDetail(state.activeFolderId);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderColor = 'var(--accent-red)';
  }

  const icon = type === 'error' ? '⚠️' : '✅';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
