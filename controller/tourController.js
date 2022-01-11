const multer = require('multer');
const sharp = require('sharp');

const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handllerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null, true);
    }else{
        cb(new AppError('Not an image! Please upload only images.'),false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([ // for multiple image uploads
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3}
]);
// upload.single('image') // for single upload // creates req.file
// upload.array('images', 5) // for multiple images of same name, maxcount = 5 // creates req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if(!req.files.imageCover || !req.files.images) return next();

    // for imageCover
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({quality: 80})
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // for images
    req.body.images = [];
    
    await Promise.all(
        req.files.images.map(async (file,i)=> {
            const filename = `tour-${req.params.id}-${Date.now()}-${i+1}-cover.jpeg`;
            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({quality: 90})
                .toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    next();
});

exports.aliasTopTours = (req,res,next)=>{
    req.query.limit = 5;
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, {
    path: 'reviews',
    select: 'review rating user'
}); // passing Tour model with Populate options

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);


// Aggregate Pipeline

exports.getTourStates = catchAsync( async (req, res, next) => {
    // '/tour-states'
    const states = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5} }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty'},
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        {
            $sort: { avgPrice: 1 }
        },
        // {
        //     $match: { _id: { $ne: 'EASY' } }
        // }
    ]);

    res.status(200).json({
        status: 'success',
        results: states.length,
        data: {
            states
        }
    });

} );

exports.getMonthlyPlan = catchAsync( async (req, res, next) => {
    // Implementing which is the busyest month of the year
    // router.route('/monthly-plan/:year').get(tourController.getMonthlyPlane);
    const year = req.params.year * 1;
    const plane = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id'}
        },
        {
            $project: { _id: 0 }
        },
        {
            $sort: { numTourStarts: -1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: plane.length,
        data: {
            plane
        }
    });
} );

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const {distance, latlng, unit} = req.params;
    // console.log(distance, latlng, unit);
    const [lat, lng] = latlng.split(', ');
    // console.log(lat, lng);
    const radius = unit === 'mi' ? distance/3963.2 : distance/6378.1;
    
    if(!lat || !lng){
        return next(new AppError('Please provide latitude and longitude in the formate lat, lng', 400));
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) =>{
    const {latlng, unit} = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi'? 0.000621371: 0.001;

    if(!lat || !lng){
        return next(new AppError('Please provide latitude and longitude in the formate lat, lng', 400));
    }

    const tours = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });
});