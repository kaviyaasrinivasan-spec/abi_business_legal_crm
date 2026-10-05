const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    host: process.env.DB_HOST, port: process.env.DB_PORT || 5432, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD
});
async function test() {
  try {
    const compFilter = '';
    const propFilter = '';
    const ndaFilter = '';
    console.log('Query 1');
    await pool.query(`
            SELECT 
                COUNT(*) as total_leads,
                COUNT(*) FILTER (WHERE stage_id = 1) as lead_discovery,
                COUNT(*) FILTER (WHERE stage_id = 2) as lead_outreach,
                COUNT(*) FILTER (WHERE stage_id = 3) as meetings,
                COUNT(*) FILTER (WHERE stage_id = 4) as qualified,
                COUNT(*) FILTER (WHERE stage_id = 5) as proposals,
                COUNT(*) FILTER (WHERE stage_id = 6) as won,
                COUNT(*) FILTER (WHERE stage_id = 7) as lost
            FROM companies
            ${compFilter}
        `);
    console.log('Query 2');
    await pool.query(`
                SELECT 
                    COALESCE(SUM(final_value), 0) as pipeline_val,
                    COALESCE(SUM(final_value * 0.7), 0) as expected_rev
                FROM proposals p
                ${propFilter}
            `);
    console.log('Query 3');
    await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE stage_id = 6)::float / NULLIF(COUNT(*), 0) * 100 as rate
                FROM companies
                ${compFilter}
            `);
    console.log('Query 4');
    await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Sent') as nda_pending,
                COUNT(*) FILTER (WHERE status = 'Signed') as nda_signed
            FROM ndas n
            ${ndaFilter}
        `);
    console.log('Query 5');
    await pool.query(`
            SELECT lead_source as source, COUNT(*) as count
            FROM companies
            ${compFilter}
            GROUP BY lead_source
        `);
    console.log('Query 6');
    await pool.query(`
            SELECT u.full_name as executive, COUNT(c.company_id) as total_leads, 
                   COUNT(c.company_id) FILTER (WHERE c.stage_id = 6) as won_leads
            FROM users u
            LEFT JOIN companies c ON u.user_id = c.assigned_executive_id
            WHERE u.role = 'BD Executive'
            GROUP BY u.full_name
        `);
    console.log('All success');
  } catch(e) {
    console.log('ERR:', e.message);
  } finally { pool.end(); }
}
test();
