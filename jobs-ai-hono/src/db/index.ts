import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(env?: CloudflareBindings) {
  const binding = env?.DB ?? (globalThis as any).DB;
  return drizzle(binding, { schema });
}


