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

function classifyNumbers(rawString) {
  if (!rawString) return { mobiles: [], landlines: [] };
  
  // Clean up extra info like " - pramila - 9940689494" -> we split by common delimiters
  const parts = String(rawString).split(/[,/&|\n]| and | - | \| /i).map(s => s.trim()).filter(Boolean);
  
  const mobiles = [];
  const landlines = [];
  
  parts.forEach(part => {
    const cleanNum = part.replace(/[^0-9+]/g, '');
    if (!cleanNum || cleanNum.length < 6) return; // ignore random short texts or names like "pramila"
    
    // Check if it's a mobile pattern
    const mobileRegex = /^(?:\+91|0)?[6789]\d{8,9}$/;
    
    if (mobileRegex.test(cleanNum)) {
      mobiles.push(part);
    } else {
      landlines.push(part);
    }
  });
  
  return { mobiles, landlines };
}

async function importData() {
  try {
    const filePath = path.join(__dirname, '..', 'Developer_3.xlsx or data.csv.xls');
    console.log('Reading file:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First row contains the headers
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`Found ${data.length} records. Starting import...`);
    
    let count = 0;
    for (const row of data) {
      const companyName = row['NAME'] || row['Name'] || 'Unknown Company';
      if (companyName === 'Unknown Company') continue;

      const contactPerson = row['CONTACT PERSON'] || '';
      const designation = row['TITLE'] || '';
      const address = row['ADDRESS'] || '';
      const area = row['Location'] || '';
      const rawNumber = row['PHONE '] || row['PHONE'] || '';
      const email = row['EMAIL'] || '';
      const website = row['Website'] || '';
      const industry = 'Developer'; // Hardcoded based on file theme
      
      const { mobiles, landlines } = classifyNumbers(rawNumber);
      
      const mobileStr = mobiles.join(', ').substring(0, 50);
      const landlineStr = landlines.join(', ').substring(0, 20);
      
      // Fixed default values requested by user
      const stageId = 2; // Lead Outreach
      const status = 'Yet to Contact';
      
      await pool.query(
        `INSERT INTO companies 
          (company_name, contact_person, contact_designation, address, area, contact_no, contact_landline, contact_email, website, industry, stage_id, status, created_at)
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT (company_name) DO UPDATE SET
          contact_person = EXCLUDED.contact_person,
          contact_designation = EXCLUDED.contact_designation,
          address = EXCLUDED.address,
          area = EXCLUDED.area,
          contact_no = EXCLUDED.contact_no,
          contact_landline = EXCLUDED.contact_landline,
          contact_email = EXCLUDED.contact_email,
          website = EXCLUDED.website,
          industry = EXCLUDED.industry,
          stage_id = EXCLUDED.stage_id,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [companyName, contactPerson, designation, address, area, mobileStr, landlineStr, email, website, industry, stageId, status]
      );
      count++;
    }
    
    console.log(`Successfully imported/updated ${count} records from Developer_3!`);
  } catch (err) {
    console.error('Error importing data:', err);
  } finally {
    await pool.end();
  }
}

importData();
