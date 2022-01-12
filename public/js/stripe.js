import axios from 'axios';
import {showAlert} from './alert.js';

const stripe = Stripe('pk_test_51KEoIsSBNPK5ySs0AS3Cvdr8jD68e0v55j2YCtpCj8PkueAmv1MLocd8M0BuFNKUGFzhKMNhlnj44mnVAKweC6Yt00rZC1ynpv'); // passing public key

export const bookTour = async (tourId) => {
    try{
        // 1) Get checkout session from API
        const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
        console.log('session', session);

        // 2) Create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });

    }catch(err){
        console.log(err);
        showAlert('error', err);
    }
};
