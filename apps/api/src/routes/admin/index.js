/**
 * Admin routes — mount under /admin.
 * /admin/auth/login, /admin/businesses
 */

import { Router } from 'express';
import adminAuth from './auth.js';
import adminBusinesses from './businesses.js';

const router = Router();
router.use('/auth', adminAuth);
router.use('/businesses', adminBusinesses);

export default router;
