const express = require('express');
const authController = require('../controller/authController');

const viewController = require('../controller/viewController');
const bookingController = require('../controller/bookingController');

const router = express.Router();


router.get('/tour/:slug', authController.isLoggedIn,viewController.getView);
router.get('/login',viewController.getLoginForm);

router.get('/me', authController.protect,viewController.getAccount);

router.get('/my-tours', 
    authController.protect, 
    viewController.getMyTours
);

router.post('/update-user-data', authController.protect ,viewController.updateUser);

router.get('/', 
    bookingController.createBookingCheckout,
    authController.isLoggedIn,
    viewController.getOverview
);


module.exports = router;