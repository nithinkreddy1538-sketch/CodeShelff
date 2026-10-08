// CodeShelf - REST API Client
// Automatically detect if opened via VS Code Live Server (port 5500) or directly on Express (port 3000)
function getApiBaseUrl() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal && window.location.port && window.location.port !== '3000') {
    return `http://${window.location.hostname}:3000/api`;
  }
  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000/api';
  }
  return '/api';
}

const API_BASE = getApiBaseUrl();

const API = {
  // Admin Auth
  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  // Subjects
  async getSubjects() {
    const res = await fetch(`${API_BASE}/subjects`);
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async getSubject(id) {
    const res = await fetch(`${API_BASE}/subjects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch subject details');
    return res.json();
  },

  async createSubject(data) {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create subject');
    return json;
  },

  async deleteSubject(id) {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete subject');
    return json;
  },

  // Folders inside subjects
  async getAllFolders(subjectId = null) {
    const url = subjectId ? `${API_BASE}/folders?subject_id=${subjectId}` : `${API_BASE}/folders`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch folders');
    return res.json();
  },

  async getFolderById(folderId) {
    const res = await fetch(`${API_BASE}/folders/${folderId}`);
    if (!res.ok) throw new Error('Failed to fetch folder');
    return res.json();
  },

  async getFolders(subjectId) {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/folders`);
    if (!res.ok) throw new Error('Failed to fetch folders');
    return res.json();
  },

  async createFolder(subjectId, data) {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create folder');
    return json;
  },

  async deleteFolder(folderId) {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete folder');
    return json;
  },

  // Programs
  async getPrograms(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subject_id) params.append('subject_id', filters.subject_id);
    if (filters.folder_id) params.append('folder_id', filters.folder_id);
    if (filters.language && filters.language !== 'all') params.append('language', filters.language);
    if (filters.search) params.append('search', filters.search);
    if (filters.tag) params.append('tag', filters.tag);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/programs${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch programs');
    return res.json();
  },

  async getProgram(id) {
    const res = await fetch(`${API_BASE}/programs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch program details');
    return res.json();
  },

  async createProgram(data) {
    const res = await fetch(`${API_BASE}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to save program');
    return json;
  },

  async updateProgram(id, data) {
    const res = await fetch(`${API_BASE}/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update program');
    return json;
  },

  async deleteProgram(id) {
    const res = await fetch(`${API_BASE}/programs/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete program');
    return json;
  },

  // Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch platform stats');
    return res.json();
  },

  // Languages
  async getLanguages() {
    const res = await fetch(`${API_BASE}/languages`);
    if (!res.ok) return [];
    return res.json();
  },

  getExportUrl() {
    return `${API_BASE}/export`;
  }
};

