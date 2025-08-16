const { authenticateUser, authorizeRoles } = require("./middleware/auth");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// Read allowed origins from .env and split by comma
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Public routes
app.use("/", require("./routes/auth.routes"));

// Protected routes
app.use("/users", authenticateUser, require("./routes/user.routes"));
app.use("/rides", authenticateUser, require("./routes/rides.routes"));
app.use(
  "/driver",
  authenticateUser,
  authorizeRoles("DRIVER"),
  require("./routes/driver.routes")
);
app.use(
  "/admin",
  authenticateUser,
  authorizeRoles("ADMIN"),
  require("./routes/admin.routes")
);

module.exports = app;
