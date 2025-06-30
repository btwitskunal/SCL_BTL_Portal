const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const XlsxPopulate = require("xlsx-populate");

function generateTemplate() {
  const mappings = require("./mappings.json");

  const headers = [
    "District",
    "State",
    "Zone",
    "Dealer Name",
    "Dealer SAP Code",
    "Channel",
    "Element",
    "UOM",
    "Attribute",
    "Date of Execution"
  ];

  const wb = XLSX.utils.book_new();
  const ws_data = [headers];

  const firstElement = Object.keys(mappings)[0];
  const sampleAttr = mappings[firstElement].attributes[0];
  const sampleUOM = mappings[firstElement].uom;

  ws_data.push([
    "Ajmer",
    "Rajasthan",
    "North",
    "Demo Dealer",
    "SAP12345",
    "Shree",
    firstElement,
    sampleUOM,
    sampleAttr,
    "2024-01-01"
  ]);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const tempPath = path.join(__dirname, "..", "public", "template.xlsx");
  XLSX.writeFile(wb, tempPath);

  // Add validation using xlsx-populate
  XlsxPopulate.fromFileAsync(tempPath)
    .then(workbook => {
      const sheet = workbook.sheet("Template");

      sheet.range("F2:F1000").dataValidation({
        type: "list",
        allowBlank: true,
        formula1: '"Shree,Bangur,Rockstrong"',
        showInputMessage: true,
        promptTitle: "Valid Channels",
        prompt: "Choose from Shree, Bangur, Rockstrong"
      });

      return workbook.toFileAsync(tempPath);
    })
    .catch(err => {
      console.error("Error applying dropdown to template:", err);
    });
}

module.exports = generateTemplate;