const sendEmail = require('./sendEmail')

const sendVerificationEmail = async ({ name, email, verificationToken, origin }) => {
    console.log('origin',origin)
    const verifyEmail = `${origin}/api/v1/auth/verify-email?token=${verificationToken}`

    const message = `<p>Please Confirm your email by clicking this link which is valid for only 1 hour : <a href="${verifyEmail}">Verify Email</a></p>`

    return sendEmail({
        to: email,
        subject: "Email Confirmation",
        html: `<h4>Hello, ${name}</h4>
        ${message}`,
    })
}

module.exports = sendVerificationEmail