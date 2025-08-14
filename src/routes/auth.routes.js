const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const router = express.Router();

// =================== REGISTER ===================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, plateNumber } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['STUDENT', 'DRIVER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check if email exists in any table
        const existingStudent = await prisma.student.findUnique({ where: { email } });
        const existingDriver = await prisma.driver.findUnique({ where: { email } });
        const existingAdmin = await prisma.admin.findUnique({ where: { email } });

        if (existingStudent || existingDriver || existingAdmin) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let newUser;

        if (role === 'DRIVER') {
            const plateRegex = /^[A-Z]{3}-\d{3}[A-Z]{2}$/;
            if (!plateNumber || !plateRegex.test(plateNumber)) {
                return res.status(400).json({
                    error: 'Plate number is required for drivers and must be in the format ABC-123DE'
                });
            }

            newUser = await prisma.driver.create({
                data: { name, email, password: hashedPassword, plateNumber }
            });

        } else if (role === 'STUDENT') {
            newUser = await prisma.student.create({
                data: { name, email, password: hashedPassword }
            });

        } else if (role === 'ADMIN') {
            newUser = await prisma.admin.create({
                data: { name, email, password: hashedPassword }
            });
        }

        const { password: _, ...safeUser } = newUser;
        res.status(201).json({ message: `${role} registered successfully`, user: safeUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =================== LOGIN ===================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user = await prisma.student.findUnique({ where: { email } });
        let role = 'STUDENT';

        if (!user) {
            user = await prisma.driver.findUnique({ where: { email } });
            if (user) role = 'DRIVER';
        }
        if (!user) {
            user = await prisma.admin.findUnique({ where: { email } });
            if (user) role = 'ADMIN';
        }

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const { password: _, ...safeUser } = user;
        res.status(200).json({ message: 'Login successful', token, user: safeUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
