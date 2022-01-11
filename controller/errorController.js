const AppError = require('./../utils/appError');

const handleCastErrorDB = (error) => {
    const message = `Invalid ${error.path}: ${error.stringValue}`;
    return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (error) => {
    const value = error.keyValue.name;
    const message = `Duplicate Field value "${value}", Please use another value!`;
    return new AppError(message, 400);
};
const handleValidationErrorDB = (error) => {
    const errors = Object.values(error.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};
const handleJWTError = () => new AppError('Invalid token, please login again!', 401);
const handleJWTExpiredError = () => new AppError('Token expired, please login agian!', 401);

const sendErrorDev = (err, req, res) => {
    // 1) API errors
    if(req.originalUrl.startsWith('/api')){
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            // stack: err.stack
        });
    }else{
        // 2) RENDERED WEBSITE
        res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: err.message
        });
    }
};
const sendErrorProd = (err, req, res) => {
    // 1) API error 
    if(req.originalUrl.startsWith('/api')){

        // Operational, trusted error: send message to client
        if(err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
            
            // Programming or other unknown error: don't leak error details
        }else {
            // 1) Log error
            console.error('Error 🤢');
            
            // 2) Send Generic Message
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong',
                // err
            });
        }
    }else{
        // 2) RENDERED WEBSITE
        // Operational, trusted error: send message to client
        if(err.isOperational) {
            res.status(err.statusCode).render('error', {
                title: 'Something went wrong!',
                msg: err.message
            });
            
            // Programming or other unknown error: don't leak error details
        }else {
            // 1) Log error
            console.error('Error 🤢');
            
            // 2) Send Generic Message
            res.status(500).render('error', {
                title: 'Something went wrong!',
                msg: 'Something went wrong, please try again'
            });
        }
    }
};
    
    // By giving these four arguments express automaticaly understand
    // that this middleware is for error handling
    // Implementing Global Error Handling Middleware
    module.exports = ((err, req, res, next)=>{
        // console.log(err.stack);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    if(process.env.NODE_ENV === 'development'){
        sendErrorDev(err, req, res);
    }else if(process.env.NODE_ENV == 'production'){
        let error = { ...err };
        error.message = err.message;
        error.name = err.name; // simple destructuring does not including the name property which is very neccessary to have here so I add manually

        // Invalid Id error
        if(error.name === 'CastError') error = handleCastErrorDB(error);
        if(error.code === 11000) error = handleDuplicateFieldsDB(error);
        if(error.name === 'ValidationError') error = handleValidationErrorDB(error);

        if(error.name === 'JsonWebTokenError') error = handleJWTError();
        if(error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
    
    next();
});