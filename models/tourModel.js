const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');

// Defining Schema for Tour
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour must have less than or equal to 40 characters'],
        minlength: [10, 'A tour must have more than or equal to 10 characters']
    },
    slug: String,
    duration:{
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize:{
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'difficulty is either: easy, medium, difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1.0, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10 // 4.66666 46.6666 47 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    priceDiscount: {
        type: Number,
        validate: {
            // this only points to current doc on NEW document creaton not on update
            validator: function(val){
                return this.price > val;
            },
            message: 'Discount price ({VALUE}) should be below regular price'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a description']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON // this is how we describe Geospatial data
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number], // longitude, latitude
        address: String,
        description: String
    },
    locations: [ // Embeded Documents
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides:[
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Improving read performance with indexes
tourSchema.index({price: 1}); // single index
tourSchema.index({price: 1, ratingAverage: -1}); // single index
tourSchema.index({slug:1}); // single index
tourSchema.index({startLocation: '2dsphere'}); // '2d' if points are imaginery

tourSchema.virtual('durationWeeks').get(function(){
    // Note: we cannot use virtual properties in query
    return this.duration / 7;
});

tourSchema.virtual('reviews', {
    ref: 'Review', // name of the model that we want reference
    foreignField: 'tour',
    localField: '_id'
});

// DOCUMENT MIDDLEWARE:- runs before save() and create() but not on .insertMany(), findOneAndUpdate, findByIdAndUpdate

/*
// adding embeded user as guide using document middleware
tourSchema.pre('save', async function(next){
    const guidesPromises = this.guides.map(async id => await User.findById(id));
    this.guides = await Promise.all(guidesPromises);
    next();
});
*/
tourSchema.pre(/^find/, function(next){
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt' // here we don't want to select these fields
    });
    next();
});

// QUERY MIDDLEWARE:- this points to the query Object
tourSchema.pre(/^find/, function(next){
    // tourSchema.pre('find', function(next){
    this.find({secretTour: { $ne: true }});
    this.start = Date.now();
    next();
});
tourSchema.pre('save', function(next){
    // In pre document middleware this points to curently procesed documents
    // we also call middleware as hooks in this case 
    // we call pre save hook
    // console.log(this);
    this.slug = slugify(this.name, {lower: true});
    next();
});
// tourSchema.pre('save', function(next){
//     console.log('...will save document');
//     next();
// });

// tourSchema.post('save', function(doc, next){
//     console.log(doc);
//     next();
// });

tourSchema.post(/^find/, function(docs, next){
    console.log(`Query take ${Date.now() - this.start} miliseconds!`);
    next();
});

// AGGREGATION MIDDLEWARE
// Commenting this because section 11: Geospatial aggregtion: calculating distance 
// issue: $geoNear is only valid as the first stage in a pipeline
// tourSchema.pre('aggregate', function(next){
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     // console.log(this.pipeline());
//     next();
// });

// creating model using the schema or creating collection
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;