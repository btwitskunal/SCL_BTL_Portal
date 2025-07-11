/*const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Correct relative path from current script location
const templatePath = path.resolve(__dirname, '../public/template.xlsx');
const outputPath = path.resolve(__dirname, '../config/mappings.json');

// Read Excel file
try {
  const workbook = XLSX.readFile(templatePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Extract column headers
  const columns = Object.keys(jsonData[0] || {});
  const mappings = {};
  columns.forEach(col => {
    mappings[col] = { required: true };
  });

  // Ensure config directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Write mappings.json
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
  console.log(`✅ mappings.json created at ${outputPath}`);
} catch (err) {
  console.error('❌ Error reading Excel file or writing JSON:', err.message);
}*/


function generateMappings() {
  const fs = require('fs');
  const path = require('path');
  const XLSX = require('xlsx');

  // Define paths
  const templatePath = path.resolve(__dirname, '../public/template.xlsx');
  const outputPath = path.resolve(__dirname, '../config/mappings.json');

  try {
    const workbook = XLSX.readFile(templatePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!jsonData.length) throw new Error('Template is empty or invalid.');

    const mappings = {};

    jsonData.forEach(row => {
      const element = row['Element']?.trim();
      const uom = row['UOM']?.trim();
      const attribute = row['Attribute']?.trim();

      if (!element) return;

      if (!mappings[element]) {
        mappings[element] = {
          uom: uom || null,
          attributes: new Set()
        };
      }

      if (uom && !mappings[element].uom) {
        mappings[element].uom = uom;
      }

      if (attribute) {
        mappings[element].attributes.add(attribute);
      }
    });

    // Convert attribute sets to arrays
    Object.keys(mappings).forEach(key => {
      mappings[key].attributes = Array.from(mappings[key].attributes);
    });

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write mappings.json
    fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
    console.log(`✅ mappings.json created at ${outputPath}`);
  } catch (err) {
    console.error('❌ Error processing template:', err.message);
  }

}
module.exports = generateMappings;
