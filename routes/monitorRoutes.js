// routes/monitorRoutes.js
import express from "express";
import { db } from '../data/db.js';
const router = express.Router();

router.get("/monitored-users", async (req, res) => {
    try {
        const username = req.query.username; // Example: /api/monitored-users?username=admin

        if (username !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const pool = await db.pool;
        const result = await pool.request().query(`
            SELECT m.id, m.userId, m.reason, u.username
            FROM MonitoredUsers m
            LEFT JOIN Users u ON u.id = m.userId
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching monitored users:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
