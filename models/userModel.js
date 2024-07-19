const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        minLength: [3, 'Length must be greater than 2'],
        maxLength: [50, 'Length must be less than 50'],
        index:true
    },
    email: {
        type: String,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: 'Please provide a valid email',
        },
        index:true
    },

    password: {
        type: String,
        // required: true,
        select: false, // Password won't be selected by default
    },

    provider: {
        type: String,
        enum: ['local', 'google', 'facebook'], // Add other providers as needed
        default: 'local', // Default to local authentication
    },

    lastSeen: {
        type: Date,
        default: Date.now,
    },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    friendRequests: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
    }],

    avatar: {
        type: String,
    },

    phone_no: {
        type: String,
        minLength: [9, 'Phone number length must be greater than 9'],
        maxLength: [11, 'Phone number length must be less than 11'],
    },

    bio :{
        type : String,
        default: "Hey, Looking busy let's talk!"
    },

    providerId: String,

    role: { type: String, enum: ["admin", "user"], default: "user" },

    isVerified: {
        type: Boolean,
        default: false,
    },

    verified: Date,

    status: {
        type: String,
        default: 'pending',
    },
},
    { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (password) {
    const isMatch = await bcrypt.compare(password, this.password);
    return isMatch;
};



module.exports = mongoose.model("User", userSchema);

