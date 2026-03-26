const offerService = require("../services/offer.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class OfferController {
  /**
   * Get all offers for the org
   * GET /api/v1/offers
   */
  getAllOffers = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const filters = {};
      if (req.query.type) filters.type = req.query.type;
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === "true";
      }

      const offers = await offerService.getAllOffers(orgId, filters);

      res.status(200).json({
        success: true,
        data: offers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get offer by ID
   * GET /api/v1/offers/:id
   */
  getOfferById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const offer = await offerService.getOfferById(id);

      res.status(200).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new offer
   * POST /api/v1/offers
   */
  createOffer = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const offer = await offerService.createOffer({ orgId, ...req.body });

      res.status(201).json({
        success: true,
        message: "Offer created successfully",
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update offer
   * PATCH /api/v1/offers/:id
   */
  updateOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const offer = await offerService.updateOffer(id, req.body);

      res.status(200).json({
        success: true,
        message: "Offer updated successfully",
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete offer (hard if unused, soft if linked to memberships/trainings)
   * DELETE /api/v1/offers/:id
   */
  deleteOffer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await offerService.deleteOffer(id);

      res.status(200).json({
        success: true,
        message: result.deactivated
          ? "Offer has existing records and was deactivated"
          : "Offer deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new OfferController();
