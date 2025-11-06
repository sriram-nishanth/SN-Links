import express from 'express';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  getConversations
} from '../controllers/messagecontrollers.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// Get recent conversations
router.get('/conversations', getConversations);

// Get messages between current user and another user
router.get('/:userId', getMessages);

// Send a message
router.post('/', sendMessage);

// Mark messages as read from a specific user
router.put('/read/:senderId', markMessagesAsRead);

// Get unread message count
router.get('/unread/count', getUnreadCount);

export default router;
