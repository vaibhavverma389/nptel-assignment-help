function getWeekInfo(startDate) {
  const now = new Date();
  const start = new Date(startDate);

  const diffDays = Math.floor(
    (now - start) / (1000 * 60 * 60 * 24)
  );

  let currentWeek = Math.floor(diffDays / 7) + 1;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 12) currentWeek = 12;

  let lastDate;

  // Week 1 & 2 → same date
  if (currentWeek <= 2) {
    lastDate = new Date("2026-02-04");
  } else {
    // Week 3 onwards → +7 days logic
    lastDate = new Date("2026-02-04");
    lastDate.setDate(lastDate.getDate() + (currentWeek - 2) * 7);
  }

  const isWeekOver = now > lastDate;

  return {
    currentWeek,
    lastDate,
    isWeekOver
  };
}

module.exports = getWeekInfo;
