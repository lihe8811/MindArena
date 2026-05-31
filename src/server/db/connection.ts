import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { getDatabaseUrl } from './config';
import * as schema from './schema';

const sql = neon(getDatabaseUrl());

export const db = drizzle(sql, { schema });
export type Database = typeof db;
