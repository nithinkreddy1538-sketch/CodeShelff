const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & Tables
initDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==========================================
// REST API: ADMIN AUTHENTICATION
// ==========================================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = (username || '').trim().toLowerCase();
  const pass = (password || '').trim();

  // Admin credentials: Admin / Admin123
  if (user === 'admin' && (pass === 'Admin123' || pass.toLowerCase() === 'admin123')) {
    return res.json({
      success: true,
      token: 'codeshelf_admin_token_' + Date.now(),
      role: 'admin',
      user: 'Administrator',
      message: 'Admin authenticated successfully.',
    });
  }

  return res.status(401).json({
    error: 'Invalid admin credentials. Use username: admin, password: admin123',
  });
});

// ==========================================
// REST API: SUBJECTS
// ==========================================

// 1. Get all subjects with program counts
app.get('/api/subjects', (req, res) => {
  const query = `
    SELECT 
      s.*, 
      COUNT(p.id) AS program_count
    FROM subjects s
    LEFT JOIN programs p ON s.id = p.subject_id
    GROUP BY s.id
    ORDER BY s.name ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Get single subject with its programs
app.get('/api/subjects/:id', (req, res) => {
  const subjectId = req.params.id;
  db.get('SELECT * FROM subjects WHERE id = ?', [subjectId], (err, subject) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    db.all('SELECT * FROM programs WHERE subject_id = ? ORDER BY created_at DESC', [subjectId], (err, programs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...subject, programs });
    });
  });
});

// 3. Create a new subject
app.post('/api/subjects', (req, res) => {
  const { name, description, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  const cleanName = name.trim();
  const cleanDesc = description ? description.trim() : '';
  const cleanIcon = icon ? icon.trim() : 'folder-code';

  const query = 'INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)';
  db.run(query, [cleanName, cleanDesc, cleanIcon], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: `Subject "${cleanName}" already exists.` });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name: cleanName,
      description: cleanDesc,
      icon: cleanIcon,
      message: 'Subject created successfully and saved permanently.',
    });
  });
});

// 4. Update subject
app.put('/api/subjects/:id', (req, res) => {
  const { name, description, icon } = req.body;
  const subjectId = req.params.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  const query = 'UPDATE subjects SET name = ?, description = ?, icon = ? WHERE id = ?';
  db.run(query, [name.trim(), description || '', icon || 'folder-code', subjectId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject updated successfully.' });
  });
});

// 5. Delete subject (cascades to all programs inside)
app.delete('/api/subjects/:id', (req, res) => {
  const subjectId = req.params.id;
  db.run('DELETE FROM subjects WHERE id = ?', [subjectId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject and all its associated programs deleted permanently.' });
  });
});

// ==========================================
// REST API: FOLDERS (Inside Subjects)
// ==========================================

// 1. Get all folders across all subjects (optional ?subject_id= filter)
app.get('/api/folders', (req, res) => {
  const { subject_id } = req.query;
  let query = `
    SELECT 
      f.*,
      s.name AS subject_name,
      s.icon AS subject_icon,
      COUNT(p.id) AS program_count
    FROM folders f
    JOIN subjects s ON f.subject_id = s.id
    LEFT JOIN programs p ON f.id = p.folder_id
  `;
  const params = [];
  if (subject_id) {
    query += ' WHERE f.subject_id = ?';
    params.push(subject_id);
  }
  query += ' GROUP BY f.id ORDER BY s.name ASC, f.name ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Get folder by ID
app.get('/api/folders/:id', (req, res) => {
  const folderId = req.params.id;
  const query = `
    SELECT 
      f.*,
      s.name AS subject_name,
      s.icon AS subject_icon,
      COUNT(p.id) AS program_count
    FROM folders f
    JOIN subjects s ON f.subject_id = s.id
    LEFT JOIN programs p ON f.id = p.folder_id
    WHERE f.id = ?
    GROUP BY f.id
  `;
  db.get(query, [folderId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Folder not found' });
    res.json(row);
  });
});

// 3. Get all folders for a specific subject
app.get('/api/subjects/:id/folders', (req, res) => {
  const subjectId = req.params.id;
  const query = `
    SELECT 
      f.*,
      COUNT(p.id) AS program_count
    FROM folders f
    LEFT JOIN programs p ON f.id = p.folder_id
    WHERE f.subject_id = ?
    GROUP BY f.id
    ORDER BY f.name ASC
  `;
  db.all(query, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post(['/api/subjects/:id/folders', '/api/folders'], (req, res) => {
  let subjectId = req.params.id || req.body.subject_id;
  const { name, description, subject_name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required.' });
  }

  const insertFolder = (subId) => {
    const query = 'INSERT INTO folders (subject_id, name, description) VALUES (?, ?, ?)';
    db.run(query, [subId, name.trim(), description ? description.trim() : ''], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        subject_id: Number(subId),
        name: name.trim(),
        description: description ? description.trim() : '',
        message: 'Folder created successfully.',
      });
    });
  };

  const manualSubject = (subject_name || (isNaN(subjectId) && typeof subjectId === 'string' && subjectId !== '__custom__' ? subjectId : '')).trim();

  if (manualSubject) {
    db.get('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)', [manualSubject], (err, subRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (subRow) {
        insertFolder(subRow.id);
      } else {
        db.run('INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)', [manualSubject, `${manualSubject} programming topics`, 'folder'], function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          insertFolder(this.lastID);
        });
      }
    });
    return;
  }

  if (!subjectId || subjectId === '0' || subjectId === 'null' || subjectId === 'undefined' || subjectId === '__custom__') {
    db.get("SELECT id FROM subjects WHERE LOWER(name) = 'general'", [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        insertFolder(row.id);
      } else {
        db.run("INSERT INTO subjects (name, description, icon) VALUES ('General', 'General Programming Topics', 'folder')", function (err2) {
          if (err2) {
            db.get("SELECT id FROM subjects LIMIT 1", [], (err3, subRow) => {
              if (err3 || !subRow) return res.status(500).json({ error: 'No subject category found' });
              insertFolder(subRow.id);
            });
          } else {
            insertFolder(this.lastID);
          }
        });
      }
    });
  } else {
    insertFolder(subjectId);
  }
});

// 3. Delete folder
app.delete('/api/folders/:id', (req, res) => {
  const folderId = req.params.id;
  db.run('DELETE FROM folders WHERE id = ?', [folderId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Folder not found' });
    res.json({ message: 'Folder deleted successfully.' });
  });
});

// ==========================================
// REST API: PROGRAMS
// ==========================================

// 1. Get all programs (supports filters: ?search, ?subject_id, ?folder_id, ?language, ?tag)
app.get('/api/programs', (req, res) => {
  const { search, subject_id, folder_id, language, tag } = req.query;

  let query = `
    SELECT 
      p.*,
      s.name AS subject_name,
      s.icon AS subject_icon,
      f.name AS folder_name
    FROM programs p
    JOIN subjects s ON p.subject_id = s.id
    LEFT JOIN folders f ON p.folder_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (subject_id) {
    query += ' AND p.subject_id = ?';
    params.push(subject_id);
  }

  if (folder_id) {
    if (folder_id === 'root' || folder_id === 'none') {
      query += ' AND p.folder_id IS NULL';
    } else {
      query += ' AND p.folder_id = ?';
      params.push(folder_id);
    }
  }

  if (language && language !== 'all') {
    query += ' AND LOWER(p.language) = LOWER(?)';
    params.push(language);
  }

  if (tag) {
    query += ' AND LOWER(p.tags) LIKE ?';
    params.push(`%${tag.toLowerCase()}%`);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += `
      AND (
        LOWER(p.title) LIKE ? OR
        LOWER(p.description) LIKE ? OR
        LOWER(p.tags) LIKE ? OR
        LOWER(p.code) LIKE ? OR
        LOWER(COALESCE(p.author_name, '')) LIKE ? OR
        LOWER(s.name) LIKE ? OR
        LOWER(COALESCE(f.name, '')) LIKE ?
      )
    `;
    params.push(term, term, term, term, term, term, term);
  }

  query += ' ORDER BY p.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Get distinct programming languages in database
app.get('/api/languages', (req, res) => {
  db.all('SELECT DISTINCT LOWER(language) AS language FROM programs ORDER BY language ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => r.language));
  });
});

// 3. Get single program
app.get('/api/programs/:id', (req, res) => {
  const programId = req.params.id;
  const query = `
    SELECT 
      p.*,
      s.name AS subject_name,
      s.icon AS subject_icon,
      f.name AS folder_name
    FROM programs p
    JOIN subjects s ON p.subject_id = s.id
    LEFT JOIN folders f ON p.folder_id = f.id
    WHERE p.id = ?
  `;
  db.get(query, [programId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Program not found' });
    res.json(row);
  });
});

// 4. Create a new program
app.post('/api/programs', (req, res) => {
  const {
    subject_id,
    folder_id,
    title,
    description,
    author_name,
    language,
    code,
    sample_output,
    tags,
    time_complexity,
    space_complexity,
  } = req.body;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and Code are required.' });
  }

  const author = author_name && author_name.trim() ? author_name.trim() : 'Admin';
  const cleanLang = language && language.trim() ? language.trim().toLowerCase() : 'python';
  const cleanFolderId = folder_id && Number(folder_id) > 0 ? Number(folder_id) : null;

  const insertProgram = (subId) => {
    const query = `
      INSERT INTO programs 
      (subject_id, folder_id, title, description, author_name, language, code, sample_output, tags, time_complexity, space_complexity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      query,
      [
        subId,
        cleanFolderId,
        title.trim(),
        description ? description.trim() : '',
        author,
        cleanLang,
        code,
        sample_output ? sample_output.trim() : '',
        tags ? tags.trim() : '',
        time_complexity ? time_complexity.trim() : 'O(N)',
        space_complexity ? space_complexity.trim() : 'O(1)',
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
          id: this.lastID,
          title: title.trim(),
          author_name: author,
          language: cleanLang,
          folder_id: cleanFolderId,
          code,
          message: 'Program permanently saved in database.',
        });
      }
    );
  };

  const manualSubject = (req.body.subject_name || (isNaN(subject_id) && typeof subject_id === 'string' && subject_id !== '__custom__' ? subject_id : '')).trim();

  if (manualSubject) {
    db.get('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)', [manualSubject], (err, subRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (subRow) {
        insertProgram(subRow.id);
      } else {
        db.run('INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)', [manualSubject, `${manualSubject} programming topics`, 'folder'], function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          insertProgram(this.lastID);
        });
      }
    });
  } else if (subject_id && subject_id !== '__custom__') {
    insertProgram(subject_id);
  } else if (cleanFolderId) {
    db.get('SELECT subject_id FROM folders WHERE id = ?', [cleanFolderId], (err, folderRow) => {
      if (err || !folderRow) {
        insertProgram(1);
      } else {
        insertProgram(folderRow.subject_id);
      }
    });
  } else {
    db.get("SELECT id FROM subjects WHERE LOWER(name) = 'general'", [], (err, row) => {
      if (!err && row) {
        insertProgram(row.id);
      } else {
        db.get('SELECT id FROM subjects LIMIT 1', [], (err2, subRow) => {
          insertProgram(subRow ? subRow.id : 1);
        });
      }
    });
  }
});


// 5. Update program
app.put('/api/programs/:id', (req, res) => {
  const {
    subject_id,
    folder_id,
    title,
    description,
    author_name,
    language,
    code,
    sample_output,
    tags,
    time_complexity,
    space_complexity,
  } = req.body;
  const programId = req.params.id;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and Code are required.' });
  }

  const author = author_name && author_name.trim() ? author_name.trim() : 'Admin';
  const cleanLang = language && language.trim() ? language.trim().toLowerCase() : 'python';
  const cleanFolderId = folder_id && Number(folder_id) > 0 ? Number(folder_id) : null;

  const query = `
    UPDATE programs SET
      subject_id = ?,
      folder_id = ?,
      title = ?,
      description = ?,
      author_name = ?,
      language = ?,
      code = ?,
      sample_output = ?,
      tags = ?,
      time_complexity = ?,
      space_complexity = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  db.run(
    query,
    [
      subject_id,
      cleanFolderId,
      title.trim(),
      description || '',
      author,
      cleanLang,
      code,
      sample_output || '',
      tags || '',
      time_complexity || 'O(N)',
      space_complexity || 'O(1)',
      programId,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Program not found' });
      res.json({ message: 'Program updated successfully.' });
    }
  );
});

// 5. Delete program
app.delete('/api/programs/:id', (req, res) => {
  const programId = req.params.id;
  db.run('DELETE FROM programs WHERE id = ?', [programId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Program not found' });
    res.json({ message: 'Program deleted successfully.' });
  });
});

// ==========================================
// REST API: STATS & DATA EXPORT
// ==========================================

// Global Stats (totals, languages)
app.get('/api/stats', (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM subjects) AS total_subjects,
      (SELECT COUNT(*) FROM programs) AS total_programs,
      (SELECT COUNT(DISTINCT language) FROM programs) AS total_languages
  `;
  db.get(statsQuery, [], (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });

    // Distinct languages with counts
    db.all(
      'SELECT language, COUNT(*) as count FROM programs GROUP BY language ORDER BY count DESC',
      [],
      (err, langRows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          ...stats,
          languages: langRows,
        });
      }
    );
  });
});

// Full JSON Backup / Export (Open Source Data Dump)
app.get('/api/export', (req, res) => {
  db.all('SELECT * FROM subjects ORDER BY id ASC', [], (err, subjects) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT * FROM programs ORDER BY id ASC', [], (err, programs) => {
      if (err) return res.status(500).json({ error: err.message });

      res.setHeader('Content-Disposition', 'attachment; filename=codeshelf-backup.json');
      res.setHeader('Content-Type', 'application/json');
      res.json({
        platform: 'CodeShelf Open Source Program Library',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        subjects,
        programs,
      });
    });
  });
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CodeShelf Open Source Platform is running!`);
  console.log(`🔗 Local Address: http://localhost:${PORT}`);
  console.log(`📁 Permanent Database: SQLite (data/database.sqlite)`);
  console.log(`====================================================`);
});
