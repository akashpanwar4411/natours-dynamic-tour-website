const path = require('path');
const express = require('express');
const morgan = require('morgan'); // for seeing request response in the console
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // for implementing rate limiting stable version 5
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression'); // for compressing text/json responses

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controller/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoute');
const viewRouter = require('./routes/viewRoute');
const bookingRouter = require('./routes/bookingRoute');

// Start express app
const app = express();

app.enable('trust proxy');


// seting pug engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARE'S
// Serving Static Files
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(`${__dirname}/public`));

// Set Security HTTP Headers
app.use(helmet());

// Limit Requests for /api 
const limiter = rateLimit({ // this will be an express middleware function
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'To many request from this IP, please try again in an hour'
});
app.use('/api', limiter);

// Development Logging
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}


// Body Parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' })); // middle where that can modify the request data
// express request does not contain the data with post like request that client send
// that's why we use middlewhere

// body parser for submitting form situation
app.use(express.urlencoded({
    extended: true
}));

// for parsing cookie
app.use(cookieParser());

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Preventing Parameter Pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);

// Setting the Content-Security-Policy
app.use((req, res, next)=> {
    res.set('Content-Security-Policy',
    "default-src  * https://* ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src * data:;object-src 'none';script-src * blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;");
    next();
});

// for compressing responses
app.use(compression());

// Test Middleware
app.use((req, res, next)=>{
    req.requestTime = new Date().toISOString();
    // console.log('cookie', req.cookies.jwt);
    next();
});


// Mounting Router
app.use('/api/v1/users', userRouter); // mounting router
app.use('/api/v1/tours', tourRouter); // mounting a new router on a route
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/', viewRouter);


// Handling Unhandled Routes
app.all('*', (req, res, next)=>{
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server!`
    // });

    // If we pass anything into the next function in a middleware express
    // understand it as an error and it then skip all the other middleware
    // and jumps directly to the Global Error Handling Middleware
    /*
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.status = 'fail';
    err.statusCode = 404; 
    */

    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});


app.use(globalErrorHandler);

module.exports = app;