const express = require('express');

const userController = require('./../controller/userController');
const authController = require('./../controller/authController');

const router = express.Router();


router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

// Protect all the route after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.patch('/updateMe', 
    userController.uploadUserPhoto, 
    userController.resizeUserPhoto,
    userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);
router.route('/me').get(
    userController.getMe,
    userController.getUser
);

router.use(authController.restrictTo('admin'));

router.route('/')
.get(userController.getAllUsers)
.post(userController.createUser);

router.route('/:id')
.get(userController.getUser)
.patch(userController.updateUser)
.delete(userController.deleteUser);

module.exports = router;