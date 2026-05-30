document.addEventListener('DOMContentLoaded', () => {
  const currentUser = requireSession();
  if (!currentUser) return;
  const params    = new URLSearchParams(window.location.search);
  const subjectId = params.get('id');
  if (!subjectId) { window.location.href = 'home.html'; return; }

  let subject = getSubject(currentUser, subjectId);
  if (!subject) { window.location.href = 'home.html'; return; }
  const isGP = isGPSubject(subject);
  document.title = `${subject.name} — StudySpace`;
  document.getElementById('subject-title').textContent = subject.name;
  document.getElementById('subject-icon-display').textContent = subject.icon || '📚';
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = getUserDisplayName(currentUser));
  document.querySelectorAll('.user-initials').forEach(el => el.textContent = getInitials(getUserDisplayName(currentUser)));
  if (isGP) {
    document.getElementById('tabBtn-syllabus').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      Topics
    `;
    document.getElementById('tabBtn-leaderboard').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      Topics Done
    `;
    document.getElementById('syllabus-tab-title').textContent = 'Topics Covered';
    document.getElementById('syllabus-actions').style.display = 'none';
    document.getElementById('chip-chapters').style.display = 'none';
    const lbTitle = document.getElementById('leaderboard-tab-title');
    const lbDesc  = document.getElementById('leaderboard-tab-desc');
    if (lbTitle) lbTitle.textContent = 'Topics Done';
    if (lbDesc)  lbDesc.textContent  = 'Topics are ranked by how many practice papers covered them. Use this to track which areas you have practised the most. 🗂️';
  }

  function refreshSubject() {
    subject = getSubject(currentUser, subjectId);
    updateMetaChips();
    renderStats();
  }

  function updateMetaChips() {
    if (!subject) return;
    if (!isGP) {
      document.getElementById('chip-chapters').textContent = `${(subject.chapters||[]).length} chapters`;
    }
    document.getElementById('chip-papers').textContent = `${(subject.papers||[]).length} papers`;
  }
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });
  const tabBtns     = document.querySelectorAll('.subject-tab-btn');
  const tabContents = document.querySelectorAll('.subject-tab-content');

  function switchTab(tabId) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabContents.forEach(tc => tc.classList.toggle('active', tc.id === `tab-${tabId}`));
    if (tabId === 'syllabus')    isGP ? renderGPTopics()  : renderSyllabus();
    if (tabId === 'papers')      renderPapers();
    if (tabId === 'leaderboard') isGP ? renderTopicsDone() : renderLeaderboard();
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  function renderStats() {
    if (!subject) return;
    const papers   = subject.papers   || [];
    const chapters = subject.chapters || [];
    const avgPct   = papers.length
      ? Math.round(papers.reduce((sum, p) => sum + p.percentage, 0) / papers.length * 10) / 10
      : null;
    const bestPct     = papers.length ? Math.max(...papers.map(p => p.percentage)) : null;
    const latestGrade = papers.length ? [...papers].sort((a, b) => b.created - a.created)[0].grade : null;

    document.getElementById('stat-chapter-count').textContent =
      isGP ? (getGPTopics(currentUser, subjectId).length || '—') : chapters.length;
    document.getElementById('stat-paper-count').textContent  = papers.length;
    document.getElementById('stat-avg-score').textContent    = avgPct !== null ? avgPct + '%' : '—';
    document.getElementById('stat-best-score').textContent   = bestPct !== null ? bestPct + '%' : '—';
    document.getElementById('stat-latest-grade').textContent = latestGrade || '—';
    if (latestGrade) {
      document.getElementById('stat-latest-grade').style.color = getGradeColor(latestGrade);
    }
    if (isGP) {
      document.querySelector('#stat-chapter-count').closest('.stat-card').querySelector('.stat-card-label').textContent = 'Topics Done';
      document.querySelector('#stat-chapter-count').closest('.stat-card').querySelector('.stat-card-icon').textContent = '🗂️';
    }
  }
  const syllabusList = document.getElementById('syllabus-list');

  function renderGPTopics() {
    refreshSubject();
    const topics = getGPTopics(currentUser, subjectId);
    syllabusList.innerHTML = '';

    if (topics.length === 0) {
      syllabusList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p>No topics yet. Add a practice paper and tag the topic(s) it covers.</p>
        </div>
      `;
      return;
    }

    const header = document.createElement('p');
    header.style.cssText = 'font-size:.85rem;color:var(--text-muted);margin-bottom:var(--space-md);';
    header.textContent = `${topics.length} unique topic${topics.length !== 1 ? 's' : ''} covered across your practice papers.`;
    syllabusList.appendChild(header);
    const sorted = [...topics].sort((a, b) => a.name.localeCompare(b.name));
    const grid = document.createElement('div');
    grid.className = 'gp-topics-grid';
    sorted.forEach((t, idx) => {
      const chip = document.createElement('div');
      chip.className = 'gp-topic-chip';
      chip.style.animation = `fadeInUp 0.3s ease ${idx * 0.04}s both`;
      chip.innerHTML = `
        <span class="gp-topic-name">${escapeHtml(t.name)}</span>
        <span class="gp-topic-count">${t.count} paper${t.count !== 1 ? 's' : ''}</span>
      `;
      grid.appendChild(chip);
    });
    syllabusList.appendChild(grid);
  }
  function renderSyllabus() {
    refreshSubject();
    const chapters = subject ? (subject.chapters || []) : [];
    syllabusList.innerHTML = '';

    chapters.forEach(ch => {
      const row = createChapterRow(ch);
      syllabusList.appendChild(row);
    });

    const addRow = createAddChapterRow();
    syllabusList.appendChild(addRow);

    if (chapters.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-state';
      emptyMsg.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        <p>No chapters yet. Add your first chapter below, or upload a CSV/Excel file.</p>
      `;
      syllabusList.insertBefore(emptyMsg, addRow);
    }
  }

  function createChapterRow(ch) {
    const row = document.createElement('div');
    row.className = 'chapter-row';
    row.dataset.id = ch.id;
    row.innerHTML = `
      <div class="chapter-number">${ch.number}</div>
      <span class="chapter-name-display">${escapeHtml(ch.name)}</span>
      <div class="chapter-actions">
        <button class="chapter-btn edit" title="Edit" aria-label="Edit chapter">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="chapter-btn delete" title="Delete" aria-label="Delete chapter">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    `;
    row.querySelector('.edit').addEventListener('click', () => startEditChapter(row, ch));
    row.querySelector('.delete').addEventListener('click', () => {
      removeChapter(currentUser, subjectId, ch.id);
      renderSyllabus();
      showToast('Chapter removed.', 'success');
    });
    return row;
  }

  function startEditChapter(row, ch) {
    const nameDisplay = row.querySelector('.chapter-name-display');
    const numDisplay  = row.querySelector('.chapter-number');
    const actions     = row.querySelector('.chapter-actions');

    const numInput  = document.createElement('input');
    numInput.className = 'chapter-name-input';
    numInput.style.cssText = 'width:60px;margin-right:8px;';
    numInput.type  = 'number'; numInput.min = '1'; numInput.value = ch.number;

    const nameInput = document.createElement('input');
    nameInput.className = 'chapter-name-input';
    nameInput.value = ch.name;

    numDisplay.replaceWith(numInput);
    nameDisplay.replaceWith(nameInput);
    actions.innerHTML = '';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'chapter-btn edit';
    saveBtn.title = 'Save';
    saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'chapter-btn';
    cancelBtn.title = 'Cancel';
    cancelBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    actions.style.opacity = '1';
    nameInput.focus(); nameInput.select();

    const save = () => {
      const newNum  = parseInt(numInput.value);
      const newName = nameInput.value.trim();
      if (!newName) { showToast('Chapter name cannot be empty.', 'error'); return; }
      if (isNaN(newNum) || newNum < 1) { showToast('Invalid chapter number.', 'error'); return; }
      updateChapter(currentUser, subjectId, ch.id, { number: newNum, name: newName });
      renderSyllabus();
      showToast('Chapter updated.', 'success');
    };

    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', () => renderSyllabus());
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') renderSyllabus(); });
  }

  function createAddChapterRow() {
    const row = document.createElement('div');
    row.className = 'add-chapter-row';
    const chapters = subject ? (subject.chapters || []) : [];
    const nextNum  = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) + 1 : 1;

    row.innerHTML = `
      <input type="number" id="add-ch-num" min="1" value="${nextNum}" style="width:70px;flex-shrink:0" placeholder="#" aria-label="Chapter number">
      <input type="text" id="add-ch-name" placeholder="Chapter name…" style="flex:1" aria-label="Chapter name">
      <button class="btn btn-primary btn-sm" id="btn-add-chapter">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>
    `;

    const numInput  = row.querySelector('#add-ch-num');
    const nameInput = row.querySelector('#add-ch-name');
    const addBtn    = row.querySelector('#btn-add-chapter');

    const doAdd = () => {
      const num  = parseInt(numInput.value);
      const name = nameInput.value.trim();
      if (!name) { showToast('Please enter a chapter name.', 'error'); nameInput.focus(); return; }
      if (isNaN(num) || num < 1) { showToast('Invalid chapter number.', 'error'); numInput.focus(); return; }
      addChapter(currentUser, subjectId, num, name);
      renderSyllabus();
      showToast(`Chapter ${num} added!`, 'success');
    };

    addBtn.addEventListener('click', doAdd);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    return row;
  }

  const csvInput = document.getElementById('csv-upload-input');
  if (csvInput) {
    csvInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      csvInput.value = '';

      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = ev => {
          const chapters = parseCSVText(ev.target.result);
          bulkAddChapters(chapters);
        };
        reader.readAsText(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (typeof XLSX === 'undefined') {
          showToast('Excel support requires an internet connection (loading SheetJS).', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const wb   = XLSX.read(ev.target.result, { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const chapters = parseRowsToChapters(rows);
            bulkAddChapters(chapters);
          } catch (err) {
            showToast('Could not parse Excel file. Please check the format.', 'error');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        showToast('Unsupported file type. Please use .csv, .xlsx or .xls', 'error');
      }
    });
  }

  function parseCSVText(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return parseRowsToChapters(lines.map(line => {
      const parts = [];
      let current = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { parts.push(current); current = ''; }
        else { current += ch; }
      }
      parts.push(current);
      return parts.map(p => p.trim().replace(/^"|"$/g, ''));
    }));
  }

  function parseRowsToChapters(rows) {
    const chapters = [];
    rows.forEach(row => {
      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      const num  = parseInt(col0);
      if (!isNaN(num) && num > 0 && col1) {
        chapters.push({ number: num, name: col1 });
      }
    });
    return chapters;
  }

  function bulkAddChapters(parsed) {
    if (parsed.length === 0) {
      showToast('No valid chapters found. Format: Column A = number, Column B = name.', 'error');
      return;
    }
    let added = 0;
    parsed.forEach(({ number, name }) => {
      addChapter(currentUser, subjectId, number, name);
      added++;
    });
    renderSyllabus();
    showToast(`${added} chapter${added !== 1 ? 's' : ''} imported successfully!`, 'success');
  }

  function renderPapers() {
    refreshSubject();
    const papers   = subject ? (subject.papers || []) : [];
    const tbody    = document.getElementById('papers-tbody');
    const emptyRow = document.getElementById('papers-empty-row');

    tbody.querySelectorAll('tr:not(#papers-empty-row)').forEach(r => r.remove());

    if (papers.length === 0) {
      emptyRow.style.display = '';
    } else {
      emptyRow.style.display = 'none';
      const chapters   = subject ? (subject.chapters || []) : [];
      const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]));

      [...papers].sort((a, b) => b.created - a.created).forEach(paper => {
        const tr = document.createElement('tr');
        tr.dataset.id = paper.id;
        let tagHtml = '';
        if (isGP) {
          tagHtml = (paper.topics || [])
            .map(t => `<span class="chapter-tag gp-topic-tag">${escapeHtml(t)}</span>`)
            .join('');
        } else {
          tagHtml = (paper.difficultChapters || [])
            .map(cid => {
              const ch = chapterMap[cid];
              return ch ? `<span class="chapter-tag">Ch ${ch.number}: ${escapeHtml(ch.name)}</span>` : '';
            })
            .filter(Boolean).join('');
        }

        const tagColLabel = isGP ? 'Topics Covered' : 'Difficult Chapters';
        tr.innerHTML = `
          <td class="paper-name-cell" title="${escapeHtml(paper.name)}">${escapeHtml(paper.name)}</td>
          <td class="paper-score-cell">${paper.score} / ${paper.total}</td>
          <td class="paper-percent-cell" style="color:${getGradeColor(paper.grade)}">${paper.percentage}%</td>
          <td><span class="grade-badge grade-${paper.grade}">${paper.grade}</span></td>
          <td class="paper-chapters-cell">${tagHtml || '<span style="color:var(--text-muted);font-size:0.8rem">—</span>'}</td>
          <td class="paper-actions-cell">
            <button class="delete-paper-btn" data-id="${paper.id}" title="Delete paper" aria-label="Delete paper">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </td>
        `;

        tr.querySelector('.delete-paper-btn').addEventListener('click', () => {
          removePaper(currentUser, subjectId, paper.id);
          renderPapers();
          if (isGP) renderGPTopics(); else renderLeaderboard();
          showToast('Paper removed.', 'success');
        });

        tbody.appendChild(tr);
      });
    }
    const chColHeader = document.getElementById('papers-col-tags');
    if (chColHeader) chColHeader.textContent = isGP ? 'Topics Covered' : 'Difficult Chapters';
    if (papers.length > 0) {
      const avg    = papers.reduce((s, p) => s + p.percentage, 0) / papers.length;
      const best   = Math.max(...papers.map(p => p.percentage));
      const aCount = papers.filter(p => p.grade === 'A').length;
      document.getElementById('summary-count').textContent   = papers.length;
      document.getElementById('summary-avg').textContent     = avg.toFixed(1) + '%';
      document.getElementById('summary-best').textContent    = best + '%';
      document.getElementById('summary-a-count').textContent = aCount;
      document.getElementById('papers-summary').style.display = '';
    } else {
      document.getElementById('papers-summary').style.display = 'none';
    }

    renderStats();
  }
  const paperNameInput  = document.getElementById('input-paper-name');
  const paperScoreInput = document.getElementById('input-paper-score');
  const paperTotalInput = document.getElementById('input-paper-total');
  const scorePreviewPct   = document.getElementById('score-preview-pct');
  const scorePreviewGrade = document.getElementById('score-preview-grade');

  function updateScorePreview() {
    const score = parseFloat(paperScoreInput.value);
    const total = parseFloat(paperTotalInput.value);
    if (!isNaN(score) && !isNaN(total) && total > 0) {
      const pct   = Math.round((score / total) * 100 * 10) / 10;
      const grade = calculateGrade(pct);
      scorePreviewPct.textContent   = pct + '%';
      scorePreviewGrade.innerHTML   = `<span class="grade-badge grade-${grade}">${grade}</span>`;
      scorePreviewPct.style.color   = getGradeColor(grade);
      document.getElementById('score-preview-bar').style.width = Math.min(pct, 100) + '%';
    } else {
      scorePreviewPct.textContent = '—';
      scorePreviewGrade.innerHTML = '';
      document.getElementById('score-preview-bar').style.width = '0%';
    }
  }

  paperScoreInput.addEventListener('input', updateScorePreview);
  paperTotalInput.addEventListener('input', updateScorePreview);
  document.getElementById('btn-save-paper').textContent =
    isGP ? 'Next: Add Topics →' : 'Next: Tag Chapters →';

  document.getElementById('btn-add-paper').addEventListener('click', () => {
    paperNameInput.value  = '';
    paperScoreInput.value = '';
    paperTotalInput.value = '';
    scorePreviewPct.textContent = '—';
    scorePreviewGrade.innerHTML = '';
    document.getElementById('score-preview-bar').style.width = '0%';
    openModal('modal-add-paper');
    setTimeout(() => paperNameInput.focus(), 150);
  });

  document.getElementById('btn-cancel-paper').addEventListener('click', () => closeModal('modal-add-paper'));

  document.getElementById('btn-save-paper').addEventListener('click', () => {
    const name  = paperNameInput.value.trim();
    const score = parseFloat(paperScoreInput.value);
    const total = parseFloat(paperTotalInput.value);

    if (!name)                        { showToast('Please enter a paper name.', 'error');   return; }
    if (isNaN(score))                 { showToast('Please enter your score.', 'error');      return; }
    if (isNaN(total) || total <= 0)   { showToast('Please enter a valid total.', 'error');   return; }
    if (score < 0 || score > total)   { showToast('Score cannot exceed total.', 'error');    return; }

    pendingPaperData = { name, score, total };
    closeModal('modal-add-paper');

    if (isGP) {
      openGPTopicModal();
    } else {
      refreshSubject();
      const chapters = subject ? (subject.chapters || []) : [];
      if (chapters.length === 0) {
        savePendingPaper([], []);
      } else {
        openChapterSelector();
      }
    }
  });
  let pendingPaperData = null;

  function openGPTopicModal() {
    document.getElementById('gp-topic-1').value = '';
    document.getElementById('gp-topic-2').value = '';
    openModal('modal-gp-topics');
    setTimeout(() => document.getElementById('gp-topic-1').focus(), 150);
  }

  document.getElementById('btn-save-gp-topics').addEventListener('click', () => {
    const t1 = document.getElementById('gp-topic-1').value.trim();
    const t2 = document.getElementById('gp-topic-2').value.trim();
    if (!t1) { showToast('Please enter at least one topic.', 'error'); return; }
    const topics = [t1, t2].filter(Boolean);
    savePendingPaper([], topics);
    closeModal('modal-gp-topics');
  });

  document.getElementById('btn-skip-gp-topics').addEventListener('click', () => {
    savePendingPaper([], []);
    closeModal('modal-gp-topics');
  });

  document.getElementById('btn-cancel-gp-topics').addEventListener('click', () => {
    pendingPaperData = null;
    closeModal('modal-gp-topics');
  });
  document.getElementById('gp-topic-1').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('gp-topic-2').focus();
  });
  document.getElementById('gp-topic-2').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-gp-topics').click();
  });
  let selectedChapterIds = [];

  function openChapterSelector() {
    selectedChapterIds = [];
    const chapters   = subject ? (subject.chapters || []) : [];
    const container  = document.getElementById('chapters-selector');
    container.innerHTML = '';

    chapters.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'chapter-select-row';
      row.dataset.id = ch.id;
      row.innerHTML = `
        <div class="chapter-check">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="chapter-select-label">Ch ${ch.number}: ${escapeHtml(ch.name)}</span>
      `;
      row.addEventListener('click', () => toggleChapterSelection(row, ch.id));
      container.appendChild(row);
    });

    updateSelectionHint();
    openModal('modal-select-chapters');
  }

  function toggleChapterSelection(row, chId) {
    const isSelected = row.classList.contains('selected');
    if (!isSelected && selectedChapterIds.length >= 3) {
      showToast('You can select at most 3 chapters.', 'error'); return;
    }
    if (isSelected) {
      row.classList.remove('selected');
      selectedChapterIds = selectedChapterIds.filter(id => id !== chId);
    } else {
      row.classList.add('selected');
      selectedChapterIds.push(chId);
    }
    updateSelectionHint();
  }

  function updateSelectionHint() {
    const hint = document.getElementById('selection-hint');
    hint.textContent = `${selectedChapterIds.length} / 3 chapters selected`;
    hint.className = 'selection-hint' + (selectedChapterIds.length > 3 ? ' warn' : '');
  }

  document.getElementById('btn-save-chapters').addEventListener('click', () => {
    savePendingPaper(selectedChapterIds, []);
    closeModal('modal-select-chapters');
  });
  document.getElementById('btn-skip-chapters').addEventListener('click', () => {
    savePendingPaper([], []);
    closeModal('modal-select-chapters');
  });
  document.getElementById('btn-cancel-chapters').addEventListener('click', () => {
    pendingPaperData = null;
    closeModal('modal-select-chapters');
  });
  function savePendingPaper(chapterIds, topics) {
    if (!pendingPaperData) return;
    const { name, score, total } = pendingPaperData;
    addPaper(currentUser, subjectId, name, score, total, chapterIds, topics);
    pendingPaperData = null;
    renderPapers();
    if (isGP) { renderGPTopics(); } else { renderLeaderboard(); }
    showToast(`Paper "${name}" saved!`, 'success');
  }

  function renderLeaderboard() {
    refreshSubject();
    const lbList = document.getElementById('leaderboard-list');
    const ranked = getChapterLeaderboard(currentUser, subjectId);
    lbList.innerHTML = '';

    if (ranked.length === 0) {
      lbList.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-icon">📊</div>
          <p class="text-muted">No data yet. Add practice papers and tag difficult chapters to see your weakness leaderboard.</p>
        </div>
      `;
      return;
    }

    const maxCount = ranked[0].count;
    ranked.forEach((ch, idx) => {
      const rank = idx + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
      const barClass  = rank <= 3 ? `top-${rank}` : '';
      const barWidth  = maxCount > 0 ? Math.round((ch.count / maxCount) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.style.animation = `fadeInUp 0.4s ease ${idx * 0.07}s both`;
      const fillColors = ['#EF4444','#F97316','#EAB308','#84CC16','#22C55E'];
      row.style.setProperty('--row-fill-color', fillColors[Math.min(idx, fillColors.length - 1)]);
      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${rank}</div>
        <div class="lb-info">
          <div class="lb-chapter-name">${escapeHtml(ch.name)}</div>
          <div class="lb-chapter-num">Chapter ${ch.number}</div>
        </div>
        <div class="lb-bar-wrap">
          <div class="lb-bar-track">
            <div class="lb-bar-fill ${barClass}" style="width:0%" data-target="${barWidth}%"></div>
          </div>
        </div>
        <div class="lb-count">
          <span class="lb-count-num">${ch.count}</span>
          <span class="lb-count-label">${ch.count === 1 ? 'flag' : 'flags'}</span>
        </div>
      `;
      lbList.appendChild(row);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const fill = row.querySelector('.lb-bar-fill');
          if (fill) fill.style.width = fill.dataset.target;
        }, 100 + idx * 70);
      });
    });
  }
  function renderTopicsDone() {
    refreshSubject();
    const lbList = document.getElementById('leaderboard-list');
    const topics = getGPTopics(currentUser, subjectId);
    lbList.innerHTML = '';

    if (topics.length === 0) {
      lbList.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-icon">🗂️</div>
          <p class="text-muted">No topics yet. Add practice papers and tag the topics they cover.</p>
        </div>
      `;
      return;
    }

    const maxCount = topics[0].count;
    topics.forEach((t, idx) => {
      const rank = idx + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
      const barWidth  = maxCount > 0 ? Math.round((t.count / maxCount) * 100) : 0;
      const barClass  = rank <= 3 ? `top-${rank}` : '';

      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.style.animation = `fadeInUp 0.4s ease ${idx * 0.07}s both`;
      const fillColors = ['#6C63FF','#00D4AA','#22C55E','#3B82F6','#8B5CF6'];
      row.style.setProperty('--row-fill-color', fillColors[Math.min(idx, fillColors.length - 1)]);
      row.innerHTML = `
        <div class="lb-rank ${rankClass}">${rank}</div>
        <div class="lb-info">
          <div class="lb-chapter-name">${escapeHtml(t.name)}</div>
          <div class="lb-chapter-num">${t.count} paper${t.count !== 1 ? 's' : ''} covered this topic</div>
        </div>
        <div class="lb-bar-wrap">
          <div class="lb-bar-track">
            <div class="lb-bar-fill ${barClass}" style="width:0%;background:linear-gradient(90deg, var(--primary), var(--accent))" data-target="${barWidth}%"></div>
          </div>
        </div>
        <div class="lb-count">
          <span class="lb-count-num">${t.count}</span>
          <span class="lb-count-label">${t.count === 1 ? 'paper' : 'papers'}</span>
        </div>
      `;
      lbList.appendChild(row);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const fill = row.querySelector('.lb-bar-fill');
          if (fill) fill.style.width = fill.dataset.target;
        }, 100 + idx * 70);
      });
    });
  }
  refreshSubject();
  renderStats();
  switchTab('syllabus');
});
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function getGradeColor(grade) {
  const map = {
    A: 'var(--grade-a)', B: 'var(--grade-b)', C: 'var(--grade-c)',
    D: 'var(--grade-d)', E: 'var(--grade-e)', S: 'var(--grade-s)', U: '#fca5a5'
  };
  return map[grade] || 'var(--text-primary)';
}