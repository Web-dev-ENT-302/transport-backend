const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, plateNumber } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['STUDENT', 'DRIVER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // If DRIVER, plate number is required and must match format
        if (role === 'DRIVER') {
            const plateRegex = /^[A-Z]{3}-\d{3}[A-Z]{2}$/;
            if (!plateNumber || !plateRegex.test(plateNumber)) {
                return res.status(400).json({ 
                    error: 'Plate number is required for drivers and must be in the format ABC-123DE' 
                });
            }
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = { name, email, password: hashedPassword, role };

        if (role === 'DRIVER') {
            userData.plateNumber = plateNumber; // Add plate number only for drivers
        }

        const user = await prisma.user.create({ data: userData });

        // Remove password before sending
        const { password: _, ...safeUser } = user;

        res.status(201).json({ message: 'User registered successfully', user: safeUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
