const express = require('express');
const tourController = require('./../controller/tourController');
const authController = require('./../controller/authController');
const reviewRouter = require('./../routes/reviewRoute');

const router = express.Router();

// POST /tours/873987/reviews
// GET /tours/3422234/reviews
// GET /tours/342224/reviews/24124

// router.route('/:tourId/reviews').post(
//     authController.protect, 
//     authController.restrictTo('user'),
//     reviewController.createReview);

// redirecting route on another router / mounting router
router.use('/:tourId/reviews', reviewRouter);

 
router.route('/tour-states').get(tourController.getTourStates);

router.route('/monthly-plan/:year').get(
    authController.protect , 
    authController.restrictTo('admin', 'lead-guide'),
    tourController.getMonthlyPlan
);


router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

// /tours-within?distance=233&center=-48,43&unit=mi
// /tours-within/233/center/-48,43/unit/mi
router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router.route('/')
.get(tourController.getAllTours)
.post(
    authController.protect , 
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
);

router.route('/:id')
.get(tourController.getTour)
.patch(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
)
.delete(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
);

module.exports = router;