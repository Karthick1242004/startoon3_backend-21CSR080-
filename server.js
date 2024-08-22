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
  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null }
}, { collection: 'users' });

const adminSchema = new mongoose.Schema({
  name: String,
  password: String
}, { collection: 'admins' });

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

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
      res.status(200).json({ message: 'Login successful', redirectTo: '/User' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.post('/admin/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const hardcodedAdmin = {
      name: 'admin@email.com',
      password: 'Admin@123'
    };

    if (name === hardcodedAdmin.name && password === hardcodedAdmin.password) {
      res.status(200).json({ message: 'Login successful', redirectTo: '/Admin' });
    } else {
      console.log(`Invalid credentials: Name - ${name}, Password - ${password}`);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ error: 'Error logging in' });
  }
});


app.get('/graph/monthly-counts', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const results = await User.aggregate([
      {
        $match: {
          lastLogin: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$lastLogin" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.month": 1 }
      }
    ]);

    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${(i + 1).toString().padStart(2, '0')}`,
      count: 0
    }));

    results.forEach(result => {
      const monthIndex = result._id.month - 1;
      allMonths[monthIndex].count = result.count;
    });

    res.status(200).json(allMonths);
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
