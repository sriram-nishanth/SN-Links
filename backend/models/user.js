import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function() {
            return this.provider !== 'google';
        }
    },
    googleId: {
        type: String,
        sparse: true
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    profileImage: {
        type: String,
        default: ''
    },
    coverImage: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    online: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add method to generate token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { userId: this._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Check if model already exists to prevent recompilation
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;