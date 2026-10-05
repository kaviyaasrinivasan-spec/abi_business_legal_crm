const xlsx = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkData() {
  try {
    const files = [
      'leads_data.xlsx or data.csv.xls', 
      'Developer leads_data.xlsx or data.csv.xls', 
      'Developer_3.xlsx or data.csv.xls'
    ];
    let totalExcelRows = 0;
    
    for (const f of files) {
      const filePath = path.join(__dirname, '..', f);
      const workbook = xlsx.readFile(filePath);
      console.log(`\n--- File: ${f} ---`);
      console.log(`Contains ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const isDev1 = f === 'Developer leads_data.xlsx or data.csv.xls';
        const isDev3 = f === 'Developer_3.xlsx or data.csv.xls';
        
        let data;
        if (isDev1) {
          data = xlsx.utils.sheet_to_json(sheet, { range: 1 });
        } else {
          data = xlsx.utils.sheet_to_json(sheet);
        }
        
        const validRows = data.filter(r => (r['Company Name'] || r['NAME'] || r['Name']) && (r['Company Name'] || r['NAME'] || r['Name']) !== 'Unknown Company');
        
        console.log(`Sheet "${sheetName}" has ${data.length} total rows, ${validRows.length} valid rows.`);
        totalExcelRows += validRows.length;
      }
    }
    
    console.log(`\nTOTAL VALID ROWS ACROSS ALL EXCEL FILES: ${totalExcelRows}`);
    
    const dbRes = await pool.query("SELECT COUNT(*) FROM companies WHERE stage_id = 2 AND status = 'Yet to Contact'");
    console.log(`TOTAL ROWS IN DATABASE (Lead Outreach -> Yet to Contact): ${dbRes.rows[0].count}`);
    
    // Check duplicates / conflict updates
    const allDbRes = await pool.query("SELECT COUNT(*) FROM companies");
    console.log(`TOTAL ROWS IN DATABASE OVERALL: ${allDbRes.rows[0].count}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkData();
