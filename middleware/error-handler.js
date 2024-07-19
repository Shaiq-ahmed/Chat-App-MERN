const { StatusCodes } = require('http-status-codes')

const errorHandlerMiddleware = (err, req, res, next) => {

    let customError = {
        //set Default
        StatusCode: err.StatusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        error: err.message || "Something went wrong, Please try again later",

    }
    if(err.name === 'ValidationError'){
        const errorValue = Object.values(err.errors)[0].message
        customError.error = errorValue
        customError.StatusCode = 400
    }
    if (err.code && err.code === 11000) {
        customError.error = `Duplicate value entered for ${Object.keys(
            err.keyValue
        )} field, Please choose another value`;
        customError.StatusCode = 400
    }
    if (err.name === 'CastError') {
        customError.error = `No item found with id:${err.value}`;
        customError.StatusCode = 404;
    }

    return res.status(customError.StatusCode).json({ error: customError.error })
}

module.exports = errorHandlerMiddleware