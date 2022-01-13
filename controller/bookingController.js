const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // so we get the object here

const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handllerFactory');
const Booking = require('../models/bookingModel');

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

exports.getCheckoutSession = catchAsync(async (req, res, next) =>{
    // 1) Get the Currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
        // success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
            {
                name: `${tour.name} Tour`,
                description: tour.summary,
                images: [ `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}` ],
                amount: tour.price * 100,
                currency: 'INR',
                quantity: 1
            }
        ]
    });

    // 3) Create session as response
    res.status(200).json({
        status: 'success',
        session
    });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next)=>{
//     // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
//     const {tour, user, price} = req.query;
    
//     if(!tour && !user && !price) return next();

//     await Booking.create({tour, user, price});

//     res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session, next) =>{
    try{

        const tour = session.client_reference_id;
        const user = (await User.findOne({email: session.customer_email}) )._id;
        const price = session.amount_total / 100;
        await Booking.create({tour, user, price});
    }catch(err){
        console.log(`🥶 Error`, err.message);
    }
};

exports.webhookCheckout = (req, res, next) =>{
    const signature = req.headers['stripe-signature'];

    let event;
    try{
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    }catch(err){
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if(event.type === 'checkout.session.completed')
        createBookingCheckout(event.data.object, next);

    res.status(200).json({ recived: true });
};