// app.js — Главная инициализация

import { saveState, loadState }                        from './storage.js';
import { showNotification }                             from './notifications.js';
import { openModal, closeModal, initModalCloseButtons } from './modal.js';
import { createSprint, updateSprint, deleteSprint, addSnapshot } from './sprintManager.js';
import { createTask, updateTask, deleteTask, changeTaskStatus }   from './taskManager.js';
import { renderSprintList, renderMetrics, renderBoard, renderAnalytics, renderSprintBadge } from './ui.js';
import { renderBurndownChart, renderPieChart, destroyCharts } from './burndownChart.js';
import { getBurndownData }                              from './analytics.js';
import { exportJSON, importJSON }                       from './fileManager.js';
import { populateCompareSelects, runComparison, destroyCompareChart } from './compareView.js';

// ── СТЕЙТ ──
const state = { sprints: [], activeSprintId: null };
let searchQuery = '';

function getActiveSprint() {
  return state.sprints.find(s => s.id === state.activeSprintId) || null;
}
function save() {
  try { saveState(state); } catch { showNotification('Ошибка сохранения', 'error'); }
}
function refresh() {
  const sprint = getActiveSprint();
  renderSprintList(state.sprints, state.activeSprintId, selectSprint, editSprint, confirmDeleteSprint);
  renderSprintBadge(sprint);
  renderMetrics(sprint);
  renderBoard(sprint, searchQuery, editTask, confirmDeleteTask);
  renderBurndownChart(getBurndownData(sprint), sprint);
  const todo       = sprint ? sprint.tasks.filter(t => t.status === 'todo').length       : 0;
  const inprogress = sprint ? sprint.tasks.filter(t => t.status === 'inprogress').length : 0;
  const done       = sprint ? sprint.tasks.filter(t => t.status === 'done').length       : 0;
  renderPieChart(todo, inprogress, done);
  renderAnalytics(state.sprints, sprint);
  populateCompareSelects(state.sprints);
}

// ── НАВИГАЦИЯ ──
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + view)?.classList.add('active');
      const titles = { dashboard: 'Dashboard', board: 'Task Board', analytics: 'Analytics', compare: 'Сравнение спринтов' };
      document.getElementById('page-title').textContent = titles[view] || view;
      if (view === 'analytics') renderAnalytics(state.sprints, getActiveSprint());
      if (view === 'compare')   populateCompareSelects(state.sprints);
    });
  });
}

// ── СПРИНТЫ ──
function selectSprint(id) {
  state.activeSprintId = id; destroyCharts(); save(); refresh();
}
function editSprint(id) {
  const s = state.sprints.find(s => s.id === id);
  if (!s) return;
  document.getElementById('modal-sprint-title').textContent = 'Редактировать спринт';
  document.getElementById('sprint-edit-id').value = s.id;
  document.getElementById('sprint-name').value    = s.name;
  document.getElementById('sprint-start').value   = s.startDate;
  document.getElementById('sprint-end').value     = s.endDate;
  openModal('modal-sprint');
}
function confirmDeleteSprint(id) {
  const s = state.sprints.find(s => s.id === id);
  if (!s || !confirm('Удалить спринт «' + s.name + '»?')) return;
  state.sprints = deleteSprint(state.sprints, id);
  if (state.activeSprintId === id) { state.activeSprintId = state.sprints[0]?.id || null; destroyCharts(); }
  save(); refresh();
  showNotification('Спринт удалён', 'info');
}
function initSprintModal() {
  document.getElementById('btn-create-sprint').addEventListener('click', () => {
    document.getElementById('modal-sprint-title').textContent = 'Новый спринт';
    document.getElementById('sprint-edit-id').value = '';
    document.getElementById('sprint-name').value    = '';
    const today = new Date(), end = new Date(today);
    end.setDate(end.getDate() + 14);
    document.getElementById('sprint-start').value = today.toISOString().slice(0, 10);
    document.getElementById('sprint-end').value   = end.toISOString().slice(0, 10);
    openModal('modal-sprint');
  });
  document.getElementById('btn-save-sprint').addEventListener('click', () => {
    const editId = document.getElementById('sprint-edit-id').value;
    const name   = document.getElementById('sprint-name').value;
    const start  = document.getElementById('sprint-start').value;
    const end    = document.getElementById('sprint-end').value;
    try {
      if (editId) { updateSprint(state.sprints, editId, name, start, end); showNotification('Спринт обновлён', 'success'); }
      else {
        const sp = createSprint(state.sprints, name, start, end);
        if (!state.activeSprintId) { state.activeSprintId = sp.id; destroyCharts(); }
        showNotification('Спринт «' + sp.name + '» создан', 'success');
      }
      save(); refresh(); closeModal('modal-sprint');
    } catch (err) { showNotification(err.message, 'error'); }
  });
}

// ── ЗАДАЧИ ──
function editTask(taskId) {
  const sprint = getActiveSprint();
  if (!sprint) return;
  const task = sprint.tasks.find(t => t.id === taskId);
  if (!task) return;
  document.getElementById('modal-task-title').textContent = 'Редактировать задачу';
  document.getElementById('task-edit-id').value = task.id;
  document.getElementById('task-title').value   = task.title;
  document.getElementById('task-points').value  = task.points;
  document.getElementById('task-status').value  = task.status;
  openModal('modal-task');
}
function confirmDeleteTask(taskId) {
  const sprint = getActiveSprint();
  if (!sprint) return;
  const task = sprint.tasks.find(t => t.id === taskId);
  if (!task || !confirm('Удалить задачу «' + task.title + '»?')) return;
  deleteTask(sprint, taskId);
  save(); refresh();
  showNotification('Задача удалена', 'info');
}
function initTaskModal() {
  document.getElementById('btn-add-task').addEventListener('click', () => {
    if (!getActiveSprint()) { showNotification('Сначала создайте спринт', 'warn'); return; }
    document.getElementById('modal-task-title').textContent = 'Новая задача';
    document.getElementById('task-edit-id').value = '';
    document.getElementById('task-title').value   = '';
    document.getElementById('task-points').value  = '1';
    document.getElementById('task-status').value  = 'todo';
    openModal('modal-task');
  });
  document.getElementById('btn-save-task').addEventListener('click', () => {
    const sprint = getActiveSprint();
    const editId = document.getElementById('task-edit-id').value;
    const title  = document.getElementById('task-title').value;
    const points = document.getElementById('task-points').value;
    const status = document.getElementById('task-status').value;
    try {
      if (editId) { updateTask(sprint, editId, title, points, status); showNotification('Задача обновлена', 'success'); }
      else        { createTask(sprint, title, points, status);          showNotification('Задача добавлена', 'success'); }
      save(); refresh(); closeModal('modal-task');
    } catch (err) { showNotification(err.message, 'error'); }
  });
}

// ── DRAG-AND-DROP ──
function initDragDrop() {
  document.querySelectorAll('.sortable').forEach(list => {
    Sortable.create(list, {
      group: 'tasks', animation: 150, ghostClass: 'sortable-ghost',
      onEnd(evt) {
        const sprint = getActiveSprint();
        if (!sprint) return;
        const taskId = evt.item.dataset.id, newStatus = evt.to.dataset.status;
        if (!taskId || !newStatus) return;
        changeTaskStatus(sprint, taskId, newStatus);
        save(); refresh();
        const labels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
        showNotification('→ ' + (labels[newStatus] || newStatus), 'success');
      },
    });
  });
}

// ── ПОИСК ──
function initSearch() {
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderBoard(getActiveSprint(), searchQuery, editTask, confirmDeleteTask);
  });
}

// ── СНАПШОТ ──
function initSnapshot() {
  document.getElementById('btn-snapshot').addEventListener('click', () => {
    const sprint = getActiveSprint();
    if (!sprint) { showNotification('Нет активного спринта', 'warn'); return; }
    const snap = addSnapshot(sprint);
    save(); refresh();
    showNotification('Снапшот: ' + snap.remainingPoints + ' SP', 'success');
  });
}

// ── ТЕМА ──
function initTheme() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const saved = localStorage.getItem('sb_theme') || 'dark';
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  btn.textContent = saved === 'light' ? '☾' : '☀';
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('sb_theme', isLight ? 'dark' : 'light');
    btn.textContent = isLight ? '☀' : '☾';
  });
}

// ── СРАВНЕНИЕ ──
function initCompare() {
  document.getElementById('btn-run-compare')?.addEventListener('click', () => {
    if (state.sprints.length < 2) { showNotification('Нужно минимум 2 спринта', 'warn'); return; }
    runComparison(state.sprints);
  });
}

// ── ДЕМО ──
function initDemoLoader() {
  document.getElementById('btn-load-demo')?.addEventListener('click', async () => {
    if (state.sprints.length > 0 && !confirm('Загрузить демо? Текущие данные будут заменены.')) return;
    try {
      const res = await fetch('./demo-data.json');
      if (!res.ok) throw new Error('Файл не найден');
      const imported = await res.json();
      Object.assign(state, imported);
      destroyCharts(); destroyCompareChart();
      save(); refresh();
      showNotification('Демо загружено — 3 спринта', 'success');
    } catch (err) { showNotification('Ошибка: ' + err.message, 'error'); }
  });
}

// ── ФАЙЛЫ ──
function initFileManager() {
  document.getElementById('btn-export').addEventListener('click', () => {
    try { exportJSON(state); showNotification('Экспортировано', 'success'); }
    catch { showNotification('Ошибка экспорта', 'error'); }
  });
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('btn-import').click();
  });
  document.getElementById('btn-import').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importJSON(file);
      Object.assign(state, imported);
      destroyCharts(); destroyCompareChart();
      save(); refresh();
      showNotification('Данные импортированы', 'success');
    } catch (err) { showNotification(err.message, 'error'); }
    e.target.value = '';
  });
}

// ── ENTER ──
function initEnterKey() {
  ['sprint-name','sprint-start','sprint-end'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('btn-save-sprint').click(); });
  });
  ['task-title','task-points'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('btn-save-task').click(); });
  });
}

// ── INIT ──
function init() {
  const saved = loadState();
  if (saved) Object.assign(state, saved);
  initModalCloseButtons();
  initNavigation();
  initSprintModal();
  initTaskModal();
  initDragDrop();
  initSearch();
  initSnapshot();
  initTheme();
  initCompare();
  initDemoLoader();
  initFileManager();
  initEnterKey();
  refresh();
  if (state.sprints.length === 0) showNotification('Нажмите «▶ Загрузить демо» или создайте спринт', 'info');
}

document.addEventListener('DOMContentLoaded', init);
