const { StatusCodes } = require('http-status-codes');
const User = require('../models/userModel');



const getUserProfile = async (req, res) => {
    try {
        const user_id = req.user.id

        const user = await User.findById(user_id).select("name phone_no email createdAt")
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" })
        }
        return res.status(StatusCodes.OK).json(user)

    } catch (error) {
        console.log(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong, Please try again later" });
    }
}

const UpdateUserProfile = async (req, res, next) => {
    try {
        // const { name, phone_no, avatar } = req.body

        // TODO : add image update logic with conditions

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
        }

        const updatedUser = await User.findOneAndUpdate(
            { _id: req.user.id },
            { $set: { name: req.body.name, phone_no: req.body.phone_no } },
            { runValidators: true, projection: { name: 1, phone_no: 1, email: 1, avatar: 1, createdAt: 1 } } // Return updated document and enforce validation
        );

        if (!updatedUser) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Update failed" });
        }

        return res.status(StatusCodes.OK).json({ message: "Profile has been updated", user: updatedUser });


    } catch (error) {
        console.log(error);
        next(error)
        // res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong, Please try again later" });
    }
}

const updatePassword = async (req, res) => {
    try {
        const { old_password, new_password, confirm_password } = req.body
        if (!old_password || !new_password || !confirm_password) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Provide all required fields " })
        }

        const user = await User.findOne({ _id: req.user.id }).select('+password')

        const isPasswordMatched = await user.comparePassword(old_password)
        if (!isPasswordMatched) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid Password" })
        }
        if (new_password !== confirm_password) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "new and confirm password do not match" })
        }

        user.password = new_password
        await user.save()
        res.status(StatusCodes.OK).json({ msg: "Password has been updated successfully!" })
    } catch (error) {
        console.log(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong, Please try again later" });
    }

}

const searchUsers = async (req, res) => {
    try {
        const { name, email } = req.query;

        const searchCriteria = {
            $and: [
                { _id: { $ne: req.user.id } },
                {
                    $or: [
                        { name: { $regex: name, $options: 'i' } }, 
                        { email: { $regex: email, $options: 'i' } }
                    ]
                }
            ]
        };

        const users = await User.find(searchCriteria).populate({ _id: 1, name: 1, email: 1, avatar: 1 })

        return { users }


    } catch (error) {
        console.log(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong, Please try again later" });
    }

}

module.exports = {
    getUserProfile,
    updatePassword,
    UpdateUserProfile,
    searchUsers
}
