// ui.js — Обновление интерфейса

import { getTasksByStatus } from './taskManager.js';
import {
  getTotalPoints, getRemainingPoints, getCompletionRate,
  getVelocity, getForecastDate, getSprintHealth,
} from './analytics.js';

/**
 * Отрисовывает список спринтов в сайдбаре
 * @param {Sprint[]} sprints
 * @param {string} activeId
 * @param {Function} onSelect - (id) => void
 * @param {Function} onEdit   - (id) => void
 * @param {Function} onDelete - (id) => void
 */
export function renderSprintList(sprints, activeId, onSelect, onEdit, onDelete) {
  const container = document.getElementById('sprint-list');
  if (!container) return;

  if (sprints.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:16px 8px">
      <div style="font-size:10px">Нет спринтов</div>
    </div>`;
    return;
  }

  container.innerHTML = sprints.map(s => `
    <div class="sprint-item ${s.id === activeId ? 'active' : ''}" data-id="${s.id}">
      <span class="sprint-item-name">${escapeHtml(s.name)}</span>
      <div class="sprint-item-actions">
        <button class="sprint-action-btn edit-sprint" data-id="${s.id}" title="Редактировать">✎</button>
        <button class="sprint-action-btn del delete-sprint" data-id="${s.id}" title="Удалить">✕</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.sprint-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.sprint-item-actions')) return;
      onSelect(el.dataset.id);
    });
  });

  container.querySelectorAll('.edit-sprint').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); onEdit(btn.dataset.id); });
  });

  container.querySelectorAll('.delete-sprint').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(btn.dataset.id); });
  });
}

/**
 * Обновляет метрики на Dashboard
 * @param {Object|null} sprint
 */
export function renderMetrics(sprint) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  if (!sprint) {
    set('val-total', '0');
    set('val-remaining', '0');
    set('val-done', '0%');
    set('val-velocity', '0');
    set('val-health', '—');
    set('val-health-sub', 'нет данных');
    set('val-forecast', '—');
    return;
  }

  const health = getSprintHealth(sprint);

  set('val-total',     getTotalPoints(sprint));
  set('val-remaining', getRemainingPoints(sprint));
  set('val-done',      getCompletionRate(sprint) + '%');
  set('val-velocity',  getVelocity(sprint));
  set('val-forecast',  getForecastDate(sprint));

  const healthEl = document.getElementById('val-health');
  if (healthEl) {
    healthEl.textContent = health.label;
    healthEl.className = `metric-value ${health.cssClass}`;
  }
  set('val-health-sub', sprint
    ? `${sprint.tasks.filter(t => t.status === 'done').length}/${sprint.tasks.length} задач`
    : 'нет данных'
  );
}

/**
 * Отрисовывает Task Board
 * @param {Object|null} sprint
 * @param {string} searchQuery
 * @param {Function} onEdit   - (taskId) => void
 * @param {Function} onDelete - (taskId) => void
 */
export function renderBoard(sprint, searchQuery, onEdit, onDelete) {
  const statuses = ['todo', 'inprogress', 'done'];

  statuses.forEach(status => {
    const container = document.getElementById(`tasks-${status}`);
    const counter   = document.getElementById(`count-${status}`);
    if (!container) return;

    const tasks = sprint ? getTasksByStatus(sprint, status) : [];

    if (tasks.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">○</div>
        <div>Нет задач</div>
      </div>`;
    } else {
      container.innerHTML = tasks.map(task => {
        const hidden = searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())
          ? 'hidden' : '';
        return `
          <div class="task-card ${hidden}" data-id="${task.id}">
            <div class="task-card-title">${escapeHtml(task.title)}</div>
            <div class="task-card-footer">
              <span class="task-points">${task.points} SP</span>
              <div class="task-actions">
                <button class="task-action-btn edit-task" data-id="${task.id}" title="Редактировать">✎</button>
                <button class="task-action-btn del delete-task" data-id="${task.id}" title="Удалить">✕</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onEdit(btn.dataset.id); });
      });
      container.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(btn.dataset.id); });
      });
    }

    const visible = tasks.filter(t =>
      !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
    if (counter) counter.textContent = visible;
  });
}

/**
 * Отрисовывает страницу аналитики
 * @param {Sprint[]} sprints
 * @param {Object|null} activeSprint
 */
export function renderAnalytics(sprints, activeSprint) {
  // Analytics details
  const detailsEl = document.getElementById('analytics-details');
  if (detailsEl && activeSprint) {
    const rows = [
      ['Название', escapeHtml(activeSprint.name)],
      ['Дата начала', formatDate(activeSprint.startDate)],
      ['Дата окончания', formatDate(activeSprint.endDate)],
      ['Всего задач', activeSprint.tasks.length],
      ['Всего SP', getTotalPoints(activeSprint)],
      ['Остаток SP', getRemainingPoints(activeSprint)],
      ['Выполнено', getCompletionRate(activeSprint) + '%'],
      ['Velocity', getVelocity(activeSprint) + ' SP/день'],
      ['Прогноз', getForecastDate(activeSprint)],
      ['Снапшоты', activeSprint.snapshots.length],
    ];

    detailsEl.innerHTML = rows.map(([label, value]) => `
      <div class="analytics-row">
        <span class="analytics-row-label">${label}</span>
        <span class="analytics-row-value">${value}</span>
      </div>
    `).join('');
  } else if (detailsEl) {
    detailsEl.innerHTML = `<div class="empty-state">Нет активного спринта</div>`;
  }

  // Sprint history
  const historyEl = document.getElementById('sprint-history');
  if (historyEl) {
    if (sprints.length === 0) {
      historyEl.innerHTML = `<div class="empty-state">Нет спринтов</div>`;
    } else {
      historyEl.innerHTML = sprints.map(s => `
        <div class="sprint-history-item">
          <span class="history-name">${escapeHtml(s.name)}</span>
          <span class="history-dates">${formatDate(s.startDate)} — ${formatDate(s.endDate)}</span>
          <span class="history-tasks">${s.tasks.length} задач · ${getTotalPoints(s)} SP</span>
        </div>
      `).join('');
    }
  }
}

/**
 * Обновляет badge с именем спринта в topbar
 * @param {Object|null} sprint
 */
export function renderSprintBadge(sprint) {
  const badge = document.getElementById('sprint-badge');
  if (!badge) return;
  if (sprint) {
    badge.textContent = sprint.name;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

// ── Helpers ──

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
