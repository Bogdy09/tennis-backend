import express from 'express';
import { db } from '../data/db.js';
import sql from 'mssql';
import {sendVerificationEmail} from '../utils/email.js';

const router = express.Router();
const verificationCodes = {};

router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const pool = await db.pool;
        
        // Check if username already existsj
        const checkResult = await pool.request()
            .input("username", sql.NVarChar(50), username)
            .query("SELECT id FROM Users WHERE username = @username");

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({ message: "Username already exists" });
        }

        // Insert new user
        await pool.request()
            .input("username", sql.NVarChar(50), username)
            .input("password", sql.NVarChar(50), password) // Note: plain-text for now
            .query("INSERT INTO Users (username, password) VALUES (@username, @password)");

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await db.pool;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT * FROM Users WHERE username = @username AND password = @password');
        if (result.recordset.length === 1) {
            const user = result.recordset[0];

            // Generate a 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000);
            verificationCodes[user.username] = code;
           

            if(user.username!="admin")
                await sendVerificationEmail(user.username, code);

            // Respond with user info
            res.status(200).json({ message: 'Verification code sent', userId: user.id, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }

  } catch (err) {
    console.error('Login failed error:', err); // ADD THIS
    res.status(500).json({ error: 'Login failed' });
}
});



router.post('/verify-code', async (req, res) => {
    const { username, code } = req.body;

    if (!username || !code) {
        return res.status(400).json({ error: 'Username and code required' });
    }

    // Check if the code matches
    if (verificationCodes[username] && verificationCodes[username].toString() === code.toString()) {
        delete verificationCodes[username]; // Clean up

        try {
            const pool = await db.pool;
            const result = await pool.request()
                .input("username", db.sql.NVarChar, username)
                .query("SELECT id FROM Users WHERE username = @username");

            if (result.recordset.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const user = result.recordset[0];

            return res.status(200).json({
                message: 'Verification successful',
                userId: user.id,
                username
            });

        } catch (err) {
            console.error("Error fetching user:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    } else {
        return res.status(401).json({ error: 'Invalid verification code' });
    }
});



export default router;
