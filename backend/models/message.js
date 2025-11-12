import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    // Only required for text messages
    required: function() { return this.messageType === 'text'; },
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'shared_post'],
    default: 'text'
  },
  media: {
    type: String, // URL for media files
    default: null,
    // Required for image/video messages
    required: function() { return ['image', 'video'].includes(this.messageType); }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  seen: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

// Prevent recompilation in hot-reload/serverless environments
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
