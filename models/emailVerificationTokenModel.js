const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now, 
    },
});
TokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

const email_verification_tokens = mongoose.model('email_verification_tokens', TokenSchema);

module.exports = email_verification_tokens;