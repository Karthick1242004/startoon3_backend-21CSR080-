const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3300;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  loginCount: { type: Number, default: 0 },       // Track the number of logins
  lastLogin: { type: Date, default: null }        // Track the most recent login date
}, { collection: 'users' });  

const User = mongoose.model('User', userSchema);

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ name });
    if (user && user.password === password) {
      user.loginCount += 1;
      user.lastLogin = new Date();
      await user.save();

      if (name === 'kamalesh' && password === 'kamalesh') {
        res.status(200).json({ message: 'Login successful', redirectTo: '/admin' });
      } else {
        res.status(200).json({ message: 'Login successful', redirectTo: '/User' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error logging in' });
  }
});
app.get('/graph/monthly-counts', async (req, res) => {
  try {
    const results = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$lastLogin" },
            month: { $month: "$lastLogin" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Format the results
    const formattedResults = results.map(result => ({
      month: `${result._id.year}-${result._id.month.toString().padStart(2, '0')}`,
      count: result.count
    }));

    res.status(200).json(formattedResults);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching monthly counts' });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email loginCount lastLogin');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
