import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";
import { db } from './data/db.js';
import playersRoute from './routes/playerRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import tournamentController from './controllers/TournamentController.js';
import authRoutes from './routes/authRoutes.js';
import { logAction } from './utils/logger.js';
import monitorRoutes from "./routes/monitorRoutes.js";






// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();
const PORT = 5000;

// Wrap Express app in HTTP server
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
     origin: [

        "https://tennis-tournaments-frontend.onrender.com"
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoute);
app.use('/api/tournaments', tournamentRoutes);

app.use("/monitored-users", monitorRoutes);



// WebSocket setup
const io = new Server(server, {
    cors: {
         origin: [

        "https://tennis-tournaments-frontend.onrender.com"
    ],
        methods: ["GET", "POST"]
    }
});

// File uploads setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }
    res.status(200).json({
        message: "File uploaded successfully",
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

// Serve uploaded files
app.use("/uploads", express.static(uploadDir));

async function monitorUserActivity() {
    try {
        console.log(" Entered monitorUserActivity");

        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        console.log(` Checking deletes since: ${oneMinuteAgo.toISOString()}`);

        const pool = await db.pool;
        const request = pool.request();

        const result = await request.query(`
            SELECT userId, COUNT(*) as deleteCount
            FROM Logs
            WHERE action = 'DELETE_TOURNAMENT' AND timestamp >= '${oneMinuteAgo.toISOString()}'
            GROUP BY userId
            HAVING COUNT(*) > 3
        `);

        if (result.recordset.length === 0) {
            console.log(" No users with suspicious delete activity found.");
        } else {
            console.log(" Suspicious users detected:", result.recordset);
        }

        for (const row of result.recordset) {
            console.log(` Checking if user ${row.userId} already monitored...`);
            const check = await pool.request().query(`
                SELECT 1 FROM MonitoredUsers WHERE userId = ${row.userId}
            `);

            if (check.recordset.length === 0) {
                console.log(` Adding user ${row.userId} to MonitoredUsers`);
                await pool.request().query(`
                    INSERT INTO MonitoredUsers (userId, reason)
                    VALUES (${row.userId}, 'High DELETE frequency detected')
                `);
            } else {
                console.log(` User ${row.userId} is already in MonitoredUsers.`);
            }
        }
    } catch (err) {
        console.error(" Monitoring error:", err);
    }
}

// API Routes
app.get("/api/tournaments", (req, res) => {
    try {
        const { location, page = 1, limit = 5 } = req.query;
        let results = [...tournamentController];

        if (location) {
            results = results.filter(t => t.location.toLowerCase() === location.toLowerCase());
        }

        const start = (page - 1) * limit;
        const end = start + parseInt(limit);
        const paginated = results.slice(start, end);

        res.json({
            tournaments: paginated,
            total: results.length
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


app.get("/api/tournaments/:id", async (req, res) => {
    try {
        const pool = await db.pool;
        const result = await pool.request()
            .input('id', db.sql.Int, req.params.id)
            .query(`
                SELECT T.id, T.name, T.location, T.date, T.prizeMoney, T.favoritePlayerId, P.name AS favoritePlayerName
                FROM Tournaments T
                LEFT JOIN Players P ON T.favoritePlayerId = P.id
                WHERE T.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Failed to fetch tournament:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});



// POST /api/tournaments
app.post("/api/tournaments", async (req, res) => {
    try {
        const { name, location, date, prize, favoritePlayer, userId } = req.body;
        console.log("Received tournament:", req.body);
        console.log("hi");

        if (!name || !location || !date) {
            return res.status(400).json({ error: "Name, location, and date are required" });
        }

        const pool = await db.pool;

        const result = await pool.request()
            .input("name", db.sql.NVarChar, name)
            .input("location", db.sql.NVarChar, location)
            .input("date", db.sql.Date, date)
            .input("prize", db.sql.Decimal(18, 2), prize || 0.00)
            .input("favoritePlayer", db.sql.NVarChar, favoritePlayer || "Not specified")
            .query(`
                INSERT INTO Tournaments (name, location, date, prizeMoney, favoritePlayer)
                OUTPUT INSERTED.*
                VALUES (@name, @location, @date, @prize, @favoritePlayer)
            `);
        //await logAction(userId, 'Created tournament');
        // Add validation
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
            await db.query(
                'INSERT INTO Logs (userId, action, timestamp) VALUES (@userId, @action, @timestamp)',
                {
                    userId,
                    action: 'CREATE_TOURNAMENT',
                    timestamp: new Date(),
                }
            );
       
       

        const newTournament = result.recordset[0];
        io.emit("new-tournament", newTournament); // WebSocket broadcast
        res.status(201).json(newTournament);
    } catch (err) {
        console.error("Error creating tournament:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/api/tournaments/:id", async (req, res) => {
    try {
        const { name, location, date, prize, favoritePlayerId } = req.body;
        const id = parseInt(req.params.id);
        const pool = await db.pool;

        const result = await pool.request()
            .input("id", db.sql.Int, id)
            .input("name", db.sql.NVarChar, name)
            .input("location", db.sql.NVarChar, location)
            .input("date", db.sql.Date, date)
            .input("prize", db.sql.Decimal(18, 2), prize || 0.00)
            .input("favoritePlayerId", db.sql.Int, favoritePlayerId || null)
            .query(`
                UPDATE Tournaments
                SET name = @name,
                    location = @location,
                    date = @date,
                    prizeMoney = @prize,
                    favoritePlayerId = @favoritePlayerId
                WHERE id = @id;

                SELECT * FROM Tournaments WHERE id = @id;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Error updating tournament:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.delete("/api/tournaments/:id", async (req, res) => {
    try {
        console.log("hello");
        const id = parseInt(req.params.id);
        const pool = await db.pool;
        console.log("Attempting to delete tournament with ID:", id);

        const result = await pool.request()
            .input("id", db.sql.Int, id)
            .query("DELETE FROM Tournaments WHERE id = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        res.status(204).send();
    } catch (err) {
        console.error("Error deleting tournament:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setInterval(monitorUserActivity, 60 * 1000); // every 60 seconds

});


export { app };
