require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 

// This line defines 'app' so line 1 doesn't throw a ReferenceError!
const app = express(); 
const PORT = process.env.PORT || 3000;

// ====== DATABASE CONFIGURATION ======
const cleanURI = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.split('?')[0] 
  : '';

const pool = new Pool({
  connectionString: cleanURI,
  ssl: {
    rejectUnauthorized: false
  }
});

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

// Ensure your server is configured to read incoming JSON data payloads
app.use(express.json());

// ====== DEFENSIVE MIDDLEWARE LAYER ======
const verifyToken = (req, res, next) => {
    // 1. Extract the token from the HTTP Authorization header
    const authHeader = req.headers['authorization'];
    
    // Standard industry format is "Bearer <TOKEN_STRING>", so we split at the space
    const token = authHeader && authHeader.split(' ')[1];

    // If there is no token string present, lock the gate instantly
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Access denied! Missing cryptographic token pass." 
        });
    }

    try {
        // 2. Cryptographic Verification Check
        // Decodes and verifies the token using the hidden cloud signature stamp
        const verifiedData = jwt.verify(token, process.env.JWT_SECRET);
        
        // Inject the verified payload user details into the request object so future routes can read it
        req.user = verifiedData;
        
        // 3. Pass clearance! Wave them through to the next function
        next();
    } catch (error) {
        // Triggered if the token has been tampered with, forged, or has expired
        res.status(403).json({ success: false, message: "Handshake rejected: Invalid or expired token pass." });
    }
};

// ====== AUTHENTICATION ENDPOINTS ======

// 1. User Registration (Sign-up)
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;

    // Basic validation safety check
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    try {
        // Cryptographic Layer: Generate a secure salt and hash the plain-text password
        const salt = await bcrypt.genSalt(10);
        const hashedSecurePassword = await bcrypt.hash(password, salt);

        // Database Layer: Inject data safely using parameterized inputs ($1, $2, $3)
        // RETURNING allows us to confirm success without exposing the hash back to the client
        const queryText = `
            INSERT INTO users (username, email, password_hash) 
            VALUES ($1, $2, $3) 
            RETURNING id, username, email, created_at;
        `;
        
        const result = await pool.query(queryText, [username, email, hashedSecurePassword]);

        // Success Handshake
        res.status(201).json({
            success: true,
            message: "User successfully registered in the cloud database!",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration engine crash:", error);

        // PostgreSQL error code '23505' indicates a UNIQUE constraint violation (duplicate username/email)
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                message: "Registration blocked: Username or Email already exists." 
            });
        }

        res.status(500).json({ success: false, message: "Internal server error during credential storage." });
    }
});

// 2. User Authentication (Login)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    try {
        // Step 1: Look up the user by their email address
        const queryText = 'SELECT * FROM users WHERE email = $1;';
        const result = await pool.query(queryText, [email]);

        // If the array is empty, the email doesn't exist in our system
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials configuration." });
        }

        const user = result.rows[0];

        // Step 2: Cryptographic check. Compare incoming plain text password with stored hash
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials configuration." });
        }

        // Step 3: Success! Credentials match.
        // Sign a new token containing the user's ID and email, valid for 24 hours
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send the token badge back down to the client application
        res.status(200).json({
            success: true,
            message: "Authentication cleared! Access token issued.",
            token: token, // This is your encrypted digital badge
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login engine crash:", error);
        res.status(500).json({ success: false, message: "Internal error during authentication handshake." });
    }
});

// ====== ENGINEERING LOG ENDPOINTS ======

// 1. Create a New Activity Log (Protected)
app.post('/api/logs', verifyToken, async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ success: false, message: "Title and content are required." });
    }

    try {
        // req.user.id is automatically populated by our verifyToken middleware shield
        const queryText = `
            INSERT INTO notes (user_id, title, content) 
            VALUES ($1, $2, $3) 
            RETURNING id, user_id, title, content, created_at;
        `;
        
        const result = await pool.query(queryText, [req.user.id, title, content]);

        res.status(201).json({
            success: true,
            message: "Operational snapshot successfully committed to cloud storage.",
            log: result.rows[0]
        });

    } catch (error) {
        console.error("Log engine write crash:", error);
        res.status(500).json({ success: false, message: "Internal server error during data serialization." });
    }
});

// 2. Fetch Only the Logged-In User's Activity Logs (Protected)
app.get('/api/logs', verifyToken, async (req, res) => {
    try {
        // Strictly filter using the verified token ID to prevent cross-user data leakage
        const queryText = `
            SELECT id, title, content, created_at 
            FROM notes 
            WHERE user_id = $1 
            ORDER BY created_at DESC;
        `;
        
        const result = await pool.query(queryText, [req.user.id]);

        res.status(200).json({
            success: true,
            totalLogs: result.rows.length,
            logs: result.rows
        });

    } catch (error) {
        console.error("Log engine fetch crash:", error);
        res.status(500).json({ success: false, message: "Internal server error during data isolation lookup." });
    }
});

// 3. Secured Endpoint (Requires a valid token to read)
// We inject 'verifyToken' right in the middle as a defensive shield
app.get('/api/user/dashboard', verifyToken, (req, res) => {
    // Since verifyToken calls next(), we can safely read the injected user data here
    res.status(200).json({
        success: true,
        message: "Welcome to the secure database matrix room!",
        secretData: "This data is completely encrypted and hidden from the public web.",
        authenticatedUser: req.user // Displays the decrypted ID and Email stored inside the badge
    });
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