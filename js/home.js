document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getTheme());
  initThemeToggle();
  initStreak();
  initCountdown();
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
    setTheme(next);
    applyTheme(next);
    update();
  });
}

function initStreak() {
  const streak = getStreak();
  const chip = document.getElementById('streak-chip');
  const numEl = document.getElementById('streak-num');
  if (chip && numEl) {
    numEl.textContent = streak.current;
    chip.title = 'Current streak: ' + streak.current + ' day' + (streak.current !== 1 ? 's' : '') +
      ' | Best: ' + streak.longest;
  }

  const checkInBtn = document.getElementById('btn-checkin');
  if (checkInBtn) {
    const today = todayStr();
    const alreadyDone = streak.lastActivity === today;
    if (alreadyDone) {
      checkInBtn.classList.add('checked-in');
      checkInBtn.innerHTML = '\u2713 Checked In';
    } else {
      checkInBtn.addEventListener('click', () => {
        const updated = recordActivity();
        numEl.textContent = updated.current;
        checkInBtn.classList.add('checked-in');
        checkInBtn.innerHTML = '\u2713 Checked In';
        renderHeatmap();
        showToast('\uD83D\uDD25 Day ' + updated.current + ' streak!', 'success');
      });
    }
  }

  renderStreakWidget();
  renderHeatmap();
}

function renderStreakWidget() {
  const streak = getStreak();
  const cur = document.getElementById('streak-current-val');
  const lng = document.getElementById('streak-longest-val');
  if (cur) cur.textContent = streak.current;
  if (lng) lng.textContent = streak.longest;
}

function renderHeatmap() {
  const container = document.getElementById('streak-heatmap');
  if (!container) return;
  const streak = getStreak();
  const activitySet = new Set(streak.activityDates || []);
  const today = todayStr();
  container.innerHTML = '';

  for (let i = 55; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    if (ds === today && activitySet.has(ds)) {
      cell.classList.add('active-today');
    } else if (activitySet.has(ds)) {
      cell.classList.add('active');
    }
    cell.title = ds;
    container.appendChild(cell);
  }
}

function initCountdown() {
  renderCountdown();
  setInterval(renderCountdown, 1000);

  const editBtn = document.getElementById('btn-countdown-edit');
  if (editBtn) editBtn.addEventListener('click', openExamModal);
  const setupBtn = document.getElementById('btn-countdown-setup');
  if (setupBtn) setupBtn.addEventListener('click', openExamModal);

  document.getElementById('btn-save-exam').addEventListener('click', () => {
    const name    = document.getElementById('input-exam-name').value.trim();
    const dateStr = document.getElementById('input-exam-date').value;
    if (!name)    { showToast('Please enter an exam name.', 'error'); return; }
    if (!dateStr) { showToast('Please select a date.', 'error'); return; }
    setExamConfig(name, dateStr);
    closeModal('modal-exam');
    renderCountdown();
    showToast('Exam date set!', 'success');
  });

  document.getElementById('btn-cancel-exam').addEventListener('click', () => closeModal('modal-exam'));

  const clearBtn = document.getElementById('btn-clear-exam');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearExamConfig();
      closeModal('modal-exam');
      renderCountdown();
    });
  }
}

function openExamModal() {
  const cfg = getExamConfig();
  if (cfg) {
    document.getElementById('input-exam-name').value = cfg.name;
    document.getElementById('input-exam-date').value = cfg.dateStr;
  } else {
    document.getElementById('input-exam-name').value = '';
    document.getElementById('input-exam-date').value = '';
  }
  openModal('modal-exam');
  setTimeout(() => document.getElementById('input-exam-name').focus(), 150);
}

function renderCountdown() {
  const cfg = getExamConfig();
  const noExam   = document.getElementById('countdown-no-exam');
  const hasExam  = document.getElementById('countdown-has-exam');
  const editBtn  = document.getElementById('btn-countdown-edit');
  if (!noExam || !hasExam) return;

  if (!cfg) {
    noExam.style.display  = '';
    hasExam.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    return;
  }

  noExam.style.display  = 'none';
  hasExam.style.display = '';
  if (editBtn) editBtn.style.display = '';

  const now      = new Date();
  const exam     = new Date(cfg.dateStr + 'T00:00:00');
  const diffMs   = exam - now;
  const isPast   = diffMs <= 0;

  document.getElementById('countdown-exam-name').textContent = cfg.name;

  if (isPast) {
    document.getElementById('countdown-h').textContent = '00';
    document.getElementById('countdown-m').textContent = '00';
    document.getElementById('countdown-days').textContent = '0';
    document.getElementById('countdown-days-lbl').textContent = 'days ago';
    setRingOffset(0);
    return;
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days     = Math.floor(totalSec / 86400);
  const hours    = Math.floor((totalSec % 86400) / 3600);
  const mins     = Math.floor((totalSec % 3600) / 60);

  document.getElementById('countdown-days').textContent = days;
  document.getElementById('countdown-h').textContent    = String(hours).padStart(2, '0');
  document.getElementById('countdown-m').textContent    = String(mins).padStart(2, '0');

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const elapsed   = now - yearStart;
  const total     = exam - yearStart;
  const pct       = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
  const circum    = 2 * Math.PI * 45;
  setRingOffset(circum - pct * circum);
}

function setRingOffset(offset) {
  const fill = document.getElementById('countdown-ring-fill');
  if (fill) fill.style.strokeDashoffset = String(offset);
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
    const palette  = subjectPalettes[idx % subjectPalettes.length];
    const chapters = subj.chapters || [];
    const papers   = subj.papers   || [];
    const tasks    = (subj.tasks   || []).filter(t => !t.completed);
    const avgPct   = papers.length
      ? Math.round(papers.reduce((s, p) => s + p.percentage, 0) / papers.length)
      : null;

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.id = subj.id;
    card.style.setProperty('--card-accent', palette);
    card.style.animation = `fadeInUp 0.4s ease ${idx * 0.06}s both`;

    const taskBadge = tasks.length > 0
      ? `<span style="font-size:0.7rem;color:var(--accent);font-weight:600;margin-top:4px;display:block">\u2713 ${tasks.length} task${tasks.length !== 1 ? 's' : ''} pending</span>`
      : '';

    card.innerHTML = `
      <div class="subject-card-header">
        <div class="subject-icon">${subj.icon || '\uD83D\uDCDA'}</div>
        <button class="subject-menu-btn" aria-label="Remove subject" data-id="${subj.id}" title="Remove subject">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
      <h3>${escapeHtml(subj.name)}</h3>
      <div class="subject-stats">
        <div class="subject-stat">
          <span class="subject-stat-value">${chapters.length}</span>
          <span class="subject-stat-label">Chapters</span>
        </div>
        <div class="subject-stat">
          <span class="subject-stat-value">${papers.length}</span>
          <span class="subject-stat-label">Papers</span>
        </div>
        ${avgPct !== null ? `<div class="subject-stat">
          <span class="subject-stat-value" style="color:${getGradeColor(calculateGrade(avgPct))}">${avgPct}%</span>
          <span class="subject-stat-label">Avg</span>
        </div>` : ''}
      </div>
      ${taskBadge}
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
    empty.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <p>No subjects yet. Click <strong>Add Subject</strong> to get started.</p>
    `;
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
  renderSubjects();
  renderShortcuts();
  renderUpcomingTasks();
  showToast('Subject removed.', 'success');
});

document.getElementById('btn-cancel-delete-subject').addEventListener('click', () => {
  pendingDeleteSubjectId = null;
  closeModal('modal-confirm-delete-subject');
});

const subjectNameInput  = document.getElementById('input-subject-name');
const subjectIconSelect = document.getElementById('input-subject-icon');

document.getElementById('btn-save-subject').addEventListener('click', () => {
  const name = subjectNameInput.value.trim();
  if (!name) { showToast('Please enter a subject name.', 'error'); return; }
  const icon = subjectIconSelect.value || '\uD83D\uDCDA';
  addSubject(name, icon);
  subjectNameInput.value = '';
  subjectIconSelect.value = '\uD83D\uDCDA';
  closeModal('modal-add-subject');
  renderSubjects();
  showToast(`"${name}" added!`, 'success');
});

document.getElementById('btn-cancel-add-subject').addEventListener('click', () => closeModal('modal-add-subject'));

subjectNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-save-subject').click();
});

function renderShortcuts() {
  const shortcuts     = getShortcuts();
  const shortcutsGrid = document.getElementById('shortcuts-grid');
  const shortcutCount = document.getElementById('shortcut-count');
  shortcutsGrid.innerHTML = '';

  shortcuts.forEach((sc, idx) => {
    const faviconUrl = getFaviconUrl(sc.url);
    const iconHtml   = faviconUrl
      ? `<img src="${faviconUrl}" alt="${escapeHtml(sc.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const fallback = `<span class="shortcut-fallback" ${faviconUrl ? 'style="display:none"' : ''}>${escapeHtml(sc.name.slice(0,2).toUpperCase())}</span>`;

    const card = document.createElement('div');
    card.className = 'shortcut-card';
    card.style.animation = `fadeInUp 0.4s ease ${idx * 0.05}s both`;
    card.innerHTML = `
      <button class="shortcut-delete" data-id="${sc.id}" aria-label="Remove shortcut" title="Remove">\u2715</button>
      <div class="shortcut-icon">${iconHtml}${fallback}</div>
      <span class="shortcut-name">${escapeHtml(sc.name)}</span>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.shortcut-delete')) return;
      window.open(sc.url, '_blank', 'noopener');
    });
    card.querySelector('.shortcut-delete').addEventListener('click', e => {
      e.stopPropagation();
      removeShortcut(sc.id);
      renderShortcuts();
      showToast('Shortcut removed.', 'success');
    });
    shortcutsGrid.appendChild(card);
  });

  if (shortcuts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `<p>No shortcuts yet. Click <strong>Add Shortcut</strong> to add quick links.</p>`;
    shortcutsGrid.appendChild(empty);
  }

  shortcutCount.textContent = shortcuts.length;
}

const scNameInput = document.getElementById('input-sc-name');
const scUrlInput  = document.getElementById('input-sc-url');

document.getElementById('btn-save-shortcut').addEventListener('click', () => {
  const name = scNameInput.value.trim();
  const url  = scUrlInput.value.trim();
  if (!name) { showToast('Please enter a shortcut name.', 'error'); return; }
  if (!url)  { showToast('Please enter a URL.', 'error'); return; }
  addShortcut(name, url);
  scNameInput.value = '';
  scUrlInput.value  = '';
  closeModal('modal-add-shortcut');
  renderShortcuts();
  showToast(`Shortcut "${name}" added!`, 'success');
});

document.getElementById('btn-cancel-add-shortcut').addEventListener('click', () => closeModal('modal-add-shortcut'));

scUrlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-save-shortcut').click();
});

function renderUpcomingTasks() {
  const container = document.getElementById('upcoming-tasks-list');
  const section   = document.getElementById('upcoming-tasks-section');
  if (!container) return;

  const tasks = getAllUpcomingTasks();
  container.innerHTML = '';

  if (tasks.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = '';
  document.getElementById('upcoming-tasks-count').textContent = tasks.length;

  const today    = todayStr();
  const in3Days  = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
  const in7Days  = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();

  const displayed = tasks.slice(0, 8);
  displayed.forEach((task, idx) => {
    const item = document.createElement('div');
    item.className = 'upcoming-task-item';
    item.style.animationDelay = `${idx * 0.04}s`;

    let dueClass = 'no-due', dueText = '';
    if (task.dueDate) {
      if (task.dueDate < today)       { dueClass = 'due-overdue'; dueText = 'Overdue'; }
      else if (task.dueDate === today) { dueClass = 'due-today';   dueText = 'Due Today'; }
      else if (task.dueDate <= in3Days){ dueClass = 'due-soon';    dueText = 'Due Soon'; }
      else                             { dueClass = 'due-later';   dueText = task.dueDate; }
    }

    item.innerHTML = `
      <div class="upcoming-task-subject-icon">${task.subjectIcon || '\uD83D\uDCDA'}</div>
      <div class="upcoming-task-info">
        <div class="upcoming-task-title">${escapeHtml(task.title)}</div>
        <div class="upcoming-task-subject">${escapeHtml(task.subjectName)}</div>
      </div>
      ${dueText ? `<span class="upcoming-task-due ${dueClass}">${dueText}</span>` : ''}
    `;
    item.addEventListener('click', () => {
      window.location.href = `subject.html?id=${task.subjectId}&tab=tasks`;
    });
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