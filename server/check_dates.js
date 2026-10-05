const { Pool } = require('pg'); 
require('dotenv').config();

const pool = new Pool({ 
    user: process.env.DB_USER || 'postgres', 
    password: process.env.DB_PASSWORD, 
    host: process.env.DB_HOST || 'localhost', 
    port: process.env.DB_PORT || 5432, 
    database: process.env.DB_NAME || 'abi_business_legal_crm' 
}); 

async function run() {
    try {
        const res = await pool.query("SELECT status, updated_at FROM companies WHERE stage_id = 2 AND status != 'Yet to Contact'");
        console.log("OUTREACH TIMESTAMPS:");
        for(let r of res.rows) {
            console.log(r.status, r.updated_at);
        }
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
