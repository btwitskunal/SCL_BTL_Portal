const fileElem = document.getElementById('fileElem');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const deleteBtn = document.getElementById('delete-btn');
const messageBox = document.getElementById('messageBox');
const dropArea = document.getElementById('drop-area');
const spinner = document.getElementById('spinner');
const previewSection = document.getElementById('preview');
const previewTable = document.getElementById('previewTable');
const uploadForm = document.getElementById('uploadForm');

let previewHasErrors = false;
let metadata = {};

// Fetch metadata for validation
fetch('/metadata')
  .then(res => res.json())
  .then(data => metadata = data);

// 📂 File selected via browse
fileElem.addEventListener('change', () => {
  if (fileElem.files.length > 0) {
    const file = fileElem.files[0];
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    clearMessages();
    previewExcel(file);
  }
});

// 🗑️ Delete selected file
deleteBtn.addEventListener('click', () => {
  fileElem.value = '';
  fileInfo.classList.add('hidden');
  fileName.textContent = '';
  previewSection.classList.add('hidden');
  clearMessages();
});

// 🚀 Upload form submit
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();
  spinner.classList.remove('hidden');

  if (fileElem.files.length === 0) {
    showMessage('Please choose a file first.', 'error');
    spinner.classList.add('hidden');
    return;
  }

  if (previewHasErrors) {
    showMessage('❌ Cannot upload. Fix errors in preview first.', 'error');
    spinner.classList.add('hidden');
    return;
  }

  const formData = new FormData();
  formData.append('excelFile', fileElem.files[0]);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    spinner.classList.add('hidden');

    showMessage(result.message || (response.ok ? '✅ Upload successful' : '❌ Upload failed.'), response.ok ? 'success' : 'error');

    if (result.downloadUrl) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.textContent = '📥 Download Error Report';
      link.target = '_blank';
      link.classList.add('download-link');
      messageBox.appendChild(link);
    }

    fileElem.value = '';
    fileInfo.classList.add('hidden');
    fileName.textContent = '';
    previewSection.classList.add('hidden');

  } catch (err) {
    spinner.classList.add('hidden');
    showMessage('❌ Unexpected error during upload.', 'error');
    console.error(err);
  }
});

// 🎯 Drag & Drop UX
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  });
});

// 📥 Handle dropped file
dropArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0 && /\.(xlsx|xls)$/i.test(files[0].name)) {
    fileElem.files = files;
    fileName.textContent = files[0].name;
    fileInfo.classList.remove('hidden');
    clearMessages();
    previewExcel(files[0]);
  } else {
    showMessage('Only Excel files (.xlsx, .xls) are allowed.', 'error');
  }
});

// 👀 Preview top 6 rows of Excel file with validation
function previewExcel(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    previewTable.innerHTML = '';
    previewHasErrors = false;

    const headers = json[0] || [];
    const bodyRows = json.slice(1);

    const thead = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      thead.appendChild(th);
    });
    previewTable.appendChild(thead);

    bodyRows.forEach((row) => {
      const tr = document.createElement('tr');
      headers.forEach((key, colIndex) => {
        const td = document.createElement('td');
        const val = row[colIndex] ?? '';
        td.textContent = val;

        const rowObj = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
        if (key === 'Element') {
          if (!metadata[val]) {
            td.classList.add('invalid-cell');
            previewHasErrors = true;
          }
        } else if (key === 'Attribute') {
          const el = rowObj['Element'];
          if (metadata[el] && metadata[el].attributes.length && !metadata[el].attributes.includes(val)) {
            td.classList.add('invalid-cell');
            previewHasErrors = true;
          }
        } else if (key === 'UOM') {
          const el = rowObj['Element'];
          if (metadata[el] && metadata[el].uom && metadata[el].uom !== val) {
            td.classList.add('invalid-cell');
            previewHasErrors = true;
          }
        } else if (key === 'Channel') {
          if (!['Shree', 'Bangur', 'Rockstrong'].includes(val)) {
            td.classList.add('invalid-cell');
            previewHasErrors = true;
          }
        }

        tr.appendChild(td);
      });
      previewTable.appendChild(tr);
    });

    previewSection.classList.remove('hidden');
  };
  reader.readAsArrayBuffer(file);
}

// 💬 Show status message
function showMessage(msg, type) {
  messageBox.classList.remove('hidden', 'error', 'success');
  messageBox.classList.add(type);
  messageBox.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = msg;
  messageBox.appendChild(p);
}

// 🧹 Clear messages
function clearMessages() {
  messageBox.classList.add('hidden');
  messageBox.classList.remove('error', 'success');
  messageBox.innerHTML = '';
}