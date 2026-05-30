const DB_KEY = 'studyapp_data';

function getData() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{"subjects":[],"shortcuts":[]}');
  } catch(e) {
    return { subjects: [], shortcuts: [] };
  }
}

function saveData(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getSubjects() {
  return getData().subjects || [];
}

function saveSubjects(subjects) {
  const data = getData();
  data.subjects = subjects;
  saveData(data);
}

function addSubject(name, icon) {
  const subjects = getSubjects();
  const subject = {
    id: 'subj_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name,
    icon: icon || '📚',
    chapters: [],
    papers: [],
    created: Date.now()
  };
  subjects.push(subject);
  saveSubjects(subjects);
  return subject;
}

function removeSubject(subjectId) {
  saveSubjects(getSubjects().filter(s => s.id !== subjectId));
}

function getSubject(subjectId) {
  return getSubjects().find(s => s.id === subjectId) || null;
}

function updateSubject(subjectId, updates) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx] = { ...subjects[idx], ...updates };
  saveSubjects(subjects);
}

function addChapter(subjectId, number, name) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return null;
  const chapter = {
    id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    number: parseInt(number),
    name
  };
  subjects[idx].chapters = subjects[idx].chapters || [];
  subjects[idx].chapters.push(chapter);
  subjects[idx].chapters.sort((a, b) => a.number - b.number);
  saveSubjects(subjects);
  return chapter;
}

function removeChapter(subjectId, chapterId) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].chapters = (subjects[idx].chapters || []).filter(c => c.id !== chapterId);
  subjects[idx].papers = (subjects[idx].papers || []).map(p => ({
    ...p,
    difficultChapters: (p.difficultChapters || []).filter(dc => dc !== chapterId)
  }));
  saveSubjects(subjects);
}

function updateChapter(subjectId, chapterId, updates) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  const cidx = subjects[idx].chapters.findIndex(c => c.id === chapterId);
  if (cidx === -1) return;
  subjects[idx].chapters[cidx] = { ...subjects[idx].chapters[cidx], ...updates };
  subjects[idx].chapters.sort((a, b) => a.number - b.number);
  saveSubjects(subjects);
}

function addPaper(subjectId, name, score, total, difficultChapters, topics) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return null;
  const pct = total > 0 ? Math.round((score / total) * 100 * 10) / 10 : 0;
  const paper = {
    id: 'paper_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name,
    score: parseFloat(score),
    total: parseFloat(total),
    percentage: pct,
    grade: calculateGrade(pct),
    difficultChapters: difficultChapters || [],
    topics: (topics || []).map(t => t.trim()).filter(t => t.length > 0),
    created: Date.now()
  };
  subjects[idx].papers = subjects[idx].papers || [];
  subjects[idx].papers.push(paper);
  saveSubjects(subjects);
  return paper;
}

function removePaper(subjectId, paperId) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].papers = (subjects[idx].papers || []).filter(p => p.id !== paperId);
  saveSubjects(subjects);
}

function calculateGrade(pct) {
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 45) return 'E';
  if (pct >= 40) return 'S';
  return 'U';
}

function isGPSubject(subject) {
  return subject && subject.name.toLowerCase().includes('general paper');
}

function getGPTopics(subjectId) {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  const countMap = {};
  (subject.papers || []).forEach(paper => {
    (paper.topics || []).forEach(rawTopic => {
      const topic = rawTopic.trim();
      if (!topic) return;
      const key = topic.toLowerCase();
      if (!countMap[key]) countMap[key] = { name: topic, count: 0 };
      countMap[key].count++;
    });
  });
  return Object.values(countMap).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function getShortcuts() {
  return getData().shortcuts || [];
}

function addShortcut(name, url) {
  const data = getData();
  const shortcut = {
    id: 'sc_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name,
    url: normalizeUrl(url),
    created: Date.now()
  };
  data.shortcuts = data.shortcuts || [];
  data.shortcuts.push(shortcut);
  saveData(data);
  return shortcut;
}

function removeShortcut(shortcutId) {
  const data = getData();
  data.shortcuts = (data.shortcuts || []).filter(s => s.id !== shortcutId);
  saveData(data);
}

function getChapterLeaderboard(subjectId) {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  const chapters = subject.chapters || [];
  const papers   = subject.papers   || [];
  const countMap = {};
  papers.forEach(paper => {
    (paper.difficultChapters || []).forEach(chId => {
      countMap[chId] = (countMap[chId] || 0) + 1;
    });
  });
  return chapters
    .map(ch => ({ ...ch, count: countMap[ch.id] || 0 }))
    .filter(ch => ch.count > 0)
    .sort((a, b) => b.count - a.count || a.number - b.number);
}

function normalizeUrl(url) {
  if (!url) return '#';
  if (url === '#') return '#';
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(normalizeUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch {
    return null;
  }
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.add('active');
}

function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) overlay.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAllModals();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});