document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getTheme());
  initThemeToggle();
  initStreak();
  initExamSystem();
  renderSubjects();
  renderShortcuts();
  renderUpcomingTasks();
});

function initThemeToggle() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;
  const update = () => {
    const t = getTheme();
    btn.textContent = t === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    btn.title = t === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  };
  update();
  btn.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next); applyTheme(next); update();
  });
}

function initStreak() {
  const streak = getStreak();
  const numEl  = document.getElementById('streak-num');
  const chip   = document.getElementById('streak-chip');
  if (numEl) numEl.textContent = streak.current;
  if (chip)  chip.title = 'Streak: ' + streak.current + ' day' + (streak.current !== 1 ? 's' : '') + '  |  Best: ' + streak.longest;

  const checkInBtn = document.getElementById('btn-checkin');
  if (!checkInBtn) return;
  if (streak.lastActivity === todayStr()) {
    checkInBtn.classList.add('checked-in');
    checkInBtn.innerHTML = '\u2713 Checked In';
  } else {
    checkInBtn.addEventListener('click', () => {
      const updated = recordActivity();
      if (numEl) numEl.textContent = updated.current;
      checkInBtn.classList.add('checked-in');
      checkInBtn.innerHTML = '\u2713 Checked In';
      showToast('\uD83D\uDD25 Day ' + updated.current + ' streak!', 'success');
    });
  }
}

function initExamSystem() {
  renderExamCountdowns();
  setInterval(updateExamTimers, 60000);

  document.getElementById('btn-add-exam').addEventListener('click', () => {
    document.getElementById('input-exam-name').value = '';
    document.getElementById('input-exam-date').value = '';
    openModal('modal-exam');
    setTimeout(() => document.getElementById('input-exam-name').focus(), 150);
  });

  document.getElementById('btn-save-exam').addEventListener('click', () => {
    const name     = document.getElementById('input-exam-name').value.trim();
    const dateStr  = document.getElementById('input-exam-date').value;
    const category = document.getElementById('input-exam-cat').value.trim();
    if (!name)    { showToast('Please enter an exam name.', 'error');  return; }
    if (!dateStr) { showToast('Please select a date.', 'error');       return; }
    addExamDate(name, dateStr, category);
    closeModal('modal-exam');
    renderExamCountdowns();
    showToast('\uD83D\uDCC5 Exam added!', 'success');
  });

  document.getElementById('btn-cancel-exam').addEventListener('click', () => closeModal('modal-exam'));

  const csvInput = document.getElementById('exam-csv-input');
  document.getElementById('btn-import-exam-csv').addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', handleExamCSVImport);

  const infoBtn   = document.getElementById('btn-exam-csv-info');
  const infoPanel = document.getElementById('exam-csv-format-panel');
  const closeInfo = document.getElementById('btn-close-exam-csv-info');
  function toggleExamFormatPanel(open) {
    const show = open !== undefined ? open : infoPanel.style.display === 'none';
    infoPanel.style.display = show ? '' : 'none';
    infoBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
  if (infoBtn)   infoBtn.addEventListener('click', () => toggleExamFormatPanel());
  if (closeInfo) closeInfo.addEventListener('click', () => toggleExamFormatPanel(false));

  const nameIn = document.getElementById('input-exam-name');
  const catIn  = document.getElementById('input-exam-cat');
  const dateIn = document.getElementById('input-exam-date');
  if (nameIn) nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') catIn.focus(); });
  if (catIn)  catIn.addEventListener('keydown',  e => { if (e.key === 'Enter') dateIn.focus(); });
  if (dateIn) dateIn.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-save-exam').click(); });
}

function parseCSVLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

function parseExamDate(raw) {
  const s = raw.replace(/^"|"$/g, '').trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2,'0') + '-' + dmy[1].padStart(2,'0');

  const months = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    january:1,february:2,march:3,april:4,june:6,july:7,august:8,
    september:9,october:10,november:11,december:12
  };
  const dmyNamed = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (dmyNamed) {
    const m = months[dmyNamed[2].toLowerCase()];
    if (m) return dmyNamed[3] + '-' + String(m).padStart(2,'0') + '-' + dmyNamed[1].padStart(2,'0');
  }
  const namedDmy = s.match(/^([a-zA-Z]+)\s+(\d{1,2})[,\s]+(\d{4})$/);
  if (namedDmy) {
    const m = months[namedDmy[1].toLowerCase()];
    if (m) return namedDmy[3] + '-' + String(m).padStart(2,'0') + '-' + namedDmy[2].padStart(2,'0');
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  return null;
}

function handleExamCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
    let imported = 0, skipped = 0;
    lines.forEach((line, idx) => {
      const cols = parseCSVLine(line);
      if (cols.length < 2) return;
      const name     = cols[0].replace(/^"|"$/g, '').trim();
      const rawDate  = cols[1].replace(/^"|"$/g, '').trim();
      const category = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : '';
      if (idx === 0) {
        const nl = name.toLowerCase(), dl = rawDate.toLowerCase();
        if (nl === 'name' || nl === 'exam name' || nl === 'exam' || dl === 'date' || dl === 'exam date') return;
      }
      if (!name) return;
      const dateStr = parseExamDate(rawDate);
      if (!dateStr) { skipped++; return; }
      addExamDate(name, dateStr, category);
      imported++;
    });
    e.target.value = '';
    renderExamCountdowns();
    if (imported > 0) showToast('\uD83D\uDCC5 Imported ' + imported + ' exam' + (imported !== 1 ? 's' : '') + '!', 'success');
    if (skipped  > 0) showToast(skipped + ' row' + (skipped !== 1 ? 's' : '') + ' had unreadable dates and were skipped.', 'error');
    if (imported === 0 && skipped === 0) showToast('No valid exam rows found in the CSV.', 'error');
  };
  reader.readAsText(file);
}

function urgencyColor(daysLeft) {
  if (daysLeft < 7)  return '#EF4444';
  if (daysLeft < 15) return '#F97316';
  if (daysLeft < 30) return 'var(--accent)';
  return 'var(--primary)';
}

function renderExamCountdowns() {
  const grid    = document.getElementById('exam-grid');
  const countEl = document.getElementById('exam-count');
  if (!grid) return;
  grid.innerHTML = '';

  const exams = getUpcomingExamDates();
  if (countEl) countEl.textContent = exams.length;

  if (exams.length === 0) {
    grid.innerHTML = '<div class="exam-empty-state"><p>No upcoming exams. Click <strong>+ Add Exam</strong> to start tracking.</p></div>';
    return;
  }

  const now = new Date();
  exams.forEach((exam, idx) => {
    const diffMs = Math.max(0, new Date(exam.dateStr + 'T00:00:00') - now);
    const days   = Math.floor(diffMs / 86400000);
    const color  = urgencyColor(days);

    const card = document.createElement('div');
    card.className = 'exam-card';
    card.id = `exam-card-${exam.id}`;
    card.style.cssText = `animation: fadeInUp 0.3s ease ${idx * 0.07}s both; --exam-accent: ${color};`;
    card.innerHTML = `
      <button class="exam-delete-btn" data-id="${exam.id}" title="Remove">\u2715</button>
      <div class="exam-card-name">${escapeHtml(exam.name)}</div>
      <div class="exam-card-days" id="exam-days-${exam.id}">${days}</div>
      <div class="exam-card-days-lbl">days</div>
      ${exam.category ? `<div class="exam-card-cat">${escapeHtml(exam.category)}</div>` : '<div class="exam-card-cat-empty"></div>'}
    `;
    card.querySelector('.exam-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeExamDate(exam.id);
      renderExamCountdowns();
      showToast('Exam removed.', 'success');
    });
    grid.appendChild(card);
  });
}

function updateExamTimers() {
  const exams = getUpcomingExamDates();
  const now   = new Date();
  exams.forEach(exam => {
    const dEl = document.getElementById(`exam-days-${exam.id}`);
    if (!dEl) return;
    const diffMs = Math.max(0, new Date(exam.dateStr + 'T00:00:00') - now);
    dEl.textContent = Math.floor(diffMs / 86400000);
  });
}

const subjectPalettes = [
  'linear-gradient(90deg,#6C63FF,#9B8FFF)',
  'linear-gradient(90deg,#00D4AA,#22C55E)',
  'linear-gradient(90deg,#F97316,#EAB308)',
  'linear-gradient(90deg,#EF4444,#F97316)',
  'linear-gradient(90deg,#8B5CF6,#EC4899)',
  'linear-gradient(90deg,#06B6D4,#3B82F6)',
  'linear-gradient(90deg,#84CC16,#22C55E)',
  'linear-gradient(90deg,#F59E0B,#EF4444)',
];

function renderSubjects() {
  const subjects     = getSubjects();
  const subjectsGrid = document.getElementById('subjects-grid');
  const subjectCount = document.getElementById('subject-count');
  subjectsGrid.innerHTML = '';

  subjects.forEach((subj, idx) => {
    const palette = subjectPalettes[idx % subjectPalettes.length];
    const papers  = subj.papers || [];
    const avgPct  = papers.length ? Math.round(papers.reduce((s, p) => s + p.percentage, 0) / papers.length) : null;

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--card-accent', palette);
    card.style.animation = `fadeInUp 0.4s ease ${idx * 0.06}s both`;

    card.innerHTML = `
      <div class="subject-card-header">
        <div class="subject-icon">${subj.icon || '\uD83D\uDCDA'}</div>
        <button class="subject-menu-btn" title="Remove subject">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
      <h3>${escapeHtml(subj.name)}</h3>
      <div class="subject-stats">
        <div class="subject-stat"><span class="subject-stat-value">${(subj.chapters||[]).length}</span><span class="subject-stat-label">Chapters</span></div>
        <div class="subject-stat"><span class="subject-stat-value">${papers.length}</span><span class="subject-stat-label">Papers</span></div>
        ${avgPct !== null ? `<div class="subject-stat"><span class="subject-stat-value" style="color:${getGradeColor(calculateGrade(avgPct))}">${avgPct}%</span><span class="subject-stat-label">Avg</span></div>` : ''}
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.subject-menu-btn')) return;
      window.location.href = `subject.html?id=${subj.id}`;
    });
    card.querySelector('.subject-menu-btn').addEventListener('click', e => {
      e.stopPropagation();
      openDeleteSubjectConfirm(subj.id, subj.name);
    });
    subjectsGrid.appendChild(card);
  });

  if (subjects.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>No subjects yet. Click <strong>Add Subject</strong> to get started.</p>`;
    subjectsGrid.appendChild(empty);
  }
  subjectCount.textContent = subjects.length;
}

let pendingDeleteSubjectId = null;

function openDeleteSubjectConfirm(id, name) {
  pendingDeleteSubjectId = id;
  document.getElementById('confirm-delete-subject-name').textContent = name;
  openModal('modal-confirm-delete-subject');
}

document.getElementById('btn-confirm-delete-subject').addEventListener('click', () => {
  if (!pendingDeleteSubjectId) return;
  removeSubject(pendingDeleteSubjectId);
  pendingDeleteSubjectId = null;
  closeModal('modal-confirm-delete-subject');
  renderSubjects(); renderUpcomingTasks();
  showToast('Subject removed.', 'success');
});
document.getElementById('btn-cancel-delete-subject').addEventListener('click', () => {
  pendingDeleteSubjectId = null; closeModal('modal-confirm-delete-subject');
});

const subjectNameInput  = document.getElementById('input-subject-name');
const subjectIconSelect = document.getElementById('input-subject-icon');

document.getElementById('btn-save-subject').addEventListener('click', () => {
  const name = subjectNameInput.value.trim();
  if (!name) { showToast('Please enter a subject name.', 'error'); return; }
  addSubject(name, subjectIconSelect.value || '\uD83D\uDCDA');
  subjectNameInput.value = ''; subjectIconSelect.value = '\uD83D\uDCDA';
  closeModal('modal-add-subject'); renderSubjects();
  showToast(`"${name}" added!`, 'success');
});
document.getElementById('btn-cancel-add-subject').addEventListener('click', () => closeModal('modal-add-subject'));
subjectNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-save-subject').click(); });

function renderShortcuts() {
  const shortcuts     = getShortcuts();
  const shortcutsGrid = document.getElementById('shortcuts-grid');
  const shortcutCount = document.getElementById('shortcut-count');
  shortcutsGrid.innerHTML = '';

  shortcuts.forEach((sc, idx) => {
    const faviconUrl = getFaviconUrl(sc.url);
    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.style.animation = `fadeInUp 0.4s ease ${idx * 0.05}s both`;
    card.innerHTML = `
      <button class="shortcut-delete" title="Remove">\u2715</button>
      <div class="shortcut-icon">
        ${faviconUrl ? `<img src="${faviconUrl}" alt="${escapeHtml(sc.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
        <span class="shortcut-fallback" ${faviconUrl ? 'style="display:none"' : ''}>${escapeHtml(sc.name.slice(0,2).toUpperCase())}</span>
      </div>
      <span class="shortcut-name">${escapeHtml(sc.name)}</span>
    `;
    card.addEventListener('click', e => { if (!e.target.closest('.shortcut-delete')) window.open(sc.url, '_blank', 'noopener'); });
    card.querySelector('.shortcut-delete').addEventListener('click', e => {
      e.stopPropagation(); removeShortcut(sc.id); renderShortcuts();
      showToast('Shortcut removed.', 'success');
    });
    shortcutsGrid.appendChild(card);
  });

  if (shortcuts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state'; empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `<p>No shortcuts yet. Click <strong>Add Shortcut</strong> to add quick links.</p>`;
    shortcutsGrid.appendChild(empty);
  }
  shortcutCount.textContent = shortcuts.length;
}

const scNameInput = document.getElementById('input-sc-name');
const scUrlInput  = document.getElementById('input-sc-url');
document.getElementById('btn-save-shortcut').addEventListener('click', () => {
  const name = scNameInput.value.trim(), url = scUrlInput.value.trim();
  if (!name) { showToast('Please enter a shortcut name.', 'error'); return; }
  if (!url)  { showToast('Please enter a URL.', 'error'); return; }
  addShortcut(name, url); scNameInput.value = ''; scUrlInput.value = '';
  closeModal('modal-add-shortcut'); renderShortcuts();
  showToast(`Shortcut "${name}" added!`, 'success');
});
document.getElementById('btn-cancel-add-shortcut').addEventListener('click', () => closeModal('modal-add-shortcut'));
scUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-save-shortcut').click(); });

function renderUpcomingTasks() {
  const container = document.getElementById('upcoming-tasks-list');
  const section   = document.getElementById('upcoming-tasks-section');
  const countEl   = document.getElementById('upcoming-tasks-count');
  if (!container) return;

  const allPending = getAllUpcomingTasks();
  container.innerHTML = '';

  if (allPending.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  if (countEl) countEl.textContent = allPending.length;

  const today   = todayStr();
  const in3Days = (() => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  })();

  function dueRank(t) {
    if (!t.dueDate)           return 4;
    if (t.dueDate < today)    return 0;
    if (t.dueDate === today)  return 1;
    if (t.dueDate <= in3Days) return 2;
    return 3;
  }

  [...allPending].sort((a, b) => {
    const r = dueRank(a) - dueRank(b);
    if (r !== 0) return r;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return a.created - b.created;
  }).forEach((task, idx) => {
    const item = document.createElement('div');
    item.className = 'upcoming-task-item';
    item.style.animationDelay = `${idx * 0.04}s`;

    let dueClass = '', dueText = '';
    if (task.dueDate) {
      if      (task.dueDate < today)      { dueClass = 'due-overdue'; dueText = 'Overdue'; }
      else if (task.dueDate === today)    { dueClass = 'due-today';   dueText = 'Today'; }
      else if (task.dueDate <= in3Days)   { dueClass = 'due-soon';    dueText = 'Soon'; }
      else                               { dueClass = 'due-later';   dueText = task.dueDate; }
    }

    item.innerHTML = `
      <div class="upcoming-task-check" title="Mark complete">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="upcoming-task-subject-icon">${task.subjectIcon || '\uD83D\uDCDA'}</div>
      <div class="upcoming-task-info">
        <div class="upcoming-task-title">${escapeHtml(task.title)}</div>
        <div class="upcoming-task-subject">${escapeHtml(task.subjectName)}</div>
      </div>
      ${dueText ? `<span class="upcoming-task-due ${dueClass}">${dueText}</span>` : ''}
    `;

    item.querySelector('.upcoming-task-check').addEventListener('click', e => {
      e.stopPropagation();
      item.classList.add('completing');
      setTimeout(() => { toggleTask(task.subjectId, task.id); renderUpcomingTasks(); renderSubjects(); }, 320);
    });
    item.addEventListener('click', () => { window.location.href = `subject.html?id=${task.subjectId}&tab=tasks`; });
    container.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function getGradeColor(grade) {
  const map = { A:'var(--grade-a)', B:'var(--grade-b)', C:'var(--grade-c)', D:'var(--grade-d)', E:'var(--grade-e)', S:'var(--grade-s)', U:'#fca5a5' };
  return map[grade] || 'var(--text-primary)';
}