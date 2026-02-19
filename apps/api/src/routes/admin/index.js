/**
 * Admin routes — mount under /admin.
 * /admin/auth/login, /admin/businesses
 */

import { Router } from 'express';
import adminAuth from './auth.js';
import adminBusinesses from './businesses.js';
import adminStats from './stats.js';
import adminArchives from './archives.js';

const router = Router();
router.use('/auth', adminAuth);
router.use('/stats', adminStats);
router.use('/businesses', adminBusinesses);
router.use('/archived-businesses', adminArchives);

export default router;
