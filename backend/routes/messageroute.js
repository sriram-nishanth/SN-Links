import express from 'express';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  markAsSeen,
  getUnreadCount,
  getConversations,
  uploadFile,
  upload,
  clearMessages
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

// Upload file
router.post('/upload', upload.single('file'), uploadFile);

// Mark messages as seen (viewed)
router.put('/markAsSeen', markAsSeen);

// Mark messages as read from a specific user
router.put('/read/:senderId', markMessagesAsRead);

// Get unread message count
router.get('/unread/count', getUnreadCount);

// Clear all messages from a conversation
router.delete('/:conversationId/clear', clearMessages);

export default router;
