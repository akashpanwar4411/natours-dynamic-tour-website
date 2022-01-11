const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({path: './config.env'});

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then((con)=>{
    // console.log(con.connections);
    console.log('DB Connection Successful!');
});

// Import Data into Collection
const importData = async function(){
    try{

        await Tour.create(tours, {validateBeforeSave: false});
        await User.create(users, {validateBeforeSave: false});
        await Review.create(reviews, {validateBeforeSave: false});
        console.log('Data Imported Successfully!');
    }catch(err){
        console.log(err);
    }
    process.exit();
};
// Delete All the Data from Collection
const deleteData = async function(){
    try{

        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        console.log('Data Deleted Successfully!');
    }catch(err){
        console.log(err);
    }
    process.exit();
};

if(process.argv[2] === '--import'){
    importData();
}
else if(process.argv[2] === '--delete'){
    deleteData();
}
// console.log(process.argv);