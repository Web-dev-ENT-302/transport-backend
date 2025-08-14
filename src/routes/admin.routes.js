const express = require('express');
const prisma = require('../prismaClient');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Admin: Get all students
router.get('/students', authenticateUser, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const students = await prisma.student.findMany();
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Admin: Get all drivers
router.get('/drivers', authenticateUser, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany();
        res.json(drivers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// Admin: Get all rides
router.get('/rides', authenticateUser, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const rides = await prisma.ride.findMany({
            include: { student: true, driver: true }
        });
        res.json(rides);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch rides' });
    }
});

module.exports = router;
