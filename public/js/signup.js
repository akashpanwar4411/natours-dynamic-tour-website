import axios from "axios";
import { showAlert } from "./alert";

export const signup = async userData =>{
    try{
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/signup',
            data: {
                name: userData.name,
                email: userData.email,
                password: userData.password,
                passwordConfirm: userData.passwordConfirm
            }
        });

        if(res.data.status === 'success'){
            showAlert('success', 'Signup Successfull!');
            window.setTimeout(()=>{
                location.assign('/');
            }, 1500);
        }

    }catch(err){
        showAlert('error', err.response.data.message);
    }
};