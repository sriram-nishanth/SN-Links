import mongoose from 'mongoose';
import User from './models/user.js';
import bcrypt from 'bcrypt';

async function createSampleUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/Social-media');
    console.log('Connected to MongoDB');

    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('Users already exist in database');
      await mongoose.disconnect();
      return;
    }

    // Hash password for all users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create sample users
    const users = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        bio: 'Hello, I am John!',
        profileImage: 'https://via.placeholder.com/150'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        bio: 'Hi, I am Jane!',
        profileImage: 'https://via.placeholder.com/150'
      },
      {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        password: hashedPassword,
        bio: 'Hey, I am Bob!',
        profileImage: 'https://via.placeholder.com/150'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created users:');
    console.log(JSON.stringify(createdUsers.map(u => ({ name: u.name, email: u.email, _id: u._id })), null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createSampleUsers();
