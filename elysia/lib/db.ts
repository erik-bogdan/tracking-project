import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./../database/schema"    
import { Pool } from 'pg';


const pool = new Pool({
    connectionString: process.env.DATABASE_URL!
  })
  
export const db = drizzle(process.env.DATABASE_URL!, { schema });