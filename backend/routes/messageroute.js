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

// Specific routes BEFORE dynamic routes
router.get('/conversations', getConversations);
router.post('/upload', upload.single('file'), uploadFile);
router.put('/markAsSeen', markAsSeen);
router.put('/read/:senderId', markMessagesAsRead);
router.get('/unread/count', getUnreadCount);
router.delete('/:conversationId/clear', clearMessages);

// Dynamic routes AFTER specific routes
router.post('/', sendMessage);
router.get('/:userId', getMessages);

export default router;
