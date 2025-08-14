const { authenticateUser, authorizeRoles } = require('./middleware/auth');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/', require('./routes/auth.routes'));

// Protected routes
app.use('/users', authenticateUser, require('./routes/user.routes'));
app.use('/rides', authenticateUser, require('./routes/rides.routes'));
app.use('/driver', authenticateUser, authorizeRoles('DRIVER'), require('./routes/driver.routes'));
app.use('/admin', authenticateUser, authorizeRoles('ADMIN'), require('./routes/admin.routes'));

module.exports = app;
