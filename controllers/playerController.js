import playerService from '../services/playerService.js';

async function getAllPlayers(req, res) {
    try {
        const players = await playerService.getAllPlayers();
        res.json(players);
    } catch (err) {
        res.status(500).send(err.message);
    }
}

// ES Module export options:



// Option 2: Default export
export default {
    getAllPlayers
};

// Option 3: Direct default export (if this is the only function)
// export default getAllPlayers;