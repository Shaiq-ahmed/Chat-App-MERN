const mongoose = require('mongoose')

const tokenSchema = new mongoose.Schema({
    refreshToken: { type: String, required: true },
    ip: { type: String, },
    userAgent: { type: String },
    isValid: { type: Boolean, default: true },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    }

},
    { timestamps: true })

module.exports = mongoose.model('Token', tokenSchema);