const express = require('express');
const reviewController = require('./../controller/reviewController');
const authController = require('./../controller/authController');

const router = express.Router({mergeParams: true});

// GET /tours/234fhdkj3/reviews
// POST /tours/234fhdkj3/reviews
// POST /reviews

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post( 
        authController.restrictTo('user'), 
        reviewController.setTourAndUserId,
        reviewController.createReview
    );

router.route('/:id')
    .get(reviewController.getReview)
    .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
    )
    .delete(
        reviewController.deleteReview,
        authController.restrictTo('user', 'admin')
    );

module.exports = router;