const mongoose = require('mongoose');
const validator = require('validator'); // for validating email
const bcrypt = require('bcryptjs'); // for encrypting password
const crypto = require('crypto'); // for creating password reset token


// creating Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        required: [true, 'Please provide a email'],
        unique: true,
        lowercase: true, // its not a validator, it just convert email into lowecase
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on CREATE and SAVE!!!
            validator: function(val) {
                return val === this.password;
            },
            message: 'Passwords are not the same'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// this pre query middleware dont allow non-active user to appear in search results
userSchema.pre(/^find/, function(next){
    // this points to the current query
    this.find({active: {$ne: false}});
    next();
});

// Saving encrypted Password into the database using bcryptjs and document middleware (pre save hook)
userSchema.pre('save', async function(next){
    // Only run this function when password is actually modified
    if(!this.isModified('password')) return next();
    
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    
    // Delete passwordConfirm field because we dont want to persist it in the database
    this.passwordConfirm = undefined;
    next();
});     

// If password is modified then add passwordChangedAt property to the database
userSchema.pre('save', function(next){
    if(!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// instence Method that will be available on all the documents
// This method check if the password provided is correct or not
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
};


// return true if the password is changed after a given time stamp
userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
    if(this.passwordChangedAt){
        const changedTimeStamp = parseInt(
            this.passwordChangedAt.getTime() / 1000, 
            10
        );

        return JWTTimeStamp < changedTimeStamp;
    }

    // false means PASSWORD NOT CHANGED AT ALL
    return false;
};

// Creating password reset token
userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};



// creating model using the schema or creating collection
const User = mongoose.model('User', userSchema);

module.exports = User;
