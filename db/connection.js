const mongoose = require('mongoose')


const connectionDB = ()=>{
    // console.log(process.env.MONGO_URL)
    mongoose.connect(process.env.MONGO_URL)
    .then((data)=>{
        console.log(`mongodb is connected to the server: ${data.connection.host}`)
    }).catch((error)=>{
        console.log(`connection error: ${error}`)
    })
}

module.exports = connectionDB