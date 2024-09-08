module.exports = {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user:  process.env.EMAIL_USERNAME, 
        pass: process.env.EMAIL_PASSWORD
    }
}