import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL ?? process.env.MYSQL_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or MYSQL_URL must be set. Did you forget to provision a MySQL database?",
  );
}

export const pool = createPool(connectionString);
export const db = drizzle(pool, { schema });
