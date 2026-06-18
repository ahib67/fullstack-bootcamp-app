const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 

// This line defines 'app' so line 1 doesn't throw a ReferenceError!
const app = express(); 
const PORT = process.env.PORT || 3000;

// ====== DATABASE CONFIGURATION ======
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bootcamp_db',
    password: 'ah2005ib', // ⚠️ Remember to put your actual database password here!
    port: 5432,
});

// ====== MIDDLEWARE LAYER ======
app.use(cors());
app.use(express.json());

// ====== ROUTES ======

// Base test route
app.get('/', (req, res) => {
    res.send("<h1>The Backend Server is Online!</h1>");
});

// Upgraded Security Checkpoint Route
app.post('/api/contact', async (req, res) => {
    const clientCargo = req.body;

    console.log("📥 New cargo received. Initiating security inspection...");
    
    // 1. Strip sneaky whitespace
    const cleanName = clientCargo.name ? clientCargo.name.trim() : null;
    const cleanEmail = clientCargo.email ? clientCargo.email.trim() : null;

    // 2. Guardrail A: Reject empty submissions
    if (!cleanName || !cleanEmail) {
        console.warn("⚠️ Security Alert: Blocked an entry with missing or empty fields.");
        return res.status(400).json({
            status: "error",
            message: "Security violation: Name and Email cannot be blank."
        });
    }

    // 3. Guardrail B: Enforce buffer/length limits
    if (cleanName.length > 100 || cleanEmail.length > 150) {
        console.warn("⚠️ Security Alert: Blocked an entry exceeding maximum character allowances.");
        return res.status(400).json({
            status: "error",
            message: "Security violation: Character limit exceeded."
        });
    }

    // 4. Guardrail C: Structural Regex validation for email patterns
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
        console.warn(`⚠️ Security Alert: Blocked an invalid email format attempt: "${cleanEmail}"`);
        return res.status(400).json({
            status: "error",
            message: "Security violation: Invalid email address format structure."
        });
    }

    // ====== ALL CHECKPOINTS PASSED - EXECUTING DATABASE WRITE ======
    try {
        const sqlQuery = 'INSERT INTO contacts (name, email) VALUES ($1, $2) RETURNING *';
        const queryValues = [cleanName, cleanEmail];

        const result = await pool.query(sqlQuery, queryValues);
        
        console.log(`💾 Cargo safely locked into DB row ID: ${result.rows[0].id}`);

        res.status(200).json({ 
            status: "success", 
            message: "Data cleared security checkpoints and permanently locked into storage." 
        });

    } catch (dbError) {
        console.error("❌ Database insertion failure:", dbError);
        res.status(500).json({ status: "error", message: "Internal server error during storage indexing." });
    }
});

// ====== START THE ENGINE ======
app.listen(PORT, () => {
    console.log(`🚀 Full-Stack Security Engine live at http://localhost:${PORT}`);
});