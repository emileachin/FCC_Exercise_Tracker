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
  const id = req.params.id;
  const description = req.body.description;
  const duration = Number(req.body.duration);
  let date = req.body.date ? new Date(req.body.date) : new Date();

  // If date is invalid, use current date
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  User.findById(id).then(user => {
    if (!user) return res.status(404).json({ error: "User not found" });

    const logEntry = { description, duration, date };
    user.log.push(logEntry);

    user.save().then(() => {
      res.json({
        _id: user._id,
        username: user.username,
        date: date.toDateString(),
        duration: duration,
        description: description
      });
    });
  }).catch(() => res.status(400).json({ error: "Invalid user id" }));
});

app.get("/api/users/:id/logs", (req, res) => {
  const id = req.params.id;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;

  User.findById(id).then(user => {
    if (!user) return res.status(404).json({ error: "User not found" });

    let log = user.log;

    if (from && !isNaN(from)) {
      log = log.filter(entry => entry.date >= from);
    }
    if (to && !isNaN(to)) {
      log = log.filter(entry => entry.date <= to);
    }
    if (limit && !isNaN(limit)) {
      log = log.slice(0, limit);
    }

    log = log.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    });
  }).catch(() => res.status(400).json({ error: "Invalid user id" }));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
