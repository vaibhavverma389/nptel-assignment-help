// utils/weekDate.js
function getWeekLastDate(week) {
  const baseDate = new Date("2026-02-04"); // Week 1 & 2
  if (week <= 2) return baseDate;

  const extraWeeks = week - 2;
  const result = new Date(baseDate);
  result.setDate(baseDate.getDate() + extraWeeks * 7);
  return result;
}

module.exports = getWeekLastDate;
