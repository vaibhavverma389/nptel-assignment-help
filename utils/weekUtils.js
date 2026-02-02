function getWeekInfo(inputWeek) {

  const currentWeek = 1; // ya dynamic logic

  const selectedWeek =
    inputWeek !== undefined &&
    inputWeek !== null &&
    inputWeek !== ""
      ? Number(inputWeek)
      : currentWeek;

  const lastDate = new Date("2026-02-04"); // example
  const isWeekOver = new Date() > lastDate;

  return {
    currentWeek,
    week: selectedWeek,
    lastDate,
    isWeekOver
  };
}

module.exports = { getWeekInfo };
