const express = require("express");
const offerController = require("./controllers/offer.controller");

const router = express.Router();

router.get("/", offerController.getAllOffers);
router.get("/:id", offerController.getOfferById);
router.post("/", offerController.createOffer);
router.patch("/:id", offerController.updateOffer);
router.delete("/:id", offerController.deleteOffer);

module.exports = router;
