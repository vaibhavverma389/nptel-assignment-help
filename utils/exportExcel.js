const ExcelJS = require("exceljs");

async function exportExcel(res, sheetName, columns, rows, fileName) {

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  rows.forEach(r => worksheet.addRow(r));

  worksheet.getRow(1).font = { bold: true };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${fileName}`
  );

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = exportExcel;