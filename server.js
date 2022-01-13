const mongoose = require('mongoose');
const dotenv = require('dotenv'); // to use enviroment variable
dotenv.config({path: './config.env'}); // for configuring envirment variable

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('UNHANDLED EXCEPTION! 🥶 Shutting down...');
    process.exit(1);
});

const app = require('./app');


// console.log(process.env);

// Connecting to the altas database
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
// To connect to the local database use process.env.DATABASE_LOCAL (which is connection url to local database) instead of DB below 
mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true // if this is not there then there is a warning
}).then((con)=>{
    // console.log(con.connections);
    console.log('DB Connected Successful!');
});


// START SERVER
const port = process.env.PORT || 3000;

const server = app.listen(port, ()=>{
    console.log('App running on port 3000...');
}); 

process.on('unhandledRejection', err => { // unhandledRejection Event
 console.log(err.name, err.message);
 console.log('UNHANDLED REJECTION! 🥶 Shutting down...');
 server.close( () => {
    process.exit(1); // 0 code for successful exit, 1 for Unhandled Exceptions
 });
});


process.on('SIGTERM', ()=>{
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(()=>{
        console.log('🤢 Process terminated');
    });
});

