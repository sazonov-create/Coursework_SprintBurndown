// compareView.js — Сравнение двух спринтов

import { getTotalPoints, getRemainingPoints, getCompletionRate, getVelocity, getBurndownData } from './analytics.js';

let compareChartInstance = null;

/**
 * Заполняет дропдауны выбора спринтов
 */
export function populateCompareSelects(sprints) {
  ['compare-sprint-a', 'compare-sprint-b'].forEach((id, idx) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = sprints.map(s =>
      '<option value="' + s.id + '">' + esc(s.name) + '</option>'
    ).join('');
    // По умолчанию A = первый, B = второй
    if (!current && sprints.length > idx) sel.value = sprints[idx].id;
    else if (current) sel.value = current;
  });

  const empty  = document.getElementById('compare-empty');
  const result = document.getElementById('compare-result');
  if (sprints.length < 2) {
    if (empty)  empty.style.display  = 'block';
    if (result) result.classList.add('hidden');
  }
}

/**
 * Запускает сравнение двух выбранных спринтов
 */
export function runComparison(sprints) {
  const idA = document.getElementById('compare-sprint-a')?.value;
  const idB = document.getElementById('compare-sprint-b')?.value;

  if (!idA || !idB) return;
  if (idA === idB) {
    alert('Выберите два разных спринта');
    return;
  }

  const sA = sprints.find(s => s.id === idA);
  const sB = sprints.find(s => s.id === idB);
  if (!sA || !sB) return;

  document.getElementById('compare-empty')?.style && (document.getElementById('compare-empty').style.display = 'none');
  document.getElementById('compare-result')?.classList.remove('hidden');

  renderMetricCards(sA, sB);
  renderCompareChart(sA, sB);
  renderTaskTables(sA, sB);
}

// ── Метрики-карточки ──
function renderMetricCards(sA, sB) {
  const el = document.getElementById('compare-metrics');
  if (!el) return;

  const metrics = [
    { label: 'Всего SP',     a: getTotalPoints(sA),                                          b: getTotalPoints(sB),                                          higher: true  },
    { label: 'Выполнено SP', a: getTotalPoints(sA) - getRemainingPoints(sA),                 b: getTotalPoints(sB) - getRemainingPoints(sB),                 higher: true  },
    { label: 'Остаток SP',   a: getRemainingPoints(sA),                                      b: getRemainingPoints(sB),                                      higher: false },
    { label: 'Completion',   a: getCompletionRate(sA) + '%',                                 b: getCompletionRate(sB) + '%',                                 higher: true  },
    { label: 'Velocity',     a: getVelocity(sA) + ' SP/д',                                  b: getVelocity(sB) + ' SP/д',                                  higher: true  },
    { label: 'Задач',        a: sA.tasks.length,                                             b: sB.tasks.length,                                             higher: true  },
    { label: 'Done',         a: sA.tasks.filter(t => t.status === 'done').length,            b: sB.tasks.filter(t => t.status === 'done').length,            higher: true  },
    { label: 'Длительность', a: daysBetween(sA.startDate, sA.endDate) + ' дн.',             b: daysBetween(sB.startDate, sB.endDate) + ' дн.',             higher: false },
  ];

  el.innerHTML = metrics.map(m => {
    const numA = parseFloat(m.a), numB = parseFloat(m.b);
    const aWins = !isNaN(numA) && !isNaN(numB) && (m.higher ? numA > numB : numA < numB);
    const bWins = !isNaN(numA) && !isNaN(numB) && (m.higher ? numB > numA : numB < numA);
    return '<div class="cmp-card">' +
      '<div class="cmp-card-label">' + m.label + '</div>' +
      '<div class="cmp-card-row">' +
        '<span class="cmp-val' + (aWins ? ' cmp-win' : bWins ? ' cmp-lose' : '') + '">' + m.a + '</span>' +
        '<span class="cmp-vs">vs</span>' +
        '<span class="cmp-val' + (bWins ? ' cmp-win' : aWins ? ' cmp-lose' : '') + '">' + m.b + '</span>' +
      '</div>' +
      '<div class="cmp-card-names"><span>' + esc(sA.name) + '</span><span>' + esc(sB.name) + '</span></div>' +
    '</div>';
  }).join('');
}

// ── Burndown двух спринтов на одном графике ──
function renderCompareChart(sA, sB) {
  const canvas = document.getElementById('compare-chart');
  if (!canvas) return;

  const dA = getBurndownData(sA);
  const dB = getBurndownData(sB);

  // Выравниваем по дням (используем индекс дня, не дату)
  const maxLen = Math.max(dA.labels.length, dB.labels.length);
  const labels = Array.from({ length: maxLen }, (_, i) => 'День ' + (i + 1));

  if (compareChartInstance) { compareChartInstance.destroy(); compareChartInstance = null; }

  compareChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: sA.name + ' (факт)',
          data: dA.actual.slice(0, maxLen),
          borderColor: '#f0c040', backgroundColor: 'rgba(240,192,64,0.08)',
          borderWidth: 2.5, pointRadius: 3, fill: false, tension: 0.3, spanGaps: true,
        },
        {
          label: sB.name + ' (факт)',
          data: dB.actual.slice(0, maxLen),
          borderColor: '#5090f0', backgroundColor: 'rgba(80,144,240,0.08)',
          borderWidth: 2.5, pointRadius: 3, fill: false, tension: 0.3, spanGaps: true,
        },
        {
          label: sA.name + ' (идеал)',
          data: dA.ideal.slice(0, maxLen),
          borderColor: 'rgba(240,192,64,0.3)', borderDash: [5, 4],
          borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0,
        },
        {
          label: sB.name + ' (идеал)',
          data: dB.ideal.slice(0, maxLen),
          borderColor: 'rgba(80,144,240,0.3)', borderDash: [5, 4],
          borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8b90a0', font: { family: 'Space Mono', size: 10 }, boxWidth: 16 } },
        tooltip: {
          backgroundColor: '#1a1d24', borderColor: '#2e323d', borderWidth: 1,
          titleColor: '#e8eaf0', bodyColor: '#8b90a0',
          titleFont: { family: 'Space Mono', size: 11 },
          bodyFont:  { family: 'Space Mono', size: 11 },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(37,40,48,0.8)' }, ticks: { color: '#555a6a', font: { family: 'Space Mono', size: 10 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(37,40,48,0.8)' }, ticks: { color: '#555a6a', font: { family: 'Space Mono', size: 11 } } },
      },
    },
  });
}

// ── Таблицы задач ──
function renderTaskTables(sA, sB) {
  renderTaskTable('compare-table-a', 'compare-table-a-title', sA);
  renderTaskTable('compare-table-b', 'compare-table-b-title', sB);
}

function renderTaskTable(elId, titleId, sprint) {
  const title = document.getElementById(titleId);
  const el    = document.getElementById(elId);
  if (title) title.textContent = sprint.name + ' — задачи';
  if (!el) return;

  if (sprint.tasks.length === 0) {
    el.innerHTML = '<div class="empty-state">Нет задач</div>';
    return;
  }

  const statusIcon = { todo: '○', inprogress: '◑', done: '●' };
  const statusColor = { todo: 'var(--text3)', inprogress: 'var(--accent2)', done: 'var(--green)' };

  el.innerHTML = '<table class="compare-table">' +
    '<thead><tr><th>Задача</th><th>SP</th><th>Статус</th></tr></thead>' +
    '<tbody>' +
    sprint.tasks.map(t =>
      '<tr>' +
      '<td class="compare-label">' + esc(t.title) + '</td>' +
      '<td class="compare-val">' + t.points + '</td>' +
      '<td class="compare-val" style="color:' + (statusColor[t.status] || 'inherit') + '">' +
        (statusIcon[t.status] || '?') + ' ' + statusLabel(t.status) +
      '</td>' +
      '</tr>'
    ).join('') +
    '</tbody></table>';
}

export function destroyCompareChart() {
  if (compareChartInstance) { compareChartInstance.destroy(); compareChartInstance = null; }
}

// ── helpers ──
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function statusLabel(s) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[s] || s;
}
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
