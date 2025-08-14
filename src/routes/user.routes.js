const express = require('express');
const prisma = require('../prismaClient');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');
const router = express.Router();

// Helper to get the correct Prisma model based on role
const getModelByRole = (role) => {
    const models = {
        STUDENT: prisma.student,
        DRIVER: prisma.driver,
        ADMIN: prisma.admin
    };
    return models[role] || null;
};

// GET current logged-in user
router.get('/me', authenticateUser, async (req, res) => {
    try {
        const model = getModelByRole(req.user.role);
        if (!model) return res.status(400).json({ error: 'Invalid role in token' });

        const user = await model.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE profile
router.put('/me', authenticateUser, async (req, res) => {
    try {
        const { name } = req.body;
        const model = getModelByRole(req.user.role);
        if (!model) return res.status(400).json({ error: 'Invalid role in token' });

        const updated = await model.update({
            where: { id: req.user.id },
            data: { name }
        });

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET ALL USERS

router.get('/users',
    authenticateUser,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const students = await prisma.student.findMany();
            const drivers = await prisma.driver.findMany();
            
            res.json({ students, drivers });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

module.exports = router;
