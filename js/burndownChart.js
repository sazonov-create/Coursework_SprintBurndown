// burndownChart.js — Burndown Chart с tooltip задач

let burndownInstance = null;
let pieInstance = null;

/**
 * Строит Burndown Chart.
 * @param {{ labels, ideal, actual, tasksByDay }} data
 * @param {Object|null} sprint — для tooltip задач
 */
export function renderBurndownChart(data, sprint) {
  const canvas = document.getElementById('burndown-chart');
  if (!canvas) return;

  // Строим карту: dayIndex -> задачи завершённые в этот день
  // "завершена в день N" = задача со статусом done, у которой снапшот падает в этот день
  // Простейший подход: для каждого дня смотрим разницу actual[i-1] - actual[i] = SP сгорело
  const tasksByDay = buildTasksByDay(sprint, data);

  const chartData = {
    labels:   data.labels,
    datasets: [
      {
        label: 'Идеальный прогресс',
        data:  data.ideal,
        borderColor: 'rgba(139,144,160,0.4)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0,
      },
      {
        label: 'Фактический остаток',
        data:  data.actual,
        borderColor: '#f0c040',
        backgroundColor: 'rgba(240,192,64,0.07)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#f0c040',
        pointBorderColor: '#0d0e11',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  if (burndownInstance) {
    burndownInstance.data = chartData;
    burndownInstance.options.plugins.tooltip.callbacks.afterBody = makeAfterBody(tasksByDay);
    burndownInstance.update('active');
    return;
  }

  burndownInstance = new Chart(canvas, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#8b90a0', font: { family: 'Space Mono', size: 11 }, boxWidth: 20 },
        },
        tooltip: {
          backgroundColor: '#1a1d24',
          borderColor: '#2e323d',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a0',
          footerColor: '#40c878',
          titleFont: { family: 'Space Mono', size: 12 },
          bodyFont:  { family: 'Space Mono', size: 11 },
          footerFont: { family: 'Space Mono', size: 10 },
          padding: 12,
          callbacks: {
            label: ctx => {
              const val = ctx.parsed.y;
              if (val === null || val === undefined) return null;
              return ' ' + ctx.dataset.label + ': ' + val + ' SP';
            },
            afterBody: makeAfterBody(tasksByDay),
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(37,40,48,0.8)' },
          ticks: { color: '#555a6a', font: { family: 'Space Mono', size: 10 }, maxRotation: 45 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(37,40,48,0.8)' },
          ticks: { color: '#555a6a', font: { family: 'Space Mono', size: 11 } },
          title: { display: true, text: 'Остаток SP', color: '#555a6a', font: { family: 'Space Mono', size: 10 } },
        },
      },
    },
  });
}

/**
 * Строит карту dayIndex → [задачи завершённые в этот день]
 */
function buildTasksByDay(sprint, data) {
  const map = {};
  if (!sprint || !sprint.tasks) return map;

  const start = new Date(sprint.startDate);

  // Задачи со статусом done — определяем день по снапшотам
  // Логика: находим первый снапшот где remainingPoints снизился
  // Для каждого дня где actual[i] < actual[i-1], собираем done-задачи
  sprint.tasks.filter(t => t.status === 'done').forEach(task => {
    // Ищем в снапшотах когда именно эта задача была закрыта — нет точной даты,
    // поэтому размещаем done-задачи на последний известный день фактического прогресса
    const todayIdx = Math.round((new Date() - start) / 86400000);
    const dayIdx   = Math.min(todayIdx, data.labels.length - 1);
    if (!map[dayIdx]) map[dayIdx] = [];
    map[dayIdx].push(task);
  });

  // Если есть снапшоты — привязываем по ним точнее
  if (sprint.snapshots && sprint.snapshots.length > 0) {
    // Сбрасываем и делаем правильно: для каждого снапшота находим задачи
    Object.keys(map).forEach(k => delete map[k]);

    // Сортируем снапшоты
    const snaps = [...sprint.snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));

    snaps.forEach((snap, i) => {
      const snapIdx = Math.round((new Date(snap.date) - start) / 86400000);
      const prevSP  = i === 0 ? sprint.tasks.reduce((s, t) => s + t.points, 0) : snaps[i-1].remainingPoints;
      const burned  = prevSP - snap.remainingPoints;
      if (burned <= 0) return;

      // Задачи которые "сгорели" в этом периоде — те что done и накопленно <= burned
      const doneTasks = sprint.tasks.filter(t => t.status === 'done');
      if (!map[snapIdx]) map[snapIdx] = [];
      // Берём задачи чьи points объясняют сгорание
      let acc = 0;
      for (const t of doneTasks) {
        if (acc >= burned) break;
        if (!Object.values(map).flat().includes(t)) {
          map[snapIdx].push(t);
          acc += t.points;
        }
      }
    });

    // Оставшиеся done-задачи — на сегодня
    const allMapped  = Object.values(map).flat();
    const unmapped   = sprint.tasks.filter(t => t.status === 'done' && !allMapped.includes(t));
    if (unmapped.length > 0) {
      const todayIdx = Math.min(
        Math.round((new Date() - start) / 86400000),
        data.labels.length - 1
      );
      if (!map[todayIdx]) map[todayIdx] = [];
      map[todayIdx].push(...unmapped);
    }
  }

  return map;
}

/**
 * Фабрика afterBody-коллбэка для tooltip
 */
function makeAfterBody(tasksByDay) {
  return (tooltipItems) => {
    if (!tooltipItems.length) return [];
    const idx   = tooltipItems[0].dataIndex;
    const tasks = tasksByDay[idx];
    if (!tasks || tasks.length === 0) return [];

    const lines = ['', '✓ Завершено:'];
    tasks.forEach(t => {
      lines.push('  · ' + t.title.slice(0, 28) + (t.title.length > 28 ? '…' : '') + ' (' + t.points + ' SP)');
    });
    return lines;
  };
}

export function renderPieChart(todo, inprogress, done) {
  const canvas = document.getElementById('pie-chart');
  if (!canvas) return;

  if (pieInstance) {
    pieInstance.data.datasets[0].data = [todo, inprogress, done];
    pieInstance.update();
    return;
  }

  pieInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['To Do', 'In Progress', 'Done'],
      datasets: [{
        data: [todo, inprogress, done],
        backgroundColor: ['#252830', '#e07830', '#40c878'],
        borderColor: '#0d0e11',
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8b90a0', font: { family: 'Space Mono', size: 11 }, boxWidth: 14 } },
        tooltip: {
          backgroundColor: '#1a1d24', borderColor: '#2e323d', borderWidth: 1,
          titleColor: '#e8eaf0', bodyColor: '#8b90a0',
          callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + ' задач' },
        },
      },
    },
  });
}

export function destroyCharts() {
  if (burndownInstance) { burndownInstance.destroy(); burndownInstance = null; }
  if (pieInstance)      { pieInstance.destroy();      pieInstance = null; }
}
