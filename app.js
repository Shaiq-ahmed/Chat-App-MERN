require('dotenv').config();
const path = require('path')
const express = require(`express`);
const cors = require('cors');
const socketMiddleware = require('./middleware/socketMiddleware');
const connectDB = require('./db/connection')
const passport = require('passport');
require('./passport')

const app = express();

const cookieParser = require('cookie-parser')

const corsOptions = {
  origin: 'http://localhost:3000', //set client url 
  credentials: true,            //access-control-allow-credentials:true
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions));


// Database connection
connectDB(process.env.MONGO_URL)
// Initialize Passport
app.use(passport.initialize());


//routers
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const chatRoutes = require("./routes/chatRoutes")
const messageRoutes = require("./routes/messageRoutes.js")


//middleware
const notFoundMiddleware = require('./middleware/not-found')
const errorHandlerMiddleware = require('./middleware/error-handler');
const morgan = require('morgan');


app.use(morgan('tiny'))
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('testing route')
})


app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/user', userRoutes)
app.use('/api/v1/chat', chatRoutes)
app.use('/api/v1/messages', messageRoutes)



app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
// app.use(socketMiddleware(io));


module.exports = app

