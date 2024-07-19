const mongoose = require('mongoose');

const PasswordSchema = new mongoose.Schema({
    passwordToken:{
        type: String,
        required:true
    },
    email:{
        type: String,
        required:true
    },
    createdAt: {
        type: Date,
        default: Date.now, 
    },
});
PasswordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 })

const password_verification_tokens = mongoose.model('password_verification_tokens', PasswordSchema);

module.exports = password_verification_tokens;