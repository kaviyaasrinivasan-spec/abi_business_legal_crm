const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

require('dotenv').config();

const app = express();
const port = process.env.PORT || 1821;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set in .env');

// Middleware
app.use(cors({ origin: '*', allowedHeaders: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DB Pool Connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'abi_business_legal_crm',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// Check role permissions middleware
const requireRoles = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied for this role' });
        }
        next();
    };
};

// Helper: Strip financial info for Telecallers
const redactFinancials = (role, data) => {
    if (role !== 'Telecaller') return data;

    const stripCompany = (company) => {
        if (!company) return company;
        const cleaned = { ...company };
        delete cleaned.annual_turnover;
        return cleaned;
    };

    if (Array.isArray(data)) {
        return data.map(item => {
            const temp = stripCompany(item);
            delete temp.estimated_value;
            delete temp.discount;
            delete temp.final_value;
            delete temp.pipeline_value;
            delete temp.expected_revenue;
            delete temp.win_rate;
            delete temp.turnover;
            return temp;
        });
    } else if (typeof data === 'object' && data !== null) {
        const temp = stripCompany(data);
        delete temp.estimated_value;
        delete temp.discount;
        delete temp.final_value;
        delete temp.pipeline_value;
        delete temp.expected_revenue;
        delete temp.win_rate;
        delete temp.turnover;
        return temp;
    }
    return data;
};

// Log action to Audit Log
const logAudit = async (userId, action, oldValue = null, newValue = null, req = null) => {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
        const browser = req ? req.headers['user-agent'] : 'System';
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, old_value, new_value, ip_address, browser)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId || null, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ip, browser]
        );
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

// Helper: Write timeline activity
const logTimeline = async (companyId, userId, actionType, description) => {
    try {
        await pool.query(
            `INSERT INTO timelines (company_id, action_by, action_type, description)
             VALUES ($1, $2, $3, $4)`,
            [companyId, userId, actionType, description]
        );
    } catch (err) {
        console.error('Timeline logging failed:', err.message);
    }
};

// Database Schema Migrations and Seeds
const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log('Running schema migrations on abi_business_legal_crm...');
        await client.query('BEGIN');

        // 1. Users
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 2. Master Tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS industry_master (
                industry_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS source_master (
                source_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS category_master (
                category_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS service_master (
                service_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS stage_master (
                stage_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS meeting_type_master (
                type_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS template_master (
                template_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                type VARCHAR(50) NOT NULL,
                content TEXT
            );
            CREATE TABLE IF NOT EXISTS location_master (
                location_id SERIAL PRIMARY KEY,
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100),
                UNIQUE(city, state, country)
            );
        `);

        // 3. Companies (Leads)
        await client.query(`
            CREATE TABLE IF NOT EXISTS companies (
                company_id SERIAL PRIMARY KEY,
                company_name VARCHAR(255) UNIQUE NOT NULL,
                legal_name VARCHAR(255),
                gst_number VARCHAR(15),
                pan VARCHAR(10),
                website VARCHAR(255),
                linkedin VARCHAR(255),
                industry VARCHAR(100),
                business_category VARCHAR(100),
                business_size VARCHAR(100),
                employee_count INT,
                annual_turnover NUMERIC(15, 2),
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100),
                address TEXT,
                pin_code VARCHAR(10),
                notes TEXT,
                tags TEXT[],
                priority VARCHAR(50) DEFAULT 'Medium',
                lead_source VARCHAR(100),
                stage_id INT DEFAULT 1,
                status VARCHAR(100) DEFAULT 'New Lead',
                assigned_executive_id INT REFERENCES users(user_id) ON DELETE SET NULL,
                created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Add new columns to companies if they don't exist
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_designation VARCHAR(100)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_no VARCHAR(20)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_landline VARCHAR(20)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS area VARCHAR(150)`);
        await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMP DEFAULT NOW()`);


        // 4. Contact Persons
        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                contact_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                designation VARCHAR(100),
                department VARCHAR(100),
                email VARCHAR(255),
                mobile VARCHAR(20),
                whatsapp VARCHAR(20),
                linkedin VARCHAR(255),
                is_decision_maker BOOLEAN DEFAULT false,
                is_influencer BOOLEAN DEFAULT false,
                is_finance BOOLEAN DEFAULT false,
                is_legal BOOLEAN DEFAULT false,
                is_primary BOOLEAN DEFAULT false,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 5. Meetings
        await client.query(`
            CREATE TABLE IF NOT EXISTS meetings (
                meeting_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                meeting_date DATE NOT NULL,
                meeting_time TIME NOT NULL,
                duration INT,
                participants TEXT[],
                meeting_type VARCHAR(50),
                platform VARCHAR(50),
                platform_link VARCHAR(255),
                agenda TEXT,
                notes TEXT,
                action_items TEXT,
                next_meeting_date TIMESTAMP,
                attachments TEXT[],
                created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 6. Tasks
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                task_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date DATE,
                priority VARCHAR(50) DEFAULT 'Medium',
                status VARCHAR(50) DEFAULT 'Pending',
                progress INT DEFAULT 0,
                owner_id INT REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 7. Subtasks
        await client.query(`
            CREATE TABLE IF NOT EXISTS subtasks (
                subtask_id SERIAL PRIMARY KEY,
                task_id INT REFERENCES tasks(task_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending'
            )
        `);

        // 8. Follow-ups
        await client.query(`
            CREATE TABLE IF NOT EXISTS follow_ups (
                follow_up_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                follow_up_date DATE NOT NULL,
                follow_up_time TIME,
                priority VARCHAR(50) DEFAULT 'Medium',
                comments TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 9. Proposals
        await client.query(`
            CREATE TABLE IF NOT EXISTS proposals (
                proposal_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                proposal_number VARCHAR(100) UNIQUE NOT NULL,
                proposal_date DATE NOT NULL,
                service_category VARCHAR(100),
                estimated_value NUMERIC(15, 2),
                discount NUMERIC(15, 2) DEFAULT 0,
                final_value NUMERIC(15, 2) NOT NULL,
                expected_closing_date DATE,
                status VARCHAR(50) DEFAULT 'Draft',
                pdf_link VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 10. NDAs
        await client.query(`
            CREATE TABLE IF NOT EXISTS ndas (
                nda_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                nda_version VARCHAR(50) DEFAULT '1.0',
                sent_date DATE,
                reminder_date DATE,
                signed_date DATE,
                expiry_date DATE,
                status VARCHAR(50) DEFAULT 'Draft',
                pdf_link VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 11. Documents
        await client.query(`
            CREATE TABLE IF NOT EXISTS documents (
                document_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100),
                file_url TEXT NOT NULL,
                uploaded_by INT REFERENCES users(user_id) ON DELETE SET NULL,
                version VARCHAR(50) DEFAULT '1.0',
                history JSONB[],
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 12. Timelines (activities log for leads)
        await client.query(`
            CREATE TABLE IF NOT EXISTS timelines (
                timeline_id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
                action_by INT REFERENCES users(user_id) ON DELETE SET NULL,
                action_type VARCHAR(100),
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 13. Audit Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
                action VARCHAR(255) NOT NULL,
                old_value JSONB,
                new_value JSONB,
                ip_address VARCHAR(50),
                browser VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 14. Settings
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                company_profile JSONB,
                email_settings JSONB,
                whatsapp_settings JSONB,
                sms_settings JSONB,
                notification_rules JSONB,
                working_hours JSONB,
                holiday_calendar JSONB[],
                password_policy JSONB,
                two_factor_auth BOOLEAN DEFAULT false,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Commit migrations
        await client.query('COMMIT');
        console.log('Database tables migrated successfully');

        // Seeds
        const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(checkUsers.rows[0].count, 10) === 0) {
            console.log('Seeding default users...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123', salt);

            await pool.query(`
                INSERT INTO users (full_name, email, password, role, status) VALUES
                ('ABI CEO', 'ceo@abibusinesslegal.com', $1, 'CEO', 'Active'),
                ('Sales Manager', 'manager@abibusinesslegal.com', $1, 'BD Manager', 'Active'),
                ('Sales Executive', 'executive@abibusinesslegal.com', $1, 'BD Executive', 'Active'),
                ('Telecaller Agent', 'telecaller@abibusinesslegal.com', $1, 'Telecaller', 'Active'),
                ('ABI Administrator', 'admin@abibusinesslegal.com', $1, 'Admin', 'Active')
            `, [hashedPassword]);
        }

        // Seed Masters
        const checkInd = await pool.query('SELECT COUNT(*) FROM industry_master');
        if (parseInt(checkInd.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO industry_master (name) VALUES 
                ('Logistics'), ('Manufacturing'), ('Retail'), ('IT & Software'), 
                ('Real Estate'), ('Healthcare'), ('Banking & Finance'), ('E-commerce'), 
                ('Hospitality'), ('Automotive')`);
        }

        const checkSrc = await pool.query('SELECT COUNT(*) FROM source_master');
        if (parseInt(checkSrc.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO source_master (name) VALUES 
                ('Google Ads'), ('Cold Call'), ('LinkedIn outreach'), ('Website form'), 
                ('Reference'), ('Event'), ('WhatsApp campaign')`);
        }

        const checkCat = await pool.query('SELECT COUNT(*) FROM category_master');
        if (parseInt(checkCat.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO category_master (name) VALUES 
                ('Corporate Legal Advisory'), ('Contract Drafting'), ('NDA Negotiation'), 
                ('Dispute Resolution'), ('GST Filing'), ('Trademark Registration'), 
                ('Company Incorporation')`);
        }

        const checkServ = await pool.query('SELECT COUNT(*) FROM service_master');
        if (parseInt(checkServ.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO service_master (name) VALUES 
                ('Annual Retainer'), ('Transactional Advisory'), ('Litigation Support'), 
                ('Corporate Secretarial Audit'), ('M&A Diligence')`);
        }

        const checkStages = await pool.query('SELECT COUNT(*) FROM stage_master');
        if (parseInt(checkStages.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO stage_master (name) VALUES 
                ('Lead Discovery'), ('Lead Outreach'), ('Meetings'), 
                ('Qualification'), ('Proposal'), ('Won'), ('Closed Lost')`);
        }

        const checkMeetType = await pool.query('SELECT COUNT(*) FROM meeting_type_master');
        if (parseInt(checkMeetType.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO meeting_type_master (name) VALUES 
                ('Intro Meeting'), ('Demo'), ('Requirement Discussion'), 
                ('Second Meeting'), ('Management Meeting')`);
        }

        const checkTemplates = await pool.query('SELECT COUNT(*) FROM template_master');
        if (parseInt(checkTemplates.rows[0].count, 10) === 0) {
            await pool.query(`
                INSERT INTO template_master (name, type, content) VALUES 
                ('Standard Corporate Retainer', 'Proposal', 'Standard business legal package covering litigation, general counseling, and contract drafting services...'),
                ('Mutual NDA v1.0', 'NDA', 'This Non-Disclosure Agreement is made between ABI Business Legal and the Client for sharing business secrets...'),
                ('One-way Client NDA', 'NDA', 'One-way NDA protecting ABI Legal proprietary methodology for client onboarding...')
            `);
        }

        const checkLocations = await pool.query('SELECT COUNT(*) FROM location_master');
        if (parseInt(checkLocations.rows[0].count, 10) === 0) {
            await pool.query(`INSERT INTO location_master (city, state, country) VALUES 
                ('Chennai', 'Tamil Nadu', 'India'),
                ('Mumbai', 'Maharashtra', 'India'),
                ('Bangalore', 'Karnataka', 'India'),
                ('Delhi', 'Delhi', 'India'),
                ('New York', 'New York', 'USA')`);
        }

        // Seed settings
        const checkSettings = await pool.query('SELECT COUNT(*) FROM settings');
        if (parseInt(checkSettings.rows[0].count, 10) === 0) {
            await pool.query(`
                INSERT INTO settings (company_profile, email_settings, whatsapp_settings, sms_settings, notification_rules, working_hours, password_policy, two_factor_auth)
                VALUES (
                    '{"name": "ABI Business Legal", "address": "123 Business Legal Way", "website": "https://abibusinesslegal.com"}'::jsonb,
                    '{"host": "smtp.gmail.com", "port": 587, "user": "notify@abibusinesslegal.com"}'::jsonb,
                    '{"apiUrl": "https://api.whatsapp.com", "token": "mock-token"}'::jsonb,
                    '{"apiUrl": "https://api.sms.com", "token": "mock-token"}'::jsonb,
                    '{"reminderDays": 3, "notifyOnOnboard": true}'::jsonb,
                    '{"start": "09:00", "end": "18:00"}'::jsonb,
                    '{"minLength": 8, "requireUppercase": true}'::jsonb,
                    false
                )
            `);
        }

        console.log('Seeding completed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error running migrations/seeds:', err);
    } finally {
        client.release();
    }
};

// Test DB and initialize
pool.query('SELECT NOW()', async (err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err.message);
    } else {
        console.log('Database connected successfully');
        await initializeDatabase();
    }
});

// ================= AUTH ROUTES =================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = result.rows[0];
        if (user.status !== 'Active') {
            return res.status(403).json({ error: 'User account is inactive' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.user_id, fullName: user.full_name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        await logAudit(user.user_id, 'User Login', null, null, req);

        res.json({
            token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT user_id, full_name, email, role, status FROM users WHERE user_id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ================= COMPANIES MODULE =================
app.get('/api/companies', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT c.*, u.full_name as assigned_executive_name, 
                   COALESCE((SELECT json_agg(co) FROM contacts co WHERE co.company_id = c.company_id), '[]'::json) as contacts
            FROM companies c
            LEFT JOIN users u ON c.assigned_executive_id = u.user_id
        `;
        let params = [];

        // BD Executives only see assigned companies
        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY c.created_at DESC';
        const result = await pool.query(query, params);

        const redacted = redactFinancials(req.user.role, result.rows);
        res.json(redacted);
    } catch (err) {
        console.error('Fetch companies error:', err);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get sidebar counts
app.get('/api/companies/sidebar-counts', authenticateToken, async (req, res) => {
    try {
        const countsResult = await pool.query(`
            SELECT stage_id, status, COUNT(*) as count 
            FROM companies 
            GROUP BY stage_id, status
        `);
        res.json(countsResult.rows);
    } catch (err) {
        console.error('Error fetching sidebar counts:', err);
        res.status(500).json({ error: 'Failed to fetch sidebar counts' });
    }
});

app.get('/api/companies/:id', authenticateToken, async (req, res) => {
    try {
        const companyId = req.params.id;
        const result = await pool.query(
            `SELECT c.*, u.full_name as assigned_executive_name, cb.full_name as created_by_name
             FROM companies c
             LEFT JOIN users u ON c.assigned_executive_id = u.user_id
             LEFT JOIN users cb ON c.created_by = cb.user_id
             WHERE c.company_id = $1`,
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const company = result.rows[0];

        // Access check for BD Executives
        if (req.user.role === 'BD Executive' && company.assigned_executive_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this company lead' });
        }

        // Fetch contacts
        const contacts = await pool.query('SELECT * FROM contacts WHERE company_id = $1 ORDER BY is_primary DESC, name', [companyId]);
        // Fetch timeline
        const timeline = await pool.query(
            `SELECT t.*, u.full_name as action_by_name 
             FROM timelines t 
             LEFT JOIN users u ON t.action_by = u.user_id
             WHERE t.company_id = $1 ORDER BY t.created_at DESC`,
            [companyId]
        );
        // Fetch meetings
        const meetings = await pool.query('SELECT * FROM meetings WHERE company_id = $1 ORDER BY meeting_date DESC, meeting_time DESC', [companyId]);
        // Fetch tasks
        const tasks = await pool.query('SELECT * FROM tasks WHERE company_id = $1 ORDER BY due_date ASC', [companyId]);
        // Fetch proposals
        const proposals = await pool.query('SELECT * FROM proposals WHERE company_id = $1 ORDER BY proposal_date DESC', [companyId]);
        // Fetch ndas
        const ndas = await pool.query('SELECT * FROM ndas WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
        // Fetch documents
        const docs = await pool.query('SELECT * FROM documents WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);

        const fullCompany = {
            ...company,
            contacts: contacts.rows,
            timeline: timeline.rows,
            meetings: meetings.rows,
            tasks: tasks.rows,
            proposals: redactFinancials(req.user.role, proposals.rows),
            ndas: ndas.rows,
            documents: docs.rows
        };

        const redacted = redactFinancials(req.user.role, fullCompany);
        res.json(redacted);
    } catch (err) {
        console.error('Fetch company details error:', err);
        res.status(500).json({ error: 'Failed to fetch company details' });
    }
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

app.post('/api/companies/upload-excel', authenticateToken, requireRoles(['CEO', 'Admin']), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        // Debugging: Save the raw data to a file to see exact headers and rows
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, 'latest_upload.json'), JSON.stringify(data, null, 2));
        
        let count = 0;
        for (const rawRow of data) {
            // Normalize keys to lowercase and trim spaces for robust matching
            const row = {};
            for (const key in rawRow) {
                row[key.trim().toLowerCase()] = rawRow[key];
            }

            const companyName = row['name'] || row['company name'] || row['company'] || 'Unknown Company';
            if (companyName === 'Unknown Company') continue;

            const contactPerson = row['contact person'] || row['contact'] || '';
            const designation = row['title'] || row['designation'] || '';
            const address = row['address'] || '';
            const area = row['location'] || row['area'] || '';
            const city = row['city'] || '';
            const mobileNum = row['mobile contact no'] || row['mobile'] || row['phone'] || row['phone number'] || row['contact no'] || '';
            const landlineNum = row['landline contact no'] || row['landline'] || '';
            const email = row['email'] || row['email address'] || '';
            const website = row['website'] || row['web'] || '';
            const industry = 'Developer'; // Standard fallback
            
            // Join with a comma so classifyNumbers splits them properly
            const rawNumber = [mobileNum, landlineNum].filter(Boolean).join(', ');
            const { mobiles, landlines } = classifyNumbers(rawNumber);
            
            const mobileStr = mobiles.join(', ').substring(0, 50);
            const landlineStr = landlines.join(', ').substring(0, 20);
            
            const stageId = 2; // Lead Outreach
            const status = 'Yet to Contact';
            
            await pool.query(
                `INSERT INTO companies 
                  (company_name, contact_person, contact_designation, address, area, city, contact_no, contact_landline, contact_email, website, industry, stage_id, status, created_at, updated_at, stage_updated_at)
                 VALUES 
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())
                 ON CONFLICT (company_name) DO UPDATE SET
                  contact_person = EXCLUDED.contact_person,
                  contact_designation = EXCLUDED.contact_designation,
                  address = EXCLUDED.address,
                  area = EXCLUDED.area,
                  city = EXCLUDED.city,
                  contact_no = EXCLUDED.contact_no,
                  contact_landline = EXCLUDED.contact_landline,
                  contact_email = EXCLUDED.contact_email,
                  website = EXCLUDED.website,
                  industry = EXCLUDED.industry,
                  stage_updated_at = CASE WHEN companies.stage_id != EXCLUDED.stage_id OR companies.status != EXCLUDED.status THEN NOW() ELSE companies.stage_updated_at END,
                  stage_id = EXCLUDED.stage_id,
                  status = EXCLUDED.status,
                  updated_at = NOW()`,
                [companyName, contactPerson, designation, address, area, city, mobileStr, landlineStr, email, website, industry, stageId, status]
            );
            count++;
        }
        
        res.json({ message: `Successfully imported ${count} leads!`, count });
    } catch (err) {
        console.error('Error importing excel:', err);
        res.status(500).json({ error: 'Failed to process Excel file' });
    }
});

app.post('/api/companies', authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        // Strip financial info if Telecaller tries to post it
        if (req.user.role === 'Telecaller') {
            delete body.annual_turnover;
        }

        const {
            company_name, legal_name, gst_number, pan, website, linkedin, industry,
            business_category, business_size, employee_count, annual_turnover,
            city, state, country, address, pin_code, notes, tags, priority,
            lead_source, stage_id, status, assigned_executive_id,
            contact_person, contact_designation, contact_no, contact_email, contact_landline, area
        } = body;

        const result = await pool.query(
            `INSERT INTO companies (
                company_name, legal_name, gst_number, pan, website, linkedin, industry,
                business_category, business_size, employee_count, annual_turnover,
                city, state, country, address, pin_code, notes, tags, priority,
                lead_source, stage_id, status, assigned_executive_id, created_by,
                contact_person, contact_designation, contact_no, contact_email, contact_landline, area,
                created_at, updated_at, stage_updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NOW(),NOW(),NOW())
            RETURNING *`,
            [
                company_name, legal_name, gst_number, pan, website, linkedin, industry,
                business_category, business_size, employee_count || null, annual_turnover || null,
                city, state, country, address, pin_code, notes, tags || [], priority || 'Medium',
                lead_source, stage_id || 1, status || 'New Lead', assigned_executive_id || null, req.user.id,
                contact_person || null, contact_designation || null, contact_no || null, contact_email || null,
                contact_landline || null, area || null
            ]
        );

        const newCompany = result.rows[0];

        await logAudit(req.user.id, 'Create Company Lead', null, newCompany, req);
        await logTimeline(newCompany.company_id, req.user.id, 'Lead Created', `Lead for company ${company_name} was discovered and registered.`);

        res.status(201).json(redactFinancials(req.user.role, newCompany));
    } catch (err) {
        console.error('Create company error:', err);
        res.status(500).json({ error: 'Failed to create company lead. Check unique constraints.' });
    }
});

app.put('/api/companies/:id', authenticateToken, async (req, res) => {
    try {
        const companyId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM companies WHERE company_id = $1', [companyId]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const oldData = oldResult.rows[0];

        // Access check
        if (req.user.role === 'BD Executive' && oldData.assigned_executive_id !== req.user.id) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        const body = req.body;
        if (req.user.role === 'Telecaller') {
            // Telecaller cannot modify financial turnover
            delete body.annual_turnover;
        }

        const {
            company_name, legal_name, gst_number, pan, website, linkedin, industry,
            business_category, business_size, employee_count, annual_turnover,
            city, state, country, address, pin_code, notes, tags, priority,
            lead_source, stage_id, status, assigned_executive_id,
            contact_person, contact_designation, contact_no, contact_email, contact_landline, area
        } = body;

        const result = await pool.query(
            `UPDATE companies SET 
                company_name = $1, legal_name = $2, gst_number = $3, pan = $4, website = $5, 
                linkedin = $6, industry = $7, business_category = $8, business_size = $9, 
                employee_count = $10, annual_turnover = COALESCE($11, annual_turnover), city = $12, state = $13, 
                country = $14, address = $15, pin_code = $16, notes = $17, tags = $18, 
                priority = $19, lead_source = $20, stage_id = $21, status = $22, 
                assigned_executive_id = $23,
                contact_person = $24, contact_designation = $25, contact_no = $26, contact_email = $27,
                contact_landline = $28, area = $29,
                stage_updated_at = CASE WHEN stage_id != $21::int OR status != $22::varchar THEN NOW() ELSE stage_updated_at END,
                updated_at = NOW()
            WHERE company_id = $30
            RETURNING *`,
            [
                company_name || oldData.company_name,
                legal_name !== undefined ? legal_name : oldData.legal_name,
                gst_number !== undefined ? gst_number : oldData.gst_number,
                pan !== undefined ? pan : oldData.pan,
                website !== undefined ? website : oldData.website,
                linkedin !== undefined ? linkedin : oldData.linkedin,
                industry !== undefined ? industry : oldData.industry,
                business_category !== undefined ? business_category : oldData.business_category,
                business_size !== undefined ? business_size : oldData.business_size,
                employee_count !== undefined ? employee_count : oldData.employee_count,
                annual_turnover !== undefined ? annual_turnover : oldData.annual_turnover,
                city !== undefined ? city : oldData.city,
                state !== undefined ? state : oldData.state,
                country !== undefined ? country : oldData.country,
                address !== undefined ? address : oldData.address,
                pin_code !== undefined ? pin_code : oldData.pin_code,
                notes !== undefined ? notes : oldData.notes,
                tags !== undefined ? tags : oldData.tags,
                priority || oldData.priority,
                lead_source !== undefined ? lead_source : oldData.lead_source,
                stage_id !== undefined ? stage_id : oldData.stage_id,
                status || oldData.status,
                assigned_executive_id !== undefined ? assigned_executive_id : oldData.assigned_executive_id,
                contact_person !== undefined ? contact_person : oldData.contact_person,
                contact_designation !== undefined ? contact_designation : oldData.contact_designation,
                contact_no !== undefined ? contact_no : oldData.contact_no,
                contact_email !== undefined ? contact_email : oldData.contact_email,
                contact_landline !== undefined ? contact_landline : oldData.contact_landline,
                area !== undefined ? area : oldData.area,
                companyId
            ]
        );

        const newCompany = result.rows[0];

        // Logs
        await logAudit(req.user.id, 'Update Company Lead', oldData, newCompany, req);

        // Detect modifications for timeline
        const stageNames = { 1: 'Lead Discovery', 2: 'Lead Outreach', 3: 'Meetings', 4: 'Qualification', 5: 'Proposal', 6: 'Won', 7: 'Closed Lost' };

        if (oldData.stage_id !== newCompany.stage_id) {
            const newStageName = stageNames[newCompany.stage_id] || `Stage ${newCompany.stage_id}`;
            await logTimeline(companyId, req.user.id, 'Stage Move', `Moved to ${newStageName} — ${newCompany.status}`);
        } else if (oldData.status !== newCompany.status) {
            const currentStageName = stageNames[newCompany.stage_id] || `Stage ${newCompany.stage_id}`;
            await logTimeline(companyId, req.user.id, 'Stage Move', `Status updated to '${newCompany.status}' in ${currentStageName}`);
        }

        // Log other non-stage changes
        let otherChanges = [];
        if (oldData.assigned_executive_id !== newCompany.assigned_executive_id) {
            otherChanges.push(`Assigned executive updated`);
        }
        if (oldData.notes !== newCompany.notes && newCompany.notes) {
            otherChanges.push(`Notes added/updated`);
        }
        if (otherChanges.length > 0) {
            await logTimeline(companyId, req.user.id, 'Status Changed', otherChanges.join(', '));
        }

        res.json(redactFinancials(req.user.role, newCompany));
    } catch (err) {
        console.error('Update company error:', err);
        res.status(500).json({ error: 'Failed to update company details' });
    }
});

app.delete('/api/companies/:id', authenticateToken, requireRoles(['CEO', 'BD Manager', 'Admin']), async (req, res) => {
    try {
        const companyId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM companies WHERE company_id = $1', [companyId]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        await pool.query('DELETE FROM companies WHERE company_id = $1', [companyId]);
        await logAudit(req.user.id, 'Delete Company Lead', oldResult.rows[0], null, req);

        res.json({ success: true, message: 'Company lead deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete company lead' });
    }
});

// ================= CONTACTS =================
app.post('/api/contacts', authenticateToken, async (req, res) => {
    try {
        const {
            company_id, name, designation, department, email, mobile, whatsapp, linkedin,
            is_decision_maker, is_influencer, is_finance, is_legal, is_primary, notes
        } = req.body;

        // If primary is true, reset other primaries for this company
        if (is_primary) {
            await pool.query('UPDATE contacts SET is_primary = false WHERE company_id = $1', [company_id]);
        }

        const result = await pool.query(
            `INSERT INTO contacts (
                company_id, name, designation, department, email, mobile, whatsapp, linkedin,
                is_decision_maker, is_influencer, is_finance, is_legal, is_primary, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                company_id, name, designation, department, email, mobile, whatsapp, linkedin,
                is_decision_maker || false, is_influencer || false, is_finance || false,
                is_legal || false, is_primary || false, notes
            ]
        );

        const newContact = result.rows[0];
        await logTimeline(company_id, req.user.id, 'Research Updated', `Contact person '${name}' (${designation}) added.`);
        res.status(201).json(newContact);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM contacts WHERE contact_id = $1', [contactId]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        const oldData = oldResult.rows[0];

        const {
            name, designation, department, email, mobile, whatsapp, linkedin,
            is_decision_maker, is_influencer, is_finance, is_legal, is_primary, notes
        } = req.body;

        if (is_primary && !oldData.is_primary) {
            await pool.query('UPDATE contacts SET is_primary = false WHERE company_id = $1', [oldData.company_id]);
        }

        const result = await pool.query(
            `UPDATE contacts SET 
                name = $1, designation = $2, department = $3, email = $4, mobile = $5, whatsapp = $6, 
                linkedin = $7, is_decision_maker = $8, is_influencer = $9, is_finance = $10, 
                is_legal = $11, is_primary = $12, notes = $13
            WHERE contact_id = $14 RETURNING *`,
            [
                name || oldData.name,
                designation !== undefined ? designation : oldData.designation,
                department !== undefined ? department : oldData.department,
                email !== undefined ? email : oldData.email,
                mobile !== undefined ? mobile : oldData.mobile,
                whatsapp !== undefined ? whatsapp : oldData.whatsapp,
                linkedin !== undefined ? linkedin : oldData.linkedin,
                is_decision_maker !== undefined ? is_decision_maker : oldData.is_decision_maker,
                is_influencer !== undefined ? is_influencer : oldData.is_influencer,
                is_finance !== undefined ? is_finance : oldData.is_finance,
                is_legal !== undefined ? is_legal : oldData.is_legal,
                is_primary !== undefined ? is_primary : oldData.is_primary,
                notes !== undefined ? notes : oldData.notes,
                contactId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

app.delete('/api/contacts/:id', authenticateToken, async (req, res) => {
    try {
        const contactId = req.params.id;
        const check = await pool.query('SELECT * FROM contacts WHERE contact_id = $1', [contactId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });

        await pool.query('DELETE FROM contacts WHERE contact_id = $1', [contactId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

// ================= MEETINGS =================
app.get('/api/meetings', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT m.*, c.company_name
            FROM meetings m
            JOIN companies c ON m.company_id = c.company_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY m.meeting_date DESC, m.meeting_time DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

app.post('/api/meetings', authenticateToken, async (req, res) => {
    try {
        const {
            company_id, meeting_date, meeting_time, duration, participants,
            meeting_type, platform, platform_link, agenda, notes, action_items,
            next_meeting_date, attachments
        } = req.body;

        const result = await pool.query(
            `INSERT INTO meetings (
                company_id, meeting_date, meeting_time, duration, participants,
                meeting_type, platform, platform_link, agenda, notes, action_items,
                next_meeting_date, attachments, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                company_id, meeting_date, meeting_time, duration, participants,
                meeting_type, platform, platform_link, agenda, notes, action_items,
                next_meeting_date || null, attachments || [], req.user.id
            ]
        );

        const newMeeting = result.rows[0];

        await logTimeline(company_id, req.user.id, 'Meeting Scheduled', `Meeting scheduled for ${meeting_date} (${meeting_type} via ${platform}). Agenda: ${agenda}`);
        res.status(201).json(newMeeting);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to schedule meeting' });
    }
});

app.put('/api/meetings/:id', authenticateToken, async (req, res) => {
    try {
        const meetingId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM meetings WHERE meeting_id = $1', [meetingId]);
        if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
        const oldData = oldResult.rows[0];

        const {
            meeting_date, meeting_time, duration, participants, meeting_type,
            platform, platform_link, agenda, notes, action_items, next_meeting_date, attachments
        } = req.body;

        const result = await pool.query(
            `UPDATE meetings SET 
                meeting_date = $1, meeting_time = $2, duration = $3, participants = $4,
                meeting_type = $5, platform = $6, platform_link = $7, agenda = $8,
                notes = $9, action_items = $10, next_meeting_date = $11, attachments = $12
            WHERE meeting_id = $13 RETURNING *`,
            [
                meeting_date || oldData.meeting_date,
                meeting_time || oldData.meeting_time,
                duration !== undefined ? duration : oldData.duration,
                participants || oldData.participants,
                meeting_type || oldData.meeting_type,
                platform || oldData.platform,
                platform_link !== undefined ? platform_link : oldData.platform_link,
                agenda !== undefined ? agenda : oldData.agenda,
                notes !== undefined ? notes : oldData.notes,
                action_items !== undefined ? action_items : oldData.action_items,
                next_meeting_date || oldData.next_meeting_date,
                attachments || oldData.attachments,
                meetingId
            ]
        );

        if (notes && !oldData.notes) {
            await logTimeline(oldData.company_id, req.user.id, 'Meeting Completed', `Notes added for meeting on ${oldData.meeting_date}. Action items: ${action_items}`);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update meeting' });
    }
});

app.delete('/api/meetings/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM meetings WHERE meeting_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
});

// ================= TASKS =================
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT t.*, c.company_name, u.full_name as owner_name,
                   COALESCE((SELECT json_agg(s) FROM subtasks s WHERE s.task_id = t.task_id), '[]'::json) as subtasks
            FROM tasks t
            JOIN companies c ON t.company_id = c.company_id
            LEFT JOIN users u ON t.owner_id = u.user_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE t.owner_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY t.due_date ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { company_id, title, description, due_date, priority, status, progress, owner_id, subtasks } = req.body;
        const result = await pool.query(
            `INSERT INTO tasks (company_id, title, description, due_date, priority, status, progress, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [company_id, title, description, due_date, priority || 'Medium', status || 'Pending', progress || 0, owner_id || req.user.id]
        );
        const newTask = result.rows[0];

        // Insert subtasks if any
        if (subtasks && Array.isArray(subtasks)) {
            for (const st of subtasks) {
                await pool.query('INSERT INTO subtasks (task_id, title, status) VALUES ($1, $2, $3)', [newTask.task_id, st.title, st.status || 'Pending']);
            }
        }

        res.status(201).json(newTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
        if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        const oldData = oldResult.rows[0];

        const { title, description, due_date, priority, status, progress, owner_id, subtasks } = req.body;

        const result = await pool.query(
            `UPDATE tasks SET 
                title = $1, description = $2, due_date = $3, priority = $4,
                status = $5, progress = $6, owner_id = $7
            WHERE task_id = $8 RETURNING *`,
            [
                title || oldData.title,
                description !== undefined ? description : oldData.description,
                due_date || oldData.due_date,
                priority || oldData.priority,
                status || oldData.status,
                progress !== undefined ? progress : oldData.progress,
                owner_id || oldData.owner_id,
                taskId
            ]
        );

        // Update subtasks: simple clear & insert for simplicity
        if (subtasks && Array.isArray(subtasks)) {
            await pool.query('DELETE FROM subtasks WHERE task_id = $1', [taskId]);
            for (const st of subtasks) {
                await pool.query('INSERT INTO subtasks (task_id, title, status) VALUES ($1, $2, $3)', [taskId, st.title, st.status || 'Pending']);
            }
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE task_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ================= FOLLOW-UPS =================
app.get('/api/followups', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT f.*, c.company_name
            FROM follow_ups f
            JOIN companies c ON f.company_id = c.company_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY f.follow_up_date ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
});

app.post('/api/followups', authenticateToken, async (req, res) => {
    try {
        const { company_id, follow_up_date, follow_up_time, priority, comments, status } = req.body;
        const result = await pool.query(
            `INSERT INTO follow_ups (company_id, follow_up_date, follow_up_time, priority, comments, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [company_id, follow_up_date, follow_up_time || null, priority || 'Medium', comments, status || 'Pending', req.user.id]
        );
        const newFU = result.rows[0];

        await logTimeline(company_id, req.user.id, 'Call Made', `Follow-up call scheduled for ${follow_up_date}. Priority: ${priority}. Notes: ${comments}`);
        res.status(201).json(newFU);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create follow-up' });
    }
});

app.put('/api/followups/:id', authenticateToken, async (req, res) => {
    try {
        const fuId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM follow_ups WHERE follow_up_id = $1', [fuId]);
        if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Follow-up not found' });
        const oldData = oldResult.rows[0];

        const { follow_up_date, follow_up_time, priority, comments, status } = req.body;

        const result = await pool.query(
            `UPDATE follow_ups SET 
                follow_up_date = $1, follow_up_time = $2, priority = $3, comments = $4, status = $5
            WHERE follow_up_id = $6 RETURNING *`,
            [
                follow_up_date || oldData.follow_up_date,
                follow_up_time !== undefined ? follow_up_time : oldData.follow_up_time,
                priority || oldData.priority,
                comments !== undefined ? comments : oldData.comments,
                status || oldData.status,
                fuId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update follow-up' });
    }
});

app.delete('/api/followups/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM follow_ups WHERE follow_up_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete follow-up' });
    }
});

// ================= PROPOSALS =================
app.get('/api/proposals', authenticateToken, requireRoles(['CEO', 'BD Manager', 'BD Executive', 'Admin']), async (req, res) => {
    try {
        let query = `
            SELECT p.*, c.company_name
            FROM proposals p
            JOIN companies c ON p.company_id = c.company_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY p.proposal_date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

app.post('/api/proposals', authenticateToken, requireRoles(['CEO', 'BD Manager', 'BD Executive', 'Admin']), async (req, res) => {
    try {
        const { company_id, proposal_number, proposal_date, service_category, estimated_value, discount, final_value, expected_closing_date, status, pdf_link } = req.body;
        const result = await pool.query(
            `INSERT INTO proposals (company_id, proposal_number, proposal_date, service_category, estimated_value, discount, final_value, expected_closing_date, status, pdf_link)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [company_id, proposal_number, proposal_date, service_category, estimated_value, discount || 0, final_value, expected_closing_date || null, status || 'Draft', pdf_link]
        );
        const newProposal = result.rows[0];

        await logTimeline(company_id, req.user.id, 'Proposal Sent', `Proposal ${proposal_number} drafted and shared for ${service_category}. Estimated value: ${final_value}`);
        res.status(201).json(newProposal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create proposal. Check uniqueness of proposal number.' });
    }
});

app.put('/api/proposals/:id', authenticateToken, requireRoles(['CEO', 'BD Manager', 'BD Executive', 'Admin']), async (req, res) => {
    try {
        const proposalId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM proposals WHERE proposal_id = $1', [proposalId]);
        if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
        const oldData = oldResult.rows[0];

        const { proposal_number, proposal_date, service_category, estimated_value, discount, final_value, expected_closing_date, status, pdf_link } = req.body;

        // Managers and CEO must approve proposals if status is changing to 'Approved'
        if (status === 'Approved' && oldData.status !== 'Approved' && !['CEO', 'BD Manager', 'Admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only Managers and CEOs can approve proposals' });
        }

        const result = await pool.query(
            `UPDATE proposals SET 
                proposal_number = $1, proposal_date = $2, service_category = $3, estimated_value = $4,
                discount = $5, final_value = $6, expected_closing_date = $7, status = $8, pdf_link = $9
            WHERE proposal_id = $10 RETURNING *`,
            [
                proposal_number || oldData.proposal_number,
                proposal_date || oldData.proposal_date,
                service_category || oldData.service_category,
                estimated_value !== undefined ? estimated_value : oldData.estimated_value,
                discount !== undefined ? discount : oldData.discount,
                final_value !== undefined ? final_value : oldData.final_value,
                expected_closing_date || oldData.expected_closing_date,
                status || oldData.status,
                pdf_link !== undefined ? pdf_link : oldData.pdf_link,
                proposalId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update proposal' });
    }
});

app.delete('/api/proposals/:id', authenticateToken, requireRoles(['CEO', 'BD Manager', 'Admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM proposals WHERE proposal_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete proposal' });
    }
});

// ================= NDAs =================
app.get('/api/ndas', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT n.*, c.company_name
            FROM ndas n
            JOIN companies c ON n.company_id = c.company_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY n.created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch NDAs' });
    }
});

app.post('/api/ndas', authenticateToken, async (req, res) => {
    try {
        const { company_id, nda_version, sent_date, reminder_date, signed_date, expiry_date, status, pdf_link } = req.body;
        const result = await pool.query(
            `INSERT INTO ndas (company_id, nda_version, sent_date, reminder_date, signed_date, expiry_date, status, pdf_link)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [company_id, nda_version || '1.0', sent_date || null, reminder_date || null, signed_date || null, expiry_date || null, status || 'Draft', pdf_link]
        );
        const newNDA = result.rows[0];

        await logTimeline(company_id, req.user.id, 'NDA Shared', `NDA v${nda_version} status updated to '${status}'.`);
        res.status(201).json(newNDA);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create NDA' });
    }
});

app.put('/api/ndas/:id', authenticateToken, async (req, res) => {
    try {
        const ndaId = req.params.id;
        const oldResult = await pool.query('SELECT * FROM ndas WHERE nda_id = $1', [ndaId]);
        if (oldResult.rows.length === 0) return res.status(404).json({ error: 'NDA not found' });
        const oldData = oldResult.rows[0];

        const { nda_version, sent_date, reminder_date, signed_date, expiry_date, status, pdf_link } = req.body;

        const result = await pool.query(
            `UPDATE ndas SET 
                nda_version = $1, sent_date = $2, reminder_date = $3, signed_date = $4,
                expiry_date = $5, status = $6, pdf_link = $7
            WHERE nda_id = $8 RETURNING *`,
            [
                nda_version || oldData.nda_version,
                sent_date || oldData.sent_date,
                reminder_date || oldData.reminder_date,
                signed_date || oldData.signed_date,
                expiry_date || oldData.expiry_date,
                status || oldData.status,
                pdf_link !== undefined ? pdf_link : oldData.pdf_link,
                ndaId
            ]
        );

        const updatedNda = result.rows[0];

        if (status === 'Signed' && oldData.status !== 'Signed') {
            await logTimeline(oldData.company_id, req.user.id, 'NDA Signed', `NDA version ${updatedNda.nda_version} signed successfully.`);
            // Automatically promote company stage to Won
            await pool.query("UPDATE companies SET stage_id = 6, status = 'NDA Signed' WHERE company_id = $1", [oldData.company_id]);
        }

        res.json(updatedNda);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update NDA' });
    }
});

// ================= DOCUMENTS MODULE =================
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT d.*, c.company_name, u.full_name as uploaded_by_name
            FROM documents d
            JOIN companies c ON d.company_id = c.company_id
            LEFT JOIN users u ON d.uploaded_by = u.user_id
        `;
        let params = [];

        if (req.user.role === 'BD Executive') {
            query += ' WHERE c.assigned_executive_id = $1';
            params.push(req.user.id);
        }

        query += ' ORDER BY d.created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
    try {
        const { company_id, name, type, file_url, version } = req.body;
        const result = await pool.query(
            `INSERT INTO documents (company_id, name, type, file_url, uploaded_by, version)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [company_id, name, type, file_url, req.user.id, version || '1.0']
        );
        const newDoc = result.rows[0];

        await logTimeline(company_id, req.user.id, 'Document Uploaded', `Document '${name}' (${type}) was uploaded.`);
        res.status(201).json(newDoc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save document reference' });
    }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM documents WHERE document_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// ================= MASTERS MODULE =================
app.get('/api/masters/:table', authenticateToken, async (req, res) => {
    try {
        const { table } = req.params;
        const allowedTables = ['industry_master', 'source_master', 'category_master', 'service_master', 'stage_master', 'meeting_type_master', 'template_master', 'location_master'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: 'Invalid master table name' });
        }

        const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch master data' });
    }
});

app.post('/api/masters/:table', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const { table } = req.params;
        const allowedTables = ['industry_master', 'source_master', 'category_master', 'service_master', 'stage_master', 'meeting_type_master', 'template_master', 'location_master'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: 'Invalid master table name' });
        }

        const body = req.body;
        let query = '';
        let params = [];

        if (table === 'template_master') {
            query = `INSERT INTO template_master (name, type, content) VALUES ($1, $2, $3) RETURNING *`;
            params = [body.name, body.type, body.content];
        } else if (table === 'location_master') {
            query = `INSERT INTO location_master (city, state, country) VALUES ($1, $2, $3) RETURNING *`;
            params = [body.city, body.state, body.country];
        } else {
            query = `INSERT INTO ${table} (name) VALUES ($1) RETURNING *`;
            params = [body.name];
        }

        const result = await pool.query(query, params);
        await logAudit(req.user.id, `Add Master Data - ${table}`, null, result.rows[0], req);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to insert master data' });
    }
});

app.put('/api/masters/:table/:id', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const { table, id } = req.params;
        const allowedTables = ['industry_master', 'source_master', 'category_master', 'service_master', 'stage_master', 'meeting_type_master', 'template_master', 'location_master'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: 'Invalid master table name' });
        }

        const body = req.body;
        let query = '';
        let params = [];
        let idColumn = '';

        if (table === 'industry_master') idColumn = 'industry_id';
        else if (table === 'source_master') idColumn = 'source_id';
        else if (table === 'category_master') idColumn = 'category_id';
        else if (table === 'service_master') idColumn = 'service_id';
        else if (table === 'stage_master') idColumn = 'stage_id';
        else if (table === 'meeting_type_master') idColumn = 'type_id';
        else if (table === 'template_master') idColumn = 'template_id';
        else if (table === 'location_master') idColumn = 'location_id';

        const oldCheck = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = $1`, [id]);
        if (oldCheck.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

        if (table === 'template_master') {
            query = `UPDATE template_master SET name = $1, type = $2, content = $3 WHERE template_id = $4 RETURNING *`;
            params = [body.name, body.type, body.content, id];
        } else if (table === 'location_master') {
            query = `UPDATE location_master SET city = $1, state = $2, country = $3 WHERE location_id = $4 RETURNING *`;
            params = [body.city, body.state, body.country, id];
        } else {
            query = `UPDATE ${table} SET name = $1 WHERE ${idColumn} = $2 RETURNING *`;
            params = [body.name, id];
        }

        const result = await pool.query(query, params);
        await logAudit(req.user.id, `Update Master Data - ${table}`, oldCheck.rows[0], result.rows[0], req);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update master data' });
    }
});

app.delete('/api/masters/:table/:id', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const { table, id } = req.params;
        const allowedTables = ['industry_master', 'source_master', 'category_master', 'service_master', 'stage_master', 'meeting_type_master', 'template_master', 'location_master'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: 'Invalid master table name' });
        }

        let idColumn = '';
        if (table === 'industry_master') idColumn = 'industry_id';
        else if (table === 'source_master') idColumn = 'source_id';
        else if (table === 'category_master') idColumn = 'category_id';
        else if (table === 'service_master') idColumn = 'service_id';
        else if (table === 'stage_master') idColumn = 'stage_id';
        else if (table === 'meeting_type_master') idColumn = 'type_id';
        else if (table === 'template_master') idColumn = 'template_id';
        else if (table === 'location_master') idColumn = 'location_id';

        const oldCheck = await pool.query(`SELECT * FROM ${table} WHERE ${idColumn} = $1`, [id]);
        if (oldCheck.rows.length === 0) return res.status(404).json({ error: 'Record not found' });

        await pool.query(`DELETE FROM ${table} WHERE ${idColumn} = $1`, [id]);
        await logAudit(req.user.id, `Delete Master Data - ${table}`, oldCheck.rows[0], null, req);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete master data. It may be referenced elsewhere.' });
    }
});

// ================= AUDIT LOGS =================
app.get('/api/audit-logs', authenticateToken, requireRoles(['CEO', 'BD Manager', 'Admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.full_name as user_name, u.role as user_role 
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.user_id
             ORDER BY a.created_at DESC LIMIT 500`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ================= USERS MANAGEMENT (Admin/CEO only) =================
app.get('/api/users', authenticateToken, requireRoles(['Admin', 'CEO']), async (req, res) => {
    try {
        const result = await pool.query('SELECT user_id, full_name, email, role, status, created_at FROM users ORDER BY full_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const { full_name, email, password, role, status } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123', salt);

        const result = await pool.query(
            `INSERT INTO users (full_name, email, password, role, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id, full_name, email, role, status, created_at`,
            [full_name, email, hashedPassword, role, status || 'Active']
        );
        const newUser = result.rows[0];
        await logAudit(req.user.id, 'Create User Account', null, newUser, req);
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create user. Email may be already taken.' });
    }
});

app.put('/api/users/:id', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const userId = req.params.id;
        const oldCheck = await pool.query('SELECT user_id, full_name, email, role, status FROM users WHERE user_id = $1', [userId]);
        if (oldCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const oldUser = oldCheck.rows[0];

        const { full_name, email, password, role, status } = req.body;
        let query = '';
        let params = [];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = `UPDATE users SET full_name = $1, email = $2, password = $3, role = $4, status = $5 WHERE user_id = $6 RETURNING user_id, full_name, email, role, status, created_at`;
            params = [full_name || oldUser.full_name, email || oldUser.email, hashedPassword, role || oldUser.role, status || oldUser.status, userId];
        } else {
            query = `UPDATE users SET full_name = $1, email = $2, role = $3, status = $4 WHERE user_id = $5 RETURNING user_id, full_name, email, role, status, created_at`;
            params = [full_name || oldUser.full_name, email || oldUser.email, role || oldUser.role, status || oldUser.status, userId];
        }

        const result = await pool.query(query, params);
        await logAudit(req.user.id, 'Update User Account', oldUser, result.rows[0], req);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const userId = req.params.id;
        if (parseInt(userId, 10) === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }
        const oldCheck = await pool.query('SELECT user_id, full_name, email, role, status FROM users WHERE user_id = $1', [userId]);
        if (oldCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
        await logAudit(req.user.id, 'Delete User Account', oldCheck.rows[0], null, req);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user. User may be referenced in leads or logs.' });
    }
});

// ================= SETTINGS =================
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.post('/api/settings', authenticateToken, requireRoles(['Admin']), async (req, res) => {
    try {
        const { company_profile, email_settings, whatsapp_settings, sms_settings, notification_rules, working_hours, password_policy, two_factor_auth } = req.body;
        const check = await pool.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1');

        let result;
        if (check.rows.length > 0) {
            result = await pool.query(
                `UPDATE settings SET 
                    company_profile = $1, email_settings = $2, whatsapp_settings = $3, sms_settings = $4,
                    notification_rules = $5, working_hours = $6, password_policy = $7, two_factor_auth = $8, updated_at = NOW()
                 WHERE id = $9 RETURNING *`,
                [company_profile, email_settings, whatsapp_settings, sms_settings, notification_rules, working_hours, password_policy, two_factor_auth, check.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO settings (company_profile, email_settings, whatsapp_settings, sms_settings, notification_rules, working_hours, password_policy, two_factor_auth)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [company_profile, email_settings, whatsapp_settings, sms_settings, notification_rules, working_hours, password_policy, two_factor_auth]
            );
        }

        await logAudit(req.user.id, 'Update System Settings', null, result.rows[0], req);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// ================= NOTIFICATIONS =================
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        // Build mock live reminders/alerts dynamically based on database tasks, follow-ups, NDAs
        // Since we want dynamic live notification list
        let notifications = [];

        // 1. Follow-up reminders (due today/overdue)
        const fus = await pool.query(
            `SELECT f.*, c.company_name FROM follow_ups f
             JOIN companies c ON f.company_id = c.company_id
             WHERE f.status = 'Pending' AND f.follow_up_date <= CURRENT_DATE`
        );
        fus.rows.forEach(f => {
            notifications.push({
                id: `fu-${f.follow_up_id}`,
                title: 'Follow-up Reminder',
                message: `Schedule follow-up call with ${f.company_name} is due/overdue.`,
                type: 'Follow-up',
                date: f.follow_up_date,
                priority: f.priority
            });
        });

        // 2. Task reminders
        const tasks = await pool.query(
            `SELECT t.*, c.company_name FROM tasks t
             JOIN companies c ON t.company_id = c.company_id
             WHERE t.status != 'Completed' AND t.due_date <= CURRENT_DATE`
        );
        tasks.rows.forEach(t => {
            notifications.push({
                id: `task-${t.task_id}`,
                title: 'Task Reminder',
                message: `Task: "${t.title}" for ${t.company_name} is pending.`,
                type: 'Task',
                date: t.due_date,
                priority: t.priority
            });
        });

        // 3. NDA Reminders
        const ndas = await pool.query(
            `SELECT n.*, c.company_name FROM ndas n
             JOIN companies c ON n.company_id = c.company_id
             WHERE n.status = 'Sent' AND n.reminder_date <= CURRENT_DATE`
        );
        ndas.rows.forEach(n => {
            notifications.push({
                id: `nda-${n.nda_id}`,
                title: 'NDA Follow-up Reminder',
                message: `NDA sent to ${n.company_name} is awaiting signature. Follow-up due.`,
                type: 'NDA',
                date: n.reminder_date,
                priority: 'High'
            });
        });

        // 4. Clients Onboarded Alert
        const clients = await pool.query(
            `SELECT c.* FROM companies c
             WHERE c.stage_id = 6 AND c.updated_at >= NOW() - INTERVAL '7 DAYS'`
        );
        clients.rows.forEach(cl => {
            notifications.push({
                id: `onboard-${cl.company_id}`,
                title: 'Client Onboarded!',
                message: `${cl.company_name} is successfully onboarded. Proceed with delivery handover.`,
                type: 'System Alert',
                date: cl.updated_at,
                priority: 'Medium'
            });
        });

        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load notifications' });
    }
});

// ================= ANALYTICS & DASHBOARD METRICS =================
// ================= CEO DASHBOARD =================
app.get('/api/reports/ceo-dashboard', authenticateToken, requireRoles(['CEO', 'Admin']), async (req, res) => {
    try {
        const period = req.query.period || 'all'; // 'today', 'week', 'month', 'all'
        
        let createdDateFilter = '1=1'; // all time
        let updatedDateFilter = '1=1'; // all time
        
        if (period === 'today') {
            createdDateFilter = 'DATE(created_at) = CURRENT_DATE';
            updatedDateFilter = 'DATE(updated_at) = CURRENT_DATE';
        } else if (period === 'yesterday') {
            createdDateFilter = "DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'";
            updatedDateFilter = "DATE(updated_at) = CURRENT_DATE - INTERVAL '1 day'";
        } else if (period === 'week') {
            createdDateFilter = "created_at >= date_trunc('week', CURRENT_DATE)";
            updatedDateFilter = "updated_at >= date_trunc('week', CURRENT_DATE)";
        } else if (period === 'month') {
            createdDateFilter = "created_at >= date_trunc('month', CURRENT_DATE)";
            updatedDateFilter = "updated_at >= date_trunc('month', CURRENT_DATE)";
        }

        // New Leads (Stage 1)
        const leadsRes = await pool.query(`
            SELECT COUNT(*) as count FROM companies WHERE stage_id = 1 AND ${createdDateFilter}
        `);

        // Outreach (Stage 2) - Hybrid: Total is all time, breakdown is team activity
        const outreachRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM companies WHERE stage_id = 2) as total_outreach,
                COUNT(*) FILTER (WHERE status = 'Contacted') as contacted_count,
                COUNT(*) FILTER (WHERE status = 'Follow-up Required') as followup_count,
                COUNT(*) FILTER (WHERE status = 'Not Interested') as not_interested_count,
                COUNT(*) FILTER (WHERE status = 'Wrong Number') as wrong_number_count
            FROM companies WHERE stage_id = 2 AND ${updatedDateFilter}
        `);

        // Meetings (Stage 3) - Hybrid: Total is all time, breakdown is team activity
        const meetingsRes = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM companies WHERE stage_id = 3) as total_meetings,
                COUNT(*) FILTER (WHERE status = 'Meeting Scheduled') as scheduled_count,
                COUNT(*) FILTER (WHERE status = 'Meeting Completed') as completed_count,
                COUNT(*) FILTER (WHERE status = 'Rescheduled') as rescheduled_count,
                COUNT(*) FILTER (WHERE status = 'No Show') as noshow_count
            FROM companies WHERE stage_id = 3 AND ${updatedDateFilter}
        `);

        // Won (Stage 6)
        const wonRes = await pool.query(`
            SELECT COUNT(*) as count FROM companies WHERE stage_id = 6 AND ${updatedDateFilter}
        `);
        
        // Total leads imported/added in this period
        const totalLeadsRes = await pool.query(`
            SELECT COUNT(*) as count FROM companies WHERE ${createdDateFilter}
        `);

        res.json({
            period: period,
            totalNewLeads: parseInt(totalLeadsRes.rows[0].count),
            discoveryCount: parseInt(leadsRes.rows[0].count),
            outreachCount: parseInt(outreachRes.rows[0].total_outreach) || 0,
            contactedCount: parseInt(outreachRes.rows[0].contacted_count) || 0,
            followupCount: parseInt(outreachRes.rows[0].followup_count) || 0,
            notInterestedCount: parseInt(outreachRes.rows[0].not_interested_count) || 0,
            wrongNumberCount: parseInt(outreachRes.rows[0].wrong_number_count) || 0,
            meetingsCount: parseInt(meetingsRes.rows[0].total_meetings) || 0,
            scheduledCount: parseInt(meetingsRes.rows[0].scheduled_count) || 0,
            completedCount: parseInt(meetingsRes.rows[0].completed_count) || 0,
            rescheduledCount: parseInt(meetingsRes.rows[0].rescheduled_count) || 0,
            noshowCount: parseInt(meetingsRes.rows[0].noshow_count) || 0,
            wonCount: parseInt(wonRes.rows[0].count)
        });
    } catch (err) {
        console.error('CEO Dashboard Error:', err);
        res.status(500).json({ error: 'Failed to fetch CEO dashboard metrics' });
    }
});

app.get('/api/reports/dashboard-metrics', authenticateToken, async (req, res) => {
    try {
        // Query basic analytics metrics
        const compFilter = req.user.role === 'BD Executive' ? 'WHERE assigned_executive_id = ' + req.user.id : '';
        const propFilter = req.user.role === 'BD Executive' ? 'JOIN companies c ON p.company_id = c.company_id WHERE c.assigned_executive_id = ' + req.user.id : '';
        const ndaFilter = req.user.role === 'BD Executive' ? 'JOIN companies c ON n.company_id = c.company_id WHERE c.assigned_executive_id = ' + req.user.id : '';

        const countsRes = await pool.query(`
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

        // Financial metrics (restricted for Telecallers)
        let pipelineValue = 0;
        let expectedRevenue = 0;
        let winRate = 0;
        let avgSalesCycle = 15; // default mock sales cycle

        if (req.user.role !== 'Telecaller') {
            const financials = await pool.query(`
                SELECT 
                    COALESCE(SUM(final_value), 0) as pipeline_val,
                    COALESCE(SUM(final_value * 0.7), 0) as expected_rev -- 70% probability mock
                FROM proposals p
                ${propFilter}
            `);
            pipelineValue = financials.rows[0].pipeline_val;
            expectedRevenue = financials.rows[0].expected_rev;

            const winRateRes = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE stage_id = 6)::float / NULLIF(COUNT(*), 0) * 100 as rate
                FROM companies
                ${compFilter}
            `);
            winRate = Math.round(winRateRes.rows[0].rate || 0);
        }

        // Active NDA Pendings vs Signed
        const ndaStats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Sent') as nda_pending,
                COUNT(*) FILTER (WHERE status = 'Signed') as nda_signed
            FROM ndas n
            ${ndaFilter}
        `);

        // Lead sources breakdown
        const leadSources = await pool.query(`
            SELECT lead_source as source, COUNT(*) as count
            FROM companies
            ${compFilter}
            GROUP BY lead_source
        `);

        // Industry breakdown
        const industryStats = await pool.query(`
            SELECT industry, COUNT(*) as count
            FROM companies
            ${compFilter}
            GROUP BY industry
        `);

        // Monthly growth
        const monthlyGrowth = await pool.query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
            FROM companies
            ${compFilter}
            GROUP BY month
            ORDER BY month ASC
        `);

        // Executive performance leaderboard
        const executivePerformance = await pool.query(`
            SELECT u.full_name as executive, COUNT(c.company_id) as total_leads, 
                   COUNT(c.company_id) FILTER (WHERE c.stage_id = 6) as won_leads
            FROM users u
            LEFT JOIN companies c ON u.user_id = c.assigned_executive_id
            WHERE u.role = 'BD Executive'
            GROUP BY u.full_name
        `);

        const payload = {
            totalLeads: countsRes.rows[0].total_leads,
            leadDiscovery: countsRes.rows[0].lead_discovery,
            leadOutreach: countsRes.rows[0].lead_outreach,
            meetings: countsRes.rows[0].meetings,
            qualified: countsRes.rows[0].qualified,
            proposals: countsRes.rows[0].proposals,
            won: countsRes.rows[0].won,
            lost: countsRes.rows[0].lost,
            ndaPending: ndaStats.rows[0].nda_pending,
            ndaSigned: ndaStats.rows[0].nda_signed,
            pipelineValue,
            expectedRevenue,
            winRate,
            avgSalesCycle,
            funnel: [
                { stage: 'Discovery', count: countsRes.rows[0].lead_discovery },
                { stage: 'Outreach', count: countsRes.rows[0].lead_outreach },
                { stage: 'Meetings', count: countsRes.rows[0].meetings },
                { stage: 'Qualification', count: countsRes.rows[0].qualified },
                { stage: 'Proposal', count: countsRes.rows[0].proposals },
                { stage: 'Won', count: countsRes.rows[0].won }
            ],
            leadSources: leadSources.rows,
            industries: industryStats.rows,
            growth: monthlyGrowth.rows,
            leaderboard: executivePerformance.rows
        };

        res.json(payload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to aggregate analytics' });
    }
});

// Run server
app.listen(port, () => {
    console.log(`ABI Business Development CRM Server started on port ${port}`);
});
