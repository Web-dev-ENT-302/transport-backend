const express = require("express");
const prisma = require("../prismaClient");
const { authenticateUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

/**
 * GET /driver/rides/available
 * List all rides with status PENDING (no driver assigned)
 */
router.get(
  "/rides/available",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const rides = await prisma.ride.findMany({
        where: {
          status: "PENDING",
          driverId: null,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          pickup: true,
          destination: true,
          distanceKm: true,
          durationMins: true,
          priceNaira: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      res.json({ rides });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


/**
 * GET /driver/rides/current (accepted or in-progress)
 * Get the current ride of the authenticated driver
 */
router.get(
  "/rides/current",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const ride = await prisma.ride.findFirst({
        where: {
          driverId: req.user.id,
          status: { in: ["ACCEPTED", "IN_PROGRESS"] }, // one active ride per driver
        },
        include: {
          student: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      if (!ride) {
        return res.json({ message: "No current ride assigned", ride: null });
      }

      res.json({ ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /driver/stats
 * Get driver earnings and ride statistics
 */
router.get(
  "/stats",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const driverId = req.user.id;
      const now = new Date();

      // Start of today
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Start of week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Today's completed rides
      const todaysRides = await prisma.ride.findMany({
        where: { driverId, status: "COMPLETED", createdAt: { gte: startOfDay } },
        select: { priceNaira: true, distanceKm: true },
      });

      const todayEarning = todaysRides.reduce((sum, ride) => sum + parseFloat(ride.priceNaira), 0);
      const todayDistance = todaysRides.reduce((sum, ride) => sum + ride.distanceKm, 0);

      // All-time completed rides with total distance
      const allRides = await prisma.ride.findMany({
        where: { driverId, status: "COMPLETED" },
        select: { distanceKm: true },
      });
      const allTimeDistance = allRides.reduce((sum, ride) => sum + ride.distanceKm, 0);
      const allRidesCompleted = allRides.length;

      // This week's earnings
      const weekRides = await prisma.ride.findMany({
        where: { driverId, status: "COMPLETED", createdAt: { gte: startOfWeek } },
        select: { priceNaira: true },
      });
      const weekEarning = weekRides.reduce((sum, ride) => sum + parseFloat(ride.priceNaira), 0);

      res.json({
        today: {
          rides: todaysRides.length,
          earning: todayEarning,
          distanceKm: todayDistance,
        },
        allTime: {
          completedRides: allRidesCompleted,
          totalDistanceKm: allTimeDistance,
        },
        week: {
          totalBalance: weekEarning,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


module.exports = router;
