## MySQL Migration Strategy (Phase 2)

This project has been adapted from PostgreSQL-oriented Drizzle config to MySQL-compatible config.

### 1) Provision target MySQL database
- Create a new MySQL instance/schema for this project.
- Set either `DATABASE_URL` or `MYSQL_URL` to the MySQL connection string.

Example DSN:
- `mysql://user:password@host:3306/asset_linker`

### 2) Generate baseline MySQL migrations from current schema
- Run: `npx drizzle-kit generate --config drizzle.config.ts`
- Review SQL output in `migrations/` for table and column definitions.

### 3) Apply schema to MySQL
- Preferred for greenfield DB: `npm run db:push`
- Preferred for controlled rollout: run generated migration SQL through your migration pipeline.

### 4) Data migration from existing PostgreSQL (if applicable)
- Export PostgreSQL data to CSV/JSON per table.
- Transform values where needed:
  - timestamp/date precision differences
  - boolean representation
  - text/varchar length constraints
- Import into MySQL tables in dependency-safe order.

### 5) Validate after cutover
- Verify row counts and key records for: `users`, `materials`, `medicine_batches`, `transfers`, `authenticity_reports`, `feedback`.
- Smoke test auth flow and role-restricted APIs.

### Notes on schema parity
- Table names and domain entities are preserved.
- Primary key pattern remains auto-increment integer IDs.
- Batch IDs and status fields are retained; some columns moved from unbounded `text` to bounded `varchar` for MySQL index safety.
