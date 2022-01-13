const crypto = require('crypto');
const {promisify} = require('util');
const User = require('../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
    // jwt.sign(payload, secret, options)
    return jwt.sign( { id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}
const createAndSendToken = (user, statusCode, req, res) =>{
    const token = signToken(user._id);

    res.cookie('jwt', token, {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, // cookie can not be accessed and modifyed by the browser
        secure: req.secure || req.headers('x-forwarded-proto') === 'https' //cookie will only be send in encrypted connection usualy when we use https
    });

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signUp = catchAsync( async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });
    
    // send welcome email to the user's email
    const url = `${req.protocol}://${req.get('host')}/me`; 
    await new Email(newUser, url).sendWelcome(); 

    createAndSendToken(newUser, 201, req, res);

});

exports.login = catchAsync(async (req, res, next) =>{
    // 1) Check if the Email and Password exist
    const { email, password } = req.body;

    if(!email || !password){
        return next( new AppError('Please provide email and password!', 400) ); // statusCode 400: BAD REQUEST
    }

    // 2) Check if the user exist and the password is correct
    const user = await User.findOne({ email }).select( '+password' );

    if(!user || !( await user.correctPassword(password, user.password))){
        return next(new AppError('Invalid email or password!', 401)); // statusCode 401: Unauthorized Error 
    }

    // 3) If everything is OK then send token to then client

    createAndSendToken(user, 200, req, res);
});

// a very Sofisticated route protecting algorithm
exports.protect = catchAsync(async (req, res, next)=> {
    // 1) Getting token and Checking if it's their
    let token;
    if(
        req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')
    )
    {
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt){
        token = req.cookies.jwt;
    }
    
    if(!token){
        return next(new AppError('You are not logged in, please login!', 401)); // statusCode 401: Unauthorized access
    }
    
    // 2) Varification token
    // checking if the token is not being manipulated by third party
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // this can genrate two errors that we are handling in the errorController using 
    // Using handleJWTError and handleJWTExpiredError function 
    // which will handle Invalid token and Token Expired

    // 3) Check if user still exist
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next( 
            new AppError('The user belonging to this token does no longer exist.', 401) 
        );
    }

    // 4) Check if user changed password after the token was issued
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return next(
            new AppError('User recently changed password! please login again', 401)
        );
    }

    // 5) GRANT ACCESS TO THE PROTECTED ROUTE
    req.user = currentUser;
    // Also Set req.locals.user = currentUser , so all the pug templates get user
    res.locals.user = currentUser;
    next();
});

// Check if the user is logged in, but do not create errors
exports.isLoggedIn = catchAsync(async (req, res, next)=> {
   if(req.cookies.jwt){
        // 0) Check if the user is loogged out if he is ten return 
        if(req.cookies.jwt == 'Logged-Out') return next();

        // 1) Varification token
        // checking if the token is not being manipulated by third party
        const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET); // this can genrate two errors that we are handling in the errorController using 
        // Using handleJWTError and handleJWTExpiredError function 
        // which will handle Invalid token and Token Expired
        
        // 2) Check if user still exist
        const currentUser = await User.findById(decoded.id);
        if(!currentUser){
            return next();
        }
        
        // 3) Check if user changed password after the token was issued
        if(currentUser.changedPasswordAfter(decoded.iat)){
            return next();
        }
        
        // At this point, There is a logged in user
        // 4) Set req.locals.user = currentUser , so all the pug templates get user
        res.locals.user = currentUser;
        return next();
    }
    next();
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'Logged-Out', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true // cookie can not be accessed and modifyed by the browser
    });

    res.status(200).json({ status: 'success' });
};

exports.restrictTo = (...roles) =>{
    return (req, res, next) => {
        // roles ['admin', 'lead-guide'] , role = 'user'
        if(!roles.includes(req.user.role)){
            return next( new AppError('You do not have permission to perform this action!', 403) ); // statusCode 403: Forbidden
        }

        next();
    }
};

exports.forgotPassword = catchAsync(async (req, res, next)=>{
    // 1) Get user based on POSTed email
    const user = await User.findOne({email: req.body.email});
    if(!user){
        return next( new AppError('There is no user with this email address.', 404) );
    }

    // 2) Genrate the random reset token
    const resetToken = user.createPasswordResetToken();
    user.save({validateBeforeSave: false}); // saving the unencrypted token
    
    try{
        // 3) Send it to user's email
        // this will look something like this:- http://127.0.0.1:3000/api/v1/users/resetPassword/319176b30d17793000f1bbf81e372535ab5d785cebf8fab4500c2568ea18927b
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset(); // added in this lecture and replaced other one

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    }catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});

        return next(new AppError('There was a error sending the email,try again later!', 500));
    }

});

exports.resetPassword = catchAsync(async (req, res, next) =>{
    // 1) Get user based on the token
    const encryptedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: encryptedToken,
        passwordResetExpires: {$gt: Date.now()}
    });

    // 2) If the token has not expired, and there is user, set the new password
    if(!user){
        return next( new AppError('Token is invalid or expired', 400) );
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) update changedPasswordAt property for the user
    // updating in the document middleware (pre save hook)

    // 4) Log the user in, send JWT
    createAndSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next)=>{
    // 1) Get user from the collection
    const user = await User.findById(req.user._id).select('+password');

    // 2) Check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
        return next( new AppError('Your current password is wrong!', 401) );
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save({validateBeforeSave: true}); // save run validate automatic but I am explicitly giving here

    // 4) Log user in, send JWT
    createAndSendToken(user, 200, req, res);
});