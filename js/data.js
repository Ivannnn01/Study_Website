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
    icon: icon || '\uD83D\uDCDA',
    chapters: [],
    papers: [],
    tasks: [],
    links: [],
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
  recordActivity();
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

function getTheme() {
  return getData().theme || 'dark';
}

function setTheme(theme) {
  const data = getData();
  data.theme = theme;
  saveData(data);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getExamDates() {
  const data = getData();
  if (data.examConfig && !data.examDates) {
    data.examDates = [{ id: 'migrated_' + Date.now(), name: data.examConfig.name, dateStr: data.examConfig.dateStr }];
    delete data.examConfig;
    saveData(data);
  }
  return data.examDates || [];
}

function addExamDate(name, dateStr) {
  const data = getData();
  data.examDates = data.examDates || [];
  data.examDates.push({ id: 'exam_' + Date.now() + '_' + Math.random().toString(36).slice(2,5), name: name.trim(), dateStr });
  data.examDates.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  saveData(data);
}

function removeExamDate(id) {
  const data = getData();
  data.examDates = (data.examDates || []).filter(e => e.id !== id);
  saveData(data);
}

function getUpcomingExamDates() {
  const today = todayStr();
  return getExamDates().filter(e => e.dateStr >= today).sort((a, b) => a.dateStr.localeCompare(b.dateStr)).slice(0, 6);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getStreak() {
  const data = getData();
  if (!data.streak) {
    data.streak = { current: 0, longest: 0, lastActivity: null, activityDates: [] };
    saveData(data);
  }
  return data.streak;
}

function recordActivity() {
  const data = getData();
  const streak = data.streak || { current: 0, longest: 0, lastActivity: null, activityDates: [] };
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (streak.lastActivity === today) {
    return streak;
  }

  if (streak.lastActivity === yesterday) {
    streak.current = (streak.current || 0) + 1;
  } else {
    streak.current = 1;
  }

  streak.longest = Math.max(streak.longest || 0, streak.current);
  streak.lastActivity = today;

  if (!streak.activityDates) streak.activityDates = [];
  if (!streak.activityDates.includes(today)) {
    streak.activityDates.push(today);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.getFullYear() + '-' +
      String(cutoff.getMonth() + 1).padStart(2, '0') + '-' +
      String(cutoff.getDate()).padStart(2, '0');
    streak.activityDates = streak.activityDates.filter(d => d >= cutoffStr);
  }

  data.streak = streak;
  saveData(data);
  return streak;
}

function checkStreakValidity() {
  const data = getData();
  const streak = data.streak;
  if (!streak || !streak.lastActivity) return;
  const yesterday = yesterdayStr();
  const today = todayStr();
  if (streak.lastActivity !== today && streak.lastActivity !== yesterday) {
    streak.current = 0;
    data.streak = streak;
    saveData(data);
  }
}

function addTask(subjectId, title, dueDateStr, url) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return null;
  subjects[idx].tasks = subjects[idx].tasks || [];
  const task = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    title: title.trim(),
    dueDate: dueDateStr || null,
    url: url ? normalizeUrl(url) : null,
    completed: false,
    created: Date.now()
  };
  subjects[idx].tasks.push(task);
  saveSubjects(subjects);
  return task;
}

function addSubjectLink(subjectId, name, url) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return null;
  subjects[idx].links = subjects[idx].links || [];
  const link = {
    id: 'lnk_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    name: name.trim(),
    url: normalizeUrl(url),
    created: Date.now()
  };
  subjects[idx].links.push(link);
  saveSubjects(subjects);
  return link;
}

function removeSubjectLink(subjectId, linkId) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].links = (subjects[idx].links || []).filter(l => l.id !== linkId);
  saveSubjects(subjects);
}

function getSubjectLinks(subjectId) {
  const subject = getSubject(subjectId);
  return subject ? (subject.links || []) : [];
}

function toggleTask(subjectId, taskId) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].tasks = subjects[idx].tasks || [];
  const tidx = subjects[idx].tasks.findIndex(t => t.id === taskId);
  if (tidx === -1) return;
  subjects[idx].tasks[tidx].completed = !subjects[idx].tasks[tidx].completed;
  if (subjects[idx].tasks[tidx].completed) recordActivity();
  saveSubjects(subjects);
}

function removeTask(subjectId, taskId) {
  const subjects = getSubjects();
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return;
  subjects[idx].tasks = (subjects[idx].tasks || []).filter(t => t.id !== taskId);
  saveSubjects(subjects);
}

function getTasksForSubject(subjectId) {
  const subject = getSubject(subjectId);
  return subject ? (subject.tasks || []) : [];
}

function getAllUpcomingTasks() {
  const subjects = getSubjects();
  const result = [];
  const nowMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  subjects.forEach(subj => {
    (subj.tasks || []).forEach(task => {
      if (task.completed) return;
      result.push({ ...task, subjectId: subj.id, subjectName: subj.name, subjectIcon: subj.icon });
    });
  });
  result.sort((a, b) => {
    const aHas = !!a.dueDate, bHas = !!b.dueDate;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas) return a.dueDate.localeCompare(b.dueDate);
    return a.created - b.created;
  });
  return result;
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
  const icons = { success: '\u2713', error: '\u2715', info: 'i' };
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

(function initTheme() {
  const theme = getTheme();
  applyTheme(theme);
})();

checkStreakValidity();
recordActivity();