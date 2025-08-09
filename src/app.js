const { authMiddleware } = require('./middleware/auth');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/', require('./routes/auth.routes'));
app.use('/', require('./routes/user.routes'));
app.use('/', require('./routes/rides.routes'));
// driver.routes.js, admin.routes.js will come next

module.exports = app;
