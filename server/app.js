const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const mysql = require('mysql2');
const generateTemplate = require('./generateMappings.js');

const app = express();
const upload = multer({ dest: 'uploads/' });

// MySQL connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root@123',
  database: 'portal'
});

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Generate template on startup
generateTemplate();

//  Download latest Excel template
app.get('/template', (req, res) => {
  generateTemplate();
  res.download(path.join(__dirname, '../public/template.xlsx'));
});

// 📊 Metadata for client-side validation
app.get('/metadata', (req, res) => {
  const mappings = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/mappings.json'), 'utf-8'));
  res.json(mappings);
});

// 📁 Admin API to fetch uploaded records
app.get('/admin/uploads', (req, res) => {
  db.query('SELECT * FROM uploads ORDER BY uploaded_at DESC', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.', error: err });
    res.json(results);
  });
});

// 📤 Upload Excel file
app.post('/upload', upload.single('excelFile'), (req, res) => {
  try {
    const filePath = req.file.path;

    // Read uploaded Excel file
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Save uploaded file as template and regenerate mappings
    fs.writeFileSync(path.join(__dirname, '../public/template.xlsx'), XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
    require('./generateMappings.js')(); // Regenerate mappings.json

    // Reload latest mappings
    const mappings = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/mappings.json'), 'utf-8'));

    const validRows = [];
    const errorRows = [];

    data.forEach((row, i) => {
      const rowNum = i + 2;
      const {
        District, State, Zone, 'Dealer Name': DealerName, 'Dealer SAP Code': DealerSAP,
        Channel, Element, UOM, Attribute, 'Date of Execution': DateExec
      } = row;

      const valid = mappings[Element];
      let errorMsg = "";

      if (!["Shree", "Bangur", "Rockstrong"].includes(Channel)) {
        errorMsg += `Invalid Channel '${Channel}'. `;
      }

      if (!valid) {
        errorMsg += `Invalid Element '${Element}'. `;
      } else {
        if (Array.isArray(valid.attributes) && valid.attributes.length > 0) {
          if (!valid.attributes.includes(Attribute)) {
            errorMsg += `Invalid Attribute '${Attribute}' for '${Element}'. `;
          }
        }
        if (valid.uom && valid.uom.trim() !== "") {
          if (UOM !== valid.uom) {
            errorMsg += `UOM must be '${valid.uom}' for '${Element}'. `;
          }
        }
      }

      if (errorMsg) {
        row.Error = errorMsg.trim();
        errorRows.push(row);
      } else {
        validRows.push([
          District, State, Zone, DealerName, DealerSAP,
          Channel, Element, UOM, Attribute, new Date(DateExec)
        ]);
      }
    });

    fs.unlinkSync(filePath);

    // Generate error report if needed
    if (errorRows.length > 0) {
      const errorWb = XLSX.utils.book_new();
      const errorSheet = XLSX.utils.json_to_sheet(errorRows);
      XLSX.utils.book_append_sheet(errorWb, errorSheet, 'Errors');

      const errorPath = path.join(__dirname, '../public/error-report.xlsx');
      XLSX.writeFile(errorWb, errorPath);

      return res.status(400).json({
        message: 'Validation failed. Download the error report to fix issues.',
        downloadUrl: '/error-report.xlsx'
      });
    }

    // Insert valid rows into MySQL
    if (validRows.length > 0) {
      const insertQuery = `
        INSERT INTO uploads (
          District, State, Zone, \`Dealer Name\`, \`Dealer SAP Code\`,
          Channel, Element, UOM, Attribute, \`Date of Execution\`
        ) VALUES ?`;

      db.query(insertQuery, [validRows], (err) => {
        if (err) return res.status(500).json({ message: 'DB insertion error.', error: err });
        return res.json({ message: '✅ Upload successful. Data inserted.' });
      });
    } else {
      res.status(400).json({ message: 'No valid rows to insert.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
