/**
 * Prisma client singleton — one instance per process.
 * Used by routes and middleware to access the database.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
