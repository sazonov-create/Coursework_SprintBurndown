// analytics.js — Метрики и аналитика

export function getTotalPoints(sprint) {
  if (!sprint) return 0;
  return sprint.tasks.reduce((sum, t) => sum + (t.points || 0), 0);
}

export function getRemainingPoints(sprint) {
  if (!sprint) return 0;
  return sprint.tasks.filter(t => t.status !== 'done').reduce((sum, t) => sum + (t.points || 0), 0);
}

export function getCompletionRate(sprint) {
  const total = getTotalPoints(sprint);
  if (total === 0) return 0;
  const done = sprint.tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.points || 0), 0);
  return Math.round((done / total) * 100);
}

export function getVelocity(sprint) {
  if (!sprint) return 0;
  const done = getTotalPoints(sprint) - getRemainingPoints(sprint);
  if (done === 0) return 0;
  const now     = new Date();
  const end     = new Date(sprint.endDate);
  // Если спринт завершён — считаем по endDate, иначе по сегодня
  const cutoff  = now > end ? end : now;
  const days    = Math.max(1, Math.ceil((cutoff - new Date(sprint.startDate)) / 86400000));
  return Math.round((done / days) * 10) / 10;
}

export function isSprintFinished(sprint) {
  if (!sprint) return false;
  return new Date() > new Date(sprint.endDate);
}

export function getForecastDate(sprint) {
  if (!sprint) return '—';
  const remaining = getRemainingPoints(sprint);
  if (remaining === 0) return 'Готово!';
  // Спринт завершён, но есть остаток — не успели
  if (isSprintFinished(sprint)) return 'Не завершён';
  const velocity = getVelocity(sprint);
  if (velocity === 0) return '—';
  const forecast = new Date();
  forecast.setDate(forecast.getDate() + Math.ceil(remaining / velocity));
  return forecast.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function getSprintHealth(sprint) {
  if (!sprint || sprint.tasks.length === 0) return { label: '—', cssClass: '' };
  const completion = getCompletionRate(sprint);

  // Завершённый спринт — оцениваем итоговый результат
  if (isSprintFinished(sprint)) {
    if (completion === 100) return { label: 'Выполнен', cssClass: 'health-good' };
    if (completion >= 80)   return { label: 'Почти',    cssClass: 'health-warn' };
    return                         { label: 'Провален', cssClass: 'health-bad'  };
  }

  // Идущий спринт — сравниваем прогресс работы и прогресс времени
  const totalDur     = Math.max(1, new Date(sprint.endDate) - new Date(sprint.startDate));
  const elapsed      = Math.max(0, new Date() - new Date(sprint.startDate));
  const timeProgress = Math.min(1, elapsed / totalDur) * 100;
  const gap          = completion - timeProgress;
  if (gap >= -5)  return { label: 'Отлично', cssClass: 'health-good' };
  if (gap >= -20) return { label: 'Риск',    cssClass: 'health-warn' };
  return              { label: 'Опасно',    cssClass: 'health-bad'  };
}

/**
 * Burndown Chart — ось Y: оставшиеся SP (должна идти вниз к 0)
 * ideal:  прямая от totalPoints в день 0 до 0 в последний день
 * actual: реальные снапшоты + текущее значение сегодня
 */
export function getBurndownData(sprint) {
  if (!sprint) return { labels: [], ideal: [], actual: [] };

  const start       = new Date(sprint.startDate);
  const end         = new Date(sprint.endDate);
  const totalPoints = getTotalPoints(sprint);
  const totalDays   = Math.max(1, Math.round((end - start) / 86400000));

  // Генерируем ось X: каждый день спринта
  const labels = [];
  const ideal  = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    // Идеальная линия: линейный спад от totalPoints до 0
    ideal.push(Math.round(totalPoints * (1 - i / totalDays)));
  }

  // Actual: массив null, заполняем из снапшотов
  const actual = new Array(labels.length).fill(null);

  // День 0 = начало спринта = все SP
  actual[0] = totalPoints;

  // Снапшоты
  if (sprint.snapshots && sprint.snapshots.length > 0) {
    sprint.snapshots.forEach(snap => {
      const snapDate = new Date(snap.date);
      const idx = Math.round((snapDate - start) / 86400000);
      if (idx >= 0 && idx < actual.length) {
        actual[idx] = snap.remainingPoints;
      }
    });
  }

  // Сегодня: текущий остаток
  const todayIdx = Math.round((new Date() - start) / 86400000);
  if (todayIdx >= 0 && todayIdx < actual.length) {
    actual[todayIdx] = getRemainingPoints(sprint);
  }

  return { labels, ideal, actual };
}
