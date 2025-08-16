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
      const { pickup, destination } = req.body;
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

      res.status(200).json({ message: "Ride rejected, available for other drivers", ride: updatedRide });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


/**
 * Get ride details
 * GET /rides/:id
 */
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            plateNumber: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

module.exports = router;
