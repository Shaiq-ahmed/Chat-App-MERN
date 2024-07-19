const asyncHandler = require("express-async-handler");
const { isTokenValid } = require("../utils/jwt");
const { StatusCodes} = require('http-status-codes')

exports.isAuthenticatedUser = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    try {
        let accessToken;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }

        if (!accessToken) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Authentication token is missing' });
        }

        const payload = isTokenValid(accessToken);

        // Attach the user and their permissions to the req object
        req.user = {
            id: payload.userId,
            role: payload.role
        }

        next();
    } catch (error) {
        console.error(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Session has expired, please log in again' });
        }
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
    }
});



exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Unauthorized to access this resource ' })
            );
        }

        next();
    };
};