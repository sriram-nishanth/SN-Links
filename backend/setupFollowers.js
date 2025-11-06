import mongoose from 'mongoose';
import User from './models/user.js';

async function setupFollowers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/Social-media');
    console.log('Connected to MongoDB');

    // Find users
    const john = await User.findOne({ email: 'john@example.com' });
    const jane = await User.findOne({ email: 'jane@example.com' });
    const bob = await User.findOne({ email: 'bob@example.com' });

    if (!john || !jane || !bob) {
      console.log('Users not found');
      return;
    }

    // Set up follower relationships
    // John is followed by Jane
    await User.findByIdAndUpdate(john._id, { $addToSet: { followers: jane._id } });
    await User.findByIdAndUpdate(jane._id, { $addToSet: { following: john._id } });

    // Jane is followed by Bob
    await User.findByIdAndUpdate(jane._id, { $addToSet: { followers: bob._id } });
    await User.findByIdAndUpdate(bob._id, { $addToSet: { following: jane._id } });

    console.log('Follower relationships set up successfully');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

setupFollowers();
