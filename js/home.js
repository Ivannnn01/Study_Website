document.addEventListener('DOMContentLoaded', () => {
  const currentUser = requireSession();
  if (!currentUser) return;
  const displayName = getUserDisplayName(currentUser);
  const initials    = getInitials(displayName);
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = displayName);
  document.querySelectorAll('.user-initials').forEach(el => el.textContent = initials);
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });
  const subjectPalettes = [
    'linear-gradient(90deg, #6C63FF, #9B8FFF)',
    'linear-gradient(90deg, #00D4AA, #22C55E)',
    'linear-gradient(90deg, #F97316, #EAB308)',
    'linear-gradient(90deg, #EF4444, #F97316)',
    'linear-gradient(90deg, #8B5CF6, #EC4899)',
    'linear-gradient(90deg, #06B6D4, #3B82F6)',
    'linear-gradient(90deg, #84CC16, #22C55E)',
    'linear-gradient(90deg, #F59E0B, #EF4444)',
  ];

  const subjectEmojis = ['📐', '📊', '⚗️', '📝', '🔢', '📖', '🧪', '🌍', '🎨', '💻', '🏛️', '🔭'];
  const subjectsGrid = document.getElementById('subjects-grid');
  const subjectCount = document.getElementById('subject-count');

  function renderSubjects() {
    const subjects = getSubjects(currentUser);
    subjectsGrid.innerHTML = '';

    subjects.forEach((subj, idx) => {
      const palette = subjectPalettes[idx % subjectPalettes.length];
      const card = document.createElement('div');
      card.className = 'subject-card stagger-children';
      card.setAttribute('data-id', subj.id);
      card.style.setProperty('--card-accent', palette);
      card.style.animationDelay = `${idx * 0.05}s`;
      card.style.opacity = '0';
      card.style.animation = `fadeInUp 0.4s ease ${idx * 0.06}s forwards`;

      const chapters = subj.chapters || [];
      const papers   = subj.papers   || [];
      const avgPct   = papers.length
        ? Math.round(papers.reduce((sum, p) => sum + p.percentage, 0) / papers.length)
        : null;

      card.innerHTML = `
        <div class="subject-card-header">
          <div class="subject-icon">${subj.icon || '📚'}</div>
          <button class="subject-menu-btn" aria-label="Remove subject" data-id="${subj.id}" title="Remove subject">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
          ${avgPct !== null ? `
          <div class="subject-stat">
            <span class="subject-stat-value" style="color:${getGradeColor(calculateGrade(avgPct))}">${avgPct}%</span>
            <span class="subject-stat-label">Avg Score</span>
          </div>` : ''}
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
    const addCard = document.createElement('button');
    addCard.className = 'add-subject-card';
    addCard.id = 'btn-add-subject';
    addCard.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>Add Subject</span>
    `;
    addCard.addEventListener('click', () => openModal('modal-add-subject'));
    subjectsGrid.appendChild(addCard);

    subjectCount.textContent = subjects.length;
    renderWelcomeStats();
  }
  let pendingDeleteSubjectId = null;

  function openDeleteSubjectConfirm(id, name) {
    pendingDeleteSubjectId = id;
    document.getElementById('confirm-delete-subject-name').textContent = name;
    openModal('modal-confirm-delete-subject');
  }

  document.getElementById('btn-confirm-delete-subject').addEventListener('click', () => {
    if (!pendingDeleteSubjectId) return;
    removeSubject(currentUser, pendingDeleteSubjectId);
    pendingDeleteSubjectId = null;
    closeModal('modal-confirm-delete-subject');
    renderSubjects();
    renderShortcuts();
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
    const icon = subjectIconSelect.value || '📚';
    addSubject(currentUser, name, icon);
    subjectNameInput.value = '';
    subjectIconSelect.value = '📚';
    closeModal('modal-add-subject');
    renderSubjects();
    showToast(`"${name}" added!`, 'success');
  });

  document.getElementById('btn-cancel-add-subject').addEventListener('click', () => {
    closeModal('modal-add-subject');
  });

  subjectNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-subject').click();
  });
  const shortcutsGrid  = document.getElementById('shortcuts-grid');
  const shortcutCount  = document.getElementById('shortcut-count');

  function renderShortcuts() {
    const shortcuts = getShortcuts(currentUser);
    shortcutsGrid.innerHTML = '';

    shortcuts.forEach((sc, idx) => {
      const card = document.createElement('div');
      card.className = 'shortcut-card';
      card.style.animation = `fadeInUp 0.4s ease ${idx * 0.05}s forwards`;
      card.style.opacity = '0';

      const faviconUrl = getFaviconUrl(sc.url);
      const iconHtml = faviconUrl
        ? `<img src="${faviconUrl}" alt="${escapeHtml(sc.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
        : '';
      const fallback = `<span class="shortcut-fallback" ${faviconUrl ? 'style="display:none"' : ''}>${getInitials(sc.name)}</span>`;

      card.innerHTML = `
        <button class="shortcut-delete" data-id="${sc.id}" aria-label="Remove shortcut" title="Remove">✕</button>
        <div class="shortcut-icon">${iconHtml}${fallback}</div>
        <span class="shortcut-name">${escapeHtml(sc.name)}</span>
      `;

      card.addEventListener('click', e => {
        if (e.target.closest('.shortcut-delete')) return;
        window.open(sc.url, '_blank', 'noopener');
      });

      card.querySelector('.shortcut-delete').addEventListener('click', e => {
        e.stopPropagation();
        removeShortcut(currentUser, sc.id);
        renderShortcuts();
        showToast('Shortcut removed.', 'success');
      });

      shortcutsGrid.appendChild(card);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'add-shortcut-card';
    addBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>Add</span>
    `;
    addBtn.addEventListener('click', () => openModal('modal-add-shortcut'));
    shortcutsGrid.appendChild(addBtn);

    shortcutCount.textContent = shortcuts.length;
  }
  const scNameInput = document.getElementById('input-sc-name');
  const scUrlInput  = document.getElementById('input-sc-url');

  document.getElementById('btn-save-shortcut').addEventListener('click', () => {
    const name = scNameInput.value.trim();
    const url  = scUrlInput.value.trim();
    if (!name) { showToast('Please enter a shortcut name.', 'error'); return; }
    if (!url)  { showToast('Please enter a URL.', 'error'); return; }
    addShortcut(currentUser, name, url);
    scNameInput.value = '';
    scUrlInput.value  = '';
    closeModal('modal-add-shortcut');
    renderShortcuts();
    showToast(`Shortcut "${name}" added!`, 'success');
  });

  document.getElementById('btn-cancel-add-shortcut').addEventListener('click', () => {
    closeModal('modal-add-shortcut');
  });

  scUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-save-shortcut').click();
  });
  function renderWelcomeStats() {
    const subjects  = getSubjects(currentUser);
    const allPapers = subjects.flatMap(s => s.papers || []);
    document.getElementById('stat-subjects').textContent = subjects.length;
    document.getElementById('stat-papers').textContent   = allPapers.length;

    const avgPct = allPapers.length
      ? Math.round(allPapers.reduce((sum, p) => sum + p.percentage, 0) / allPapers.length)
      : 0;
    document.getElementById('stat-avg').textContent = allPapers.length ? avgPct + '%' : '—';
  }
  renderSubjects();
  renderShortcuts();
  renderWelcomeStats();
});
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getGradeColor(grade) {
  const map = {
    A: 'var(--grade-a)',
    B: 'var(--grade-b)',
    C: 'var(--grade-c)',
    D: 'var(--grade-d)',
    E: 'var(--grade-e)',
    S: 'var(--grade-s)',
    U: '#fca5a5'
  };
  return map[grade] || 'var(--text-primary)';
}