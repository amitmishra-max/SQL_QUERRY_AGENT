function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("SQL Agent")
    .addItem("Open Sidebar", "openSidebar")
    .addItem("Open Full View", "openWideUI")
    .addToUi();
}

function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("index")
    .setTitle("SQL Agent")
  SpreadsheetApp.getUi().showSidebar(html);
}

function openWideUI() {
  const html = HtmlService.createHtmlOutputFromFile("index")
    .setWidth(1200)
    .setHeight(800);

  SpreadsheetApp.getUi().showModelessDialog(html, "SQL Agent");
}
function exportTableToSheet(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const values = data.map(row => headers.map(h => row[h] ?? ""));

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}