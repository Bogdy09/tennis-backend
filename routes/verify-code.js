router.post('/verify-code', (req, res) => {
    const { username, code } = req.body;

    if (verificationCodes[username] && verificationCodes[username].toString() === code.toString()) {
        // Valid code
        delete verificationCodes[username]; // Optional: clear code after use

        // Optionally fetch user info from DB again if needed
        res.status(200).json({
            message: 'Verification successful',
            userId: 123, // or real userId
            username
        });
    } else {
        res.status(401).json({ error: 'Invalid verification code' });
    }
});
