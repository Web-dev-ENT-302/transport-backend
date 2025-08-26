const express = require("express");
const prisma = require("../prismaClient");
const { authenticateUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

/**
 * Student requests a ride
 * POST /rides/request
 */
router.post(
  "/request",
  authenticateUser,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { pickup, destination, distanceKm, durationMins, priceNaira } =
        req.body;

      if (!pickup || !destination) {
        return res
          .status(400)
          .json({ error: "Pickup and destination are required" });
      }

      const ride = await prisma.ride.create({
        data: {
          studentId: req.user.id,
          pickup,
          destination,
          distanceKm,
          durationMins,
          priceNaira,
          status: "PENDING",
        },
      });

      res.status(201).json({ message: "Ride requested successfully", ride });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


router.post(
  "/:id/cancel",
  authenticateUser,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const rideId = parseInt(req.params.id);
      const ride = await prisma.ride.findUnique({ where: { id: rideId } });

      if (!ride) return res.status(404).json({ error: "Ride not found" });
      if (ride.studentId !== req.user.id)
        return res.status(403).json({ error: "Not authorized" });

      if (ride.status === "COMPLETED") {
        return res.status(400).json({ error: "Cannot cancel a completed ride" });
      }

      if (ride.status === "CANCELLED") {
        return res.status(400).json({ error: "This ride is already cancelled" });
      }

      // Count this student's cancellations in current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const cancellationsThisWeek = await prisma.ride.count({
        where: {
          studentId: req.user.id,
          status: "CANCELLED",
          updatedAt: { gte: startOfWeek },
        },
      });

      if (cancellationsThisWeek >= 3) {
        return res.status(400).json({
          error:
            "You have reached your cancellation limit for this week. Try again next week.",
        });
      }

      // Cancel the ride
      const cancelledRide = await prisma.ride.update({
        where: { id: rideId },
        data: { status: "CANCELLED" },
      });

      let warning = null;
      if (cancellationsThisWeek === 2) {
        warning = "Warning: You have only 1 cancellation left this week.";
      }

      res.json({
        message: "Ride cancelled",
        ride: cancelledRide,
        warning,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);




/**
 * Driver accepts a ride
 * POST /rides/accept
 */
router.post(
  "/accept",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const { rideId } = req.body;
      if (!rideId) return res.status(400).json({ error: "rideId is required" });

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (!ride) return res.status(404).json({ error: "Ride not found" });

      if (ride.status !== "PENDING") {
        return res
          .status(400)
          .json({ error: "Ride is not available for acceptance" });
      }

      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId: req.user.id,
          status: "ACCEPTED",
        },
      });

      res.status(200).json({ message: "Ride accepted", ride: updatedRide });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Driver rejects a ride
 * POST /rides/reject
 */
router.post(
  "/reject",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const { rideId } = req.body;
      if (!rideId) return res.status(400).json({ error: "rideId is required" });

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      if (!ride) return res.status(404).json({ error: "Ride not found" });

      if (ride.status !== "PENDING") {
        return res
          .status(400)
          .json({ error: "Ride is not available for rejection" });
      }

      // Free ride back up (no driverId, still pending)
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId: null,
          status: "PENDING",
        },
      });

      res
        .status(200)
        .json({
          message: "Ride rejected, available for other drivers",
          ride: updatedRide,
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Update ride status
 * PUT /rides/:id/status
 */
router.put("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["IN_PROGRESS", "COMPLETED", "CANCELLED"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    // Only driver assigned to the ride or admin can update
    if (req.user.id !== ride.driverId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "You are not allowed to update this ride" });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });

    res.json({ message: "Ride status updated", ride: updatedRide });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get ride history for a student (paginated, with full details)
 * GET /rides/history?page=1&limit=10
 */
router.get(
  "/history",
  authenticateUser,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      // Ensure studentId is an integer
      const studentId = parseInt(req.user.id, 10);
      if (isNaN(studentId)) {
        return res.status(400).json({ error: "Invalid student ID in token" });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      // Count total rides
      let totalRides;
      try {
        totalRides = await prisma.ride.count({
          where: { studentId },
        });
      } catch (err) {
        console.error("Error counting rides:", err);
        return res.status(500).json({ error: "Failed to count rides" });
      }

      // Fetch rides with details
      let rides;
      try {
        rides = await prisma.ride.findMany({
          where: { studentId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            pickup: true,
            destination: true,
            distanceKm: true,
            durationMins: true,
            priceNaira: true,
            status: true,
            createdAt: true,
            driver: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                plateNumber: true,
              },
            },
          },
        });
      } catch (err) {
        console.error("Error fetching rides:", err);
        return res.status(500).json({ error: "Failed to fetch rides" });
      }

      res.json({
        page,
        limit,
        totalPages: Math.ceil(totalRides / limit),
        totalRides,
        rides,
      });
    } catch (error) {
      console.error("Unexpected error in /rides/history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Get ride history for a driver (paginated, with full details)
 * GET /rides/driver/history?page=1&limit=10
 */
router.get(
  "/driver/history",
  authenticateUser,
  authorizeRoles("DRIVER"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalRides = await prisma.ride.count({
        where: { driverId: req.user.id },
      });

      const rides = await prisma.ride.findMany({
        where: { driverId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          pickup: true,
          destination: true,
          distanceKm: true,
          durationMins: true,
          priceNaira: true,
          status: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      res.json({
        page,
        limit,
        totalPages: Math.ceil(totalRides / limit),
        totalRides,
        rides,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
