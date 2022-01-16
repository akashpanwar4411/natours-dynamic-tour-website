import '@babel/polyfill';
import {login, logout} from './login';
import {displayMap} from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alert';
import { signup } from './signup';


// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const formUserData = document.querySelector('.form-user-data');
const formUserPassword = document.querySelector('.form-user-password');
const bookTourBtn = document.getElementById('book-tour');
const alertMessage = document.querySelector('body').dataset.alert;
const signupForm = document.querySelector('.form--signup');

// DELEGATION 
if(alertMessage) showAlert('success', alertMessage, 10); // showing alert using dataset in base.pug body

if(mapBox){
    const locations = JSON.parse(mapBox.dataset.location);

    displayMap(locations);
}

if(loginForm){
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}

if(signupForm){
    signupForm.addEventListener('submit', e =>{
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;

        signup({name, email, password, passwordConfirm});
    });
}

if(logOutBtn){
    logOutBtn.addEventListener('click', logout);
} 

if(formUserData){
    formUserData.addEventListener('submit', e => {
        e.preventDefault();
        const form = new FormData();
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        form.append('photo', document.getElementById('photo').files[0]);
        // console.log(form);
        updateSettings(form, 'data');
    });
}

if(formUserPassword){
    formUserPassword.addEventListener('submit', async e=>{
        e.preventDefault();

        document.querySelector('.password-submit-btn').textContent = '...UPDATING';

        const passwordCurrent = document.getElementById('password-current').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const password = document.getElementById('password').value;
        
        await updateSettings({passwordCurrent, passwordConfirm, password}, 'password');
        
        document.querySelector('.password-submit-btn').textContent = 'SAVE PASSWORD';
        document.getElementById('password-current').value = '';
        document.getElementById('password-confirm').value = '';
        document.getElementById('password').value = '';
    });
}

if(bookTourBtn){
    bookTourBtn.addEventListener('click', e =>{
        e.target.textContent = 'Processing...';
        const {tourId} = e.target.dataset;
        bookTour(tourId);
    });
}