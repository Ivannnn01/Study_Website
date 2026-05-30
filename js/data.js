const DB_KEY_ACCOUNTS  = 'studyapp_accounts';
const DB_KEY_SESSION   = 'studyapp_session';

function getAllAccounts() {
  return JSON.parse(localStorage.getItem(DB_KEY_ACCOUNTS) || '{}');
}

function saveAllAccounts(accounts) {
  localStorage.setItem(DB_KEY_ACCOUNTS, JSON.stringify(accounts));
}

function accountExists(username) {
  return !!getAllAccounts()[username.toLowerCase()];
}

function createAccount(username, password) {
  const accounts = getAllAccounts();
  const key = username.toLowerCase();
  if (accounts[key]) return false;
  accounts[key] = {
    username: username,
    password: simpleHash(password),
    created: Date.now(),
    data: getEmptyUserData()
  };
  saveAllAccounts(accounts);
  return true;
}

function verifyLogin(username, password) {
  const accounts = getAllAccounts();
  const key = username.toLowerCase();
  if (!accounts[key]) return false;
  return accounts[key].password === simpleHash(password);
}

function getEmptyUserData() {
  return {
    subjects: [],
    shortcuts: []
  };
}

function setSession(username) {
  sessionStorage.setItem(DB_KEY_SESSION, username.toLowerCase());
}

function getSession() {
  return sessionStorage.getItem(DB_KEY_SESSION) || null;
}

function clearSession() {
  sessionStorage.removeItem(DB_KEY_SESSION);
}

function requireSession() {
  const user = getSession();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function getUserData(username) {
  const accounts = getAllAccounts();
  const key = username.toLowerCase();
  if (!accounts[key]) return null;
  return accounts[key].data || getEmptyUserData();
}

function saveUserData(username, data) {
  const accounts = getAllAccounts();
  const key = username.toLowerCase();
  if (!accounts[key]) return;
  accounts[key].data = data;
  saveAllAccounts(accounts);
}

function getUserDisplayName(username) {
  const accounts = getAllAccounts();
  const key = username.toLowerCase();
  if (!accounts[key]) return username;
  return accounts[key].username;
}

function getSubjects(username) {
  const data = getUserData(username);
  return data ? (data.subjects || []) : [];
}

function saveSubjects(username, subjects) {
  const data = getUserData(username) || getEmptyUserData();
  data.subjects = subjects;
  saveUserData(username, data);
}

function addSubject(username, name, icon) {
  const subjects = getSubjects(username);
  const id = 'subj_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const subject = {
    id,
    name,
    icon: icon || '📚',
    chapters: [],
    papers: [],
    created: Date.now()
  };
  subjects.push(subject);
  saveSubjects(username, subjects);
  return subject;
}

function removeSubject(username, subjectId) {
  let subjects = getSubjects(username);
  subjects = subjects.filter(s => s.id !== subjectId);
  saveSubjects(username, subjects);
}

function getSubject(username, subjectId) {
  const subjects = getSubjects(username);
  return subjects.find(s => s.id === subjectId) || null;
}

function updateSubject(username, subjectId, updates) {
  const subjects = getSubjects(username);
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx] = { ...subjects[idx], ...updates };
  saveSubjects(username, subjects);
}

function addChapter(username, subjectId, number, name) {
  const subjects = getSubjects(username);
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
  saveSubjects(username, subjects);
  return chapter;
}

function removeChapter(username, subjectId, chapterId) {
  const subjects = getSubjects(username);
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].chapters = (subjects[idx].chapters || []).filter(c => c.id !== chapterId);
  subjects[idx].papers = (subjects[idx].papers || []).map(p => ({
    ...p,
    difficultChapters: (p.difficultChapters || []).filter(dc => dc !== chapterId)
  }));
  saveSubjects(username, subjects);
}

function updateChapter(username, subjectId, chapterId, updates) {
  const subjects = getSubjects(username);
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  const cidx = subjects[idx].chapters.findIndex(c => c.id === chapterId);
  if (cidx === -1) return;
  subjects[idx].chapters[cidx] = { ...subjects[idx].chapters[cidx], ...updates };
  subjects[idx].chapters.sort((a, b) => a.number - b.number);
  saveSubjects(username, subjects);
}
function addPaper(username, subjectId, name, score, total, difficultChapters, topics) {
  const subjects = getSubjects(username);
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
  saveSubjects(username, subjects);
  return paper;
}

function removePaper(username, subjectId, paperId) {
  const subjects = getSubjects(username);
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].papers = (subjects[idx].papers || []).filter(p => p.id !== paperId);
  saveSubjects(username, subjects);
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
function getGPTopics(username, subjectId) {
  const subject = getSubject(username, subjectId);
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

function getShortcuts(username) {
  const data = getUserData(username);
  return data ? (data.shortcuts || []) : [];
}

function addShortcut(username, name, url) {
  const data = getUserData(username) || getEmptyUserData();
  const shortcut = {
    id: 'sc_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name,
    url: normalizeUrl(url),
    created: Date.now()
  };
  data.shortcuts = data.shortcuts || [];
  data.shortcuts.push(shortcut);
  saveUserData(username, data);
  return shortcut;
}

function removeShortcut(username, shortcutId) {
  const data = getUserData(username) || getEmptyUserData();
  data.shortcuts = (data.shortcuts || []).filter(s => s.id !== shortcutId);
  saveUserData(username, data);
}

function getChapterLeaderboard(username, subjectId) {
  const subject = getSubject(username, subjectId);
  if (!subject) return [];
  const chapters = subject.chapters || [];
  const papers   = subject.papers || [];
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

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return 'h_' + hash.toString(16);
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

function getInitials(name) {
  return (name || '?').split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
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