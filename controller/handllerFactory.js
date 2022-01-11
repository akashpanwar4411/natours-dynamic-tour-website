const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    // This also works await Model.findByIdAndDelete(req.params.id)
    const doc = await Model.findByIdAndDelete(req.params.id); 

    // if doc is null then send error
    if(!doc){
        return next(new AppError('No document exist with this ID!', 404));
    }

    res.status(204).json({
        status: "success",
        data: null
    });
});

exports.updateOne = Model => catchAsync( async (req, res, next)=>{

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    // if doc is null then send error
    if(!doc){
        return next(new AppError('No document exist with this ID!', 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            data: doc
        }
    });
} );

exports.createOne = Model => catchAsync( async (req, res, next) =>{
    /*
    // creating document previously
    const newdoc = new doc({
        name: 'The Park Camper',
        price: 256
    });
    newdoc.save().then().catch() 
    */

    // but now this time I will create document using doc.create()
    const doc = await Model.create(req.body);

    // status code 201 : created
    res.status(201).json({
        status: 'success',
        data: {
            data: doc
        }
    });
} );

exports.getOne = (Model, populateOptions) => catchAsync( async (req, res, next)=>{
    // doc.findById(req.params.id) is same as doc.findOne({ _id : req.params.id}) in mongoDB

    const doc = await Model.findById(req.params.id).populate(populateOptions);

    // if doc is null then send error
    if(!doc){
        return next(new AppError('No document exist with this ID!', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    }); 
} );

exports.getAll = Model =>  catchAsync( async (req, res, next)=>{
    // (hack )Simple hack for getting reviews by tour id / to allow for nested GET reviews on tour
    let filter = {};
    if(req.params.tourId) filter = {tour: req.params.tourId};

    // Build and EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
            doc
        }
    });
} );