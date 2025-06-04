const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const body_parser = require('body-parser')
require('mongodb')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true}).then(() => {
  console.log('Connected to MongoDB')
}).catch(err => {
  console.error('MongoDB connection error:', err)
})

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  log: [{
    description: { type: String },
    duration: { type: Number },
    date: { type: Date, default: Date.now }
  }]
})

const User = mongoose.model('User', userSchema)

app.use(cors())
app.use(body_parser.urlencoded({ extended: false, }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let username = req.body.username

  const newUser = new User({username: username})
  newUser.save().then((user) => {
    res.json({ username: username, _id: user._id })
  })
  .catch(err => {
    res.status(400).json({ error: 'Username already exists' })
  })
})

app.get("/api/users", (req, res, next) => {
    User.find({})
    .then((users) => {
      res.json(users)
    })
  })

app.post("/api/users/:id/exercises", (req, res) => {
  const id = req.params.id
  const description = req.body.description
  const duration = Number(req.body.duration)
  const date = new Date(req.body.date)

  User.findById(id).then(user => {
    const logEntry = {
      description, duration, date
    }
    user.log.push(logEntry)

    user.save().then(() => {
      res.json({
        _id: user._id,
        username: user.username,
        date: date.toDateString(),
        duration: duration,
        description: description
      })
    })

  })
})

app.get("/api/users/:id/logs", (req, res) => {
  const id = req.params.id

  User.findById(id).then(user => {
    const log = user.log.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toDateString()
    }))
    res.json({
      _id: id,
      username: user.username,
      count: log.length,
      log: log
    })
  })
})

app.get("/api/users/:id/logs?", (req, res) => {
  const id = req.params.id
  const from = new Date(req.query.from)
  const to = new Date(req.query.to)
  const limit = parseInt(req.query.limit)

  User.findById(id).then(user => {
    let log = user.log
    if (from) {
      log = log.filter(entry => entry.date >= from)
    }
    if (to) {
      log = log.filter(entry => entry.date <= to)
    }
    if (limit) {
      log = log.slice(0, limit)
    }
    log = log.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toDateString()
    }))
    res.json({
      _id: id,
      username: user.username,
      count: log.length,
      log: log
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
