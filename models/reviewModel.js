const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty!']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    user: {
        type: mongoose.Schema.ObjectId, // parent referencing
        ref: 'User',
        required: [true, 'Review must belong to a user.']
    },
    tour: {
        type: mongoose.Schema.ObjectId, // parent referencing
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
    }
}, {
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

// this will keep user restrict to give one review per tour
reviewSchema.index({tour:1, user:1}, {unique: true});

// Populating Reviews
reviewSchema.pre(/^find/, function(next){
    // this.populate({
    //     path: 'user',
    //     select: 'name photo'
    // }).populate({
    //     path: 'tour',
    //     select: 'name'
    // });

    this.populate({
        path: 'user',
        select: 'name photo'
    });
    next();
});

reviewSchema.statics.calcAverageRating = async function(tourId){
    // In this funciton this points to the model
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                numRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    // we have calculated the states now we need to persist avgRating and numRating in the Tour collection of the given tour ID
    // console.log(stats);
    if(stats.length > 0){
        await Tour.findByIdAndUpdate(tourId, {
            ratingsAverage: stats[0].avgRating,
            ratingsQuantity: stats[0].numRating
        });
    }else{
        await Tour.findByIdAndUpdate(tourId, {
            ratingsAverage: 0,
            ratingsQuantity: 4.5
        });
    }
};

reviewSchema.post('save', async function(){ // post middleware does not get the next because we dont need to call
    // here the this points to the current saved document
    // and we need to call the calcRatingAverage funciton here on Review model, and we created the modle below this, below is how we get acess to the model
    await this.constructor.calcAverageRating(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next){
    // console.log(this.getQuery()._id);
    this.tourId = (await this.model.findById(this.getQuery()._id)).tour; // here this will return the document by which we get the tourId
    next();
});
reviewSchema.post(/^findOneAnd/, async function(){
    // await this.findOne; does NOT work here, query has already executed
    await this.model.calcAverageRating(this.tourId);
    // console.log(this);
});

const Review = mongoose.model('Review', reviewSchema);


module.exports = Review;