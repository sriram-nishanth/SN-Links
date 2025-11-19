import express from 'express';
import { sharePost } from '../controllers/chatcontroller.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/sharePost', sharePost);

export default router;
