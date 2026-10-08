// CodeShelf - Admin Dashboard Controller (Protected with Admin / Admin123)
let adminState = {
  isAuthenticated: localStorage.getItem('codeshelf_admin_auth') === 'true',
  activeTab: 'folders', // 'folders' | 'programs' | 'subjects'
  subjects: [],
  folders: [],
  programs: [],
};

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initAdminEventListeners();
});

function initAdminAuth() {
  const loginSection = document.getElementById('adminLoginSection');
  const workspaceSection = document.getElementById('adminWorkspaceSection');
  const btnLogout = document.getElementById('btnAdminLogout');

  if (adminState.isAuthenticated) {
    if (loginSection) loginSection.style.display = 'none';
    if (workspaceSection) workspaceSection.style.display = 'flex';
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    loadAdminData();
  } else {
    if (loginSection) loginSection.style.display = 'flex';
    if (workspaceSection) workspaceSection.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
  }
}

function initAdminEventListeners() {
  // Admin Login Handler (Username: Admin, Password: Admin123)
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = (document.getElementById('adminUsername').value || '').trim();
      const p = (document.getElementById('adminPassword').value || '').trim();

      if (u.toLowerCase() === 'admin' && (p === 'Admin123' || p === 'admin123')) {
        adminState.isAuthenticated = true;
        localStorage.setItem('codeshelf_admin_auth', 'true');
        localStorage.setItem('codeshelf_admin_token', 'token_' + Date.now());
        showToast('🔓 Signed in as Admin successfully!', 'success');
        initAdminAuth();
      } else {
        showToast('Invalid credentials. Use Username: Admin, Password: Admin123', 'error');
      }
    });
  }

  // Admin Logout Handler
  const btnLogout = document.getElementById('btnAdminLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      adminState.isAuthenticated = false;
      localStorage.removeItem('codeshelf_admin_auth');
      localStorage.removeItem('codeshelf_admin_token');
      showToast('Logged out from Admin portal.', 'success');
      initAdminAuth();
    });
  }

  // Sidebar Tab Switching
  const tabFolders = document.getElementById('tabAdminFolders');
  const tabPrograms = document.getElementById('tabAdminPrograms');
  const tabSubjects = document.getElementById('tabAdminSubjects');

  if (tabFolders) tabFolders.addEventListener('click', () => switchAdminTab('folders'));
  if (tabPrograms) tabPrograms.addEventListener('click', () => switchAdminTab('programs'));
  if (tabSubjects) tabSubjects.addEventListener('click', () => switchAdminTab('subjects'));

  // Admin Forms
  const createFolderForm = document.getElementById('adminCreateFolderForm');
  if (createFolderForm) {
    createFolderForm.addEventListener('submit', handleAdminCreateFolder);
  }

  const createProgForm = document.getElementById('adminCreateProgramForm');
  if (createProgForm) {
    createProgForm.addEventListener('submit', handleAdminCreateProgram);
  }

  const createSubForm = document.getElementById('adminCreateSubjectForm');
  if (createSubForm) {
    createSubForm.addEventListener('submit', handleAdminCreateSubject);
  }

  // When Subject changes in Program Form, update its folders dropdown
  const dashProgSubject = document.getElementById('dashProgSubject');
  if (dashProgSubject) {
    dashProgSubject.addEventListener('change', (e) => {
      if (e.target.value !== '__custom__') {
        populateProgramFoldersDropdown(e.target.value);
      }
    });
  }


  const progSubSelect = document.getElementById('dashProgSubject');
  const progCustomSubInput = document.getElementById('dashProgCustomSubject');
  const btnToggleManualProgSub = document.getElementById('btnToggleManualProgSubject');

  if (progSubSelect && progCustomSubInput) {
    progSubSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        progCustomSubInput.style.display = 'block';
        progCustomSubInput.focus();
      } else {
        progCustomSubInput.style.display = 'none';
      }
    });
  }

  if (btnToggleManualProgSub && progCustomSubInput && progSubSelect) {
    btnToggleManualProgSub.addEventListener('click', () => {
      const isHidden = progCustomSubInput.style.display === 'none';
      progCustomSubInput.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        progSubSelect.value = '__custom__';
        progCustomSubInput.focus();
      } else {
        progSubSelect.value = '';
      }
    });
  }
}

function switchAdminTab(tabName) {
  adminState.activeTab = tabName;

  const tabFolders = document.getElementById('tabAdminFolders');
  const tabPrograms = document.getElementById('tabAdminPrograms');
  const tabSubjects = document.getElementById('tabAdminSubjects');

  if (tabFolders) tabFolders.classList.toggle('active', tabName === 'folders');
  if (tabPrograms) tabPrograms.classList.toggle('active', tabName === 'programs');
  if (tabSubjects) tabSubjects.classList.toggle('active', tabName === 'subjects');

  const panelFolders = document.getElementById('panelAdminFolders');
  const panelPrograms = document.getElementById('panelAdminPrograms');
  const panelSubjects = document.getElementById('panelAdminSubjects');

  if (panelFolders) panelFolders.style.display = tabName === 'folders' ? 'block' : 'none';
  if (panelPrograms) panelPrograms.style.display = tabName === 'programs' ? 'block' : 'none';
  if (panelSubjects) panelSubjects.style.display = tabName === 'subjects' ? 'block' : 'none';
}

// Master Admin Data Load
async function loadAdminData() {
  try {
    await Promise.all([loadAdminStats(), loadAdminSubjects(), loadAdminFolders(), loadAdminPrograms()]);
  } catch (err) {
    console.error('Error loading admin data:', err);
    showToast('Failed to load admin data: ' + err.message, 'error');
  }
}

async function loadAdminStats() {
  try {
    const stats = await API.getStats();
    const folders = await API.getAllFolders();
    const fCountEl = document.getElementById('dashFoldersCount');
    const pCountEl = document.getElementById('dashProgramsCount');
    const sCountEl = document.getElementById('dashSubjectsCount');

    if (fCountEl) fCountEl.textContent = folders ? folders.length : 0;
    if (pCountEl) pCountEl.textContent = stats.total_programs || 0;
    if (sCountEl) sCountEl.textContent = stats.total_subjects || 0;
  } catch (err) {
    console.warn('Could not load admin stats:', err);
  }
}

async function loadAdminSubjects() {
  try {
    const subjects = await API.getSubjects();
    adminState.subjects = subjects || [];

    const progSubSelect = document.getElementById('dashProgSubject');

    if (progSubSelect) {
      const curVal = progSubSelect.value;
      progSubSelect.innerHTML = '<option value="">All Subjects (Optional)</option>';
      subjects.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        progSubSelect.appendChild(opt);
      });
      const customOpt = document.createElement('option');
      customOpt.value = '__custom__';
      customOpt.textContent = '+ Enter Custom / New Subject...';
      progSubSelect.appendChild(customOpt);
      if (curVal) progSubSelect.value = curVal;
      populateProgramFoldersDropdown('');
    }

    renderSubjectsTable();
  } catch (err) {
    console.error('Error loading subjects in admin:', err);
  }
}

async function populateProgramFoldersDropdown(subjectId) {
  const progFolderSelect = document.getElementById('dashProgFolder');
  if (!progFolderSelect) return;
  progFolderSelect.innerHTML = '<option value="">Select Folder...</option>';

  try {
    const folders = subjectId ? await API.getFolders(subjectId) : await API.getAllFolders();
    (folders || []).forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `📁 ${f.name} (${f.subject_name || 'General'})`;
      progFolderSelect.appendChild(opt);
    });
  } catch (err) {
    console.warn('Could not load folders for dropdown:', err);
  }
}

async function loadAdminFolders() {
  try {
    const folders = await API.getAllFolders();
    adminState.folders = folders || [];
    renderFoldersTable();
  } catch (err) {
    console.error('Error loading folders in admin:', err);
  }
}

async function loadAdminPrograms() {
  try {
    const programs = await API.getPrograms();
    adminState.programs = programs || [];
    renderProgramsTable();
  } catch (err) {
    console.error('Error loading programs in admin:', err);
  }
}

// Render Folders Table
function renderFoldersTable() {
  const tbody = document.getElementById('adminFoldersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (adminState.folders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No folders created yet. Create one above!</td></tr>`;
    return;
  }

  adminState.folders.forEach((f) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); color: var(--text-dim);">${f.id}</td>
      <td><span class="badge-subject">${escapeHtml(f.subject_name || 'General')}</span></td>
      <td><strong>📁 ${escapeHtml(f.name)}</strong></td>
      <td style="color: var(--text-muted); max-width: 250px;">${escapeHtml(f.description || '—')}</td>
      <td><span class="folder-count-badge">${f.program_count || 0} Programs</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline btn-sm" onclick="quickAddProgToFolder(${f.subject_id}, ${f.id})">
            + Add Code
          </button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteFolder(${f.id}, '${escapeHtml(f.name)}')">
            🗑️
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Programs Table
function renderProgramsTable() {
  const tbody = document.getElementById('adminProgramsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (adminState.programs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No programs uploaded yet.</td></tr>`;
    return;
  }

  adminState.programs.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); color: var(--text-dim);">${p.id}</td>
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td><span class="badge-folder">📁 ${escapeHtml(p.folder_name || 'Root')}</span></td>
      <td><span class="badge-subject">${escapeHtml(p.subject_name || 'General')}</span></td>
      <td><span class="badge-lang">${escapeHtml(p.language)}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="adminDeleteProgram(${p.id}, '${escapeHtml(p.title)}')">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Subjects Table
function renderSubjectsTable() {
  const tbody = document.getElementById('adminSubjectsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (adminState.subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No subjects created yet.</td></tr>`;
    return;
  }

  adminState.subjects.forEach((s) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); color: var(--text-dim);">${s.id}</td>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td style="color: var(--text-muted);">${escapeHtml(s.description || '—')}</td>
      <td><span class="folder-count-badge">${s.program_count || 0} Programs</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="adminDeleteSubject(${s.id}, '${escapeHtml(s.name)}')">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Form Handlers
async function handleAdminCreateFolder(e) {
  e.preventDefault();
  const name = document.getElementById('dashFolderName').value.trim();
  const description = document.getElementById('dashFolderDesc').value.trim();

  if (!name) {
    alert('Folder Name is required.');
    return;
  }

  // Find or create 'General' category for topic folders
  let generalSub = adminState.subjects.find((s) => s.name.toLowerCase() === 'general');
  let subjectId;
  if (!generalSub && adminState.subjects.length > 0) {
    try {
      generalSub = await API.createSubject({ name: 'General', description: 'General Topics', icon: '📁' });
      adminState.subjects.push(generalSub);
    } catch (err) {
      generalSub = adminState.subjects[0];
    }
  }
  subjectId = generalSub ? generalSub.id : 1;

  try {
    await API.createFolder(subjectId, { name, description });
    showToast(`Folder "${name}" created successfully and visible on index.html!`, 'success');
    document.getElementById('adminCreateFolderForm').reset();
    await Promise.all([loadAdminStats(), loadAdminFolders(), loadAdminSubjects()]);
  } catch (err) {
    showToast('Failed to create folder: ' + err.message, 'error');
  }
}

async function handleAdminCreateProgram(e) {
  e.preventDefault();
  let subjectId = document.getElementById('dashProgSubject').value;
  const progCustomSubInput = document.getElementById('dashProgCustomSubject');
  const customProgSubName = progCustomSubInput ? progCustomSubInput.value.trim() : '';

  if (customProgSubName || subjectId === '__custom__') {
    if (customProgSubName) {
      let existingSub = adminState.subjects.find((s) => s.name.toLowerCase() === customProgSubName.toLowerCase());
      if (existingSub) {
        subjectId = existingSub.id;
      } else {
        try {
          const createdSub = await API.createSubject({
            name: customProgSubName,
            description: `${customProgSubName} programming topics`,
            icon: '📁'
          });
          adminState.subjects.push(createdSub);
          subjectId = createdSub.id;
        } catch (err) {
          console.warn('Error creating manual subject for program:', err);
        }
      }
    }
  }

  const folderId = document.getElementById('dashProgFolder').value;
  const title = document.getElementById('dashProgTitle').value.trim();
  const language = document.getElementById('dashProgLang').value;
  const author_name = document.getElementById('dashProgAuthor') ? document.getElementById('dashProgAuthor').value.trim() : 'Admin';
  const description = document.getElementById('dashProgDesc').value.trim();
  const code = document.getElementById('dashProgCode').value;
  const sample_output = document.getElementById('dashProgOutput') ? document.getElementById('dashProgOutput').value.trim() : '';
  const time_complexity = document.getElementById('dashProgTime') ? document.getElementById('dashProgTime').value.trim() : '';
  const space_complexity = document.getElementById('dashProgSpace') ? document.getElementById('dashProgSpace').value.trim() : '';

  if (!folderId || !title || !code) {
    alert('Folder, Title, and Source Code are required.');
    return;
  }

  // If subjectId is omitted, inherit from chosen folder
  if (!subjectId || subjectId === '__custom__') {
    const chosenFolder = adminState.folders.find((f) => String(f.id) === String(folderId));
    if (chosenFolder && chosenFolder.subject_id) {
      subjectId = chosenFolder.subject_id;
    } else {
      subjectId = 1;
    }
  }

  try {
    await API.createProgram({
      subject_id: subjectId,
      folder_id: folderId,
      title,
      language,
      author_name,
      description,
      code,
      sample_output,
      time_complexity,
      space_complexity,
    });

    showToast(`Program "${title}" saved into folder and live on index.html!`, 'success');
    document.getElementById('adminCreateProgramForm').reset();
    await Promise.all([loadAdminStats(), loadAdminFolders(), loadAdminPrograms()]);
  } catch (err) {
    showToast('Failed to save program: ' + err.message, 'error');
  }
}

async function handleAdminCreateSubject(e) {
  e.preventDefault();
  const name = document.getElementById('dashSubName').value.trim();
  const description = document.getElementById('dashSubDesc').value.trim();
  const icon = document.getElementById('dashSubIcon').value;

  if (!name) {
    alert('Subject name is required.');
    return;
  }

  try {
    await API.createSubject({ name, description, icon });
    showToast(`Subject "${name}" created!`, 'success');
    document.getElementById('adminCreateSubjectForm').reset();
    await Promise.all([loadAdminStats(), loadAdminSubjects()]);
  } catch (err) {
    showToast('Failed to create subject: ' + err.message, 'error');
  }
}

// Helpers
function quickAddProgToFolder(subjectId, folderId) {
  switchAdminTab('programs');
  const subSelect = document.getElementById('dashProgSubject');
  if (subSelect) {
    subSelect.value = subjectId;
    populateProgramFoldersDropdown(subjectId).then(() => {
      const folderSelect = document.getElementById('dashProgFolder');
      if (folderSelect) folderSelect.value = folderId;
      const titleInput = document.getElementById('dashProgTitle');
      if (titleInput) titleInput.focus();
    });
  }
}

async function adminDeleteFolder(folderId, folderName) {
  if (confirm(`Are you sure you want to delete folder "${folderName}"?`)) {
    try {
      await API.deleteFolder(folderId);
      showToast(`Folder "${folderName}" deleted.`, 'success');
      await Promise.all([loadAdminStats(), loadAdminFolders(), loadAdminPrograms()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function adminDeleteProgram(programId, title) {
  if (confirm(`Are you sure you want to delete program "${title}"?`)) {
    try {
      await API.deleteProgram(programId);
      showToast(`Program "${title}" deleted.`, 'success');
      await Promise.all([loadAdminStats(), loadAdminFolders(), loadAdminPrograms()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function adminDeleteSubject(subjectId, name) {
  if (confirm(`Are you sure you want to delete subject "${name}" and all its folders/programs?`)) {
    try {
      await API.deleteSubject(subjectId);
      showToast(`Subject "${name}" deleted.`, 'success');
      await Promise.all([loadAdminStats(), loadAdminSubjects(), loadAdminFolders(), loadAdminPrograms()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
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
