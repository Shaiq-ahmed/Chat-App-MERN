const nodemailer = require('nodemailer');
const smtpOptions = require('./nodeMailerConfig')

const sendEmail = async ({ to, subject, html }) => {
    // let testAccount = await nodemailer.createTestAccount()

    let transporter = nodemailer.createTransport(smtpOptions);
    transporter.verify(function (error, success) {
        if (error) {
            console.log(error);
        } else {
            console.log('Server is ready');
        }
    });
    const mailOptions = {
        from: 'sender@gmail.com', // Sender address
        to,
        subject,
        html
    };

    const info = await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
    })


}

module.exports = sendEmail