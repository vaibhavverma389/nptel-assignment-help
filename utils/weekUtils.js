const BASE_DEADLINE = new Date("2026-02-04"); // Week 1 & 2 last date
const MAX_WEEKS = 12;

function getWeekLastDate(week) {
  if (week <= 2) return new Date(BASE_DEADLINE);

  const d = new Date(BASE_DEADLINE);
  d.setDate(d.getDate() + (week - 2) * 7);
  return d;
}

function getWeekInfo(selectedWeek = null) {
  const now = new Date();

  let currentWeek = 1;

  // Week calculation purely based on deadline
  if (now > BASE_DEADLINE) {
    const diffDays = Math.floor(
      (now - BASE_DEADLINE) / (1000 * 60 * 60 * 24)
    );

    currentWeek = 2 + Math.floor(diffDays / 7);
  }

  if (currentWeek > MAX_WEEKS) currentWeek = MAX_WEEKS;

  const week = selectedWeek
    ? Math.min(Number(selectedWeek), currentWeek)
    : currentWeek;

  const lastDate = getWeekLastDate(week);
  const isWeekOver = now > lastDate;

  return {
    currentWeek,
    week,
    lastDate,
    isWeekOver
  };
}

module.exports = { getWeekInfo, getWeekLastDate };
