const mongoose = require("mongoose");
// const validateExtraFields = require("../middleware/validatorMiddleware");

const chatSchema = new mongoose.Schema({
    chatName: {
        type: String,
        trim: true,
    },
    isGroupChat: {
        type: Boolean,
        default: false,

    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },


    ],
    groupName: { type: String, 
        required:[function () { return this.isGroupChat; } , 'Please provide a name for the group chat'],
    },
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

},
    {
        timestamps: true
    }

)
// validateExtraFields(chatSchema)

module.exports = mongoose.model('Chat', chatSchema);