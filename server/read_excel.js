
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'leads_data.xlsx or data.csv.xls');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log('Columns:', Object.keys(data[0] || {}));
console.log('First 2 rows:');
console.log(JSON.stringify(data.slice(0, 2), null, 2));

