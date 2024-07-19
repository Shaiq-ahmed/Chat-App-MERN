const sendEmail = require('./sendEmail')

const sendVerificationEmail = async ({ name, email, token, origin }) => {

    const verifyEmail = `${origin}/api/v1/auth/reset-password?token=${token}`

    const message = `<p>Please click the below link to reset your password, the link will be valid for 1 hour: </p>
    <p><a href="${verifyEmail}">Reset Password</a></p>`


    return sendEmail({
        to: email,
        subject: "Sign-up Verification API - Reset Password",
        html: `<h4>Hello, ${name}</h4>
        ${message}`,
    })
}

module.exports = sendVerificationEmail