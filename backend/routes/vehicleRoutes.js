const express = require("express");
const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/newVehicle", authMiddleware, vehicleController.uploadVehicleImage, vehicleController.addVehicle);
router.get("/getVehicles", authMiddleware, vehicleController.getVehicles);
router.put("/:id", authMiddleware, vehicleController.uploadVehicleImage, vehicleController.updateVehicle);
router.delete("/:id", authMiddleware, vehicleController.deleteVehicle);

module.exports = router;