import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL ?? process.env.MYSQL_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL or MYSQL_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: dbUrl,
  },
});
