const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth'); // now auth is the function
const router = express.Router();

router.get('/me', auth, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(user);
});

router.put('/me', auth, async (req, res) => {
    const { name } = req.body;
    const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { name }
    });
    res.json(updated);
});

module.exports = router;
