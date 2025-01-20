# Local Supabase Setup Guide

## Initial Setup

1. Start Supabase locally:
   ```bash
   npx supabase start
   ```
   This will:
   - Start all Supabase services in Docker
   - Create a local database
   - Set up authentication
   - Output your local credentials

2. Save the credentials:
   - Copy the credentials output to your `frontend/.env.development`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Note: We use `.env.development` for local development environment variables.

## Managing Migrations

1. Create a new migration:
   ```bash
   npx supabase migration new your_migration_name
   ```

2. Apply migrations:
   ```bash
   npx supabase db reset
   ```
   Note: This resets the database and reapplies all migrations

## Troubleshooting

If the local instance stops working:

1. Stop all services:
   ```bash
   npx supabase stop
   ```

2. Remove existing data (if needed):
   ```bash
   docker volume rm project2zen_db_data
   ```

3. Restart fresh:
   ```bash
   npx supabase start
   ```

4. Apply migrations:
   ```bash
   npx supabase db reset
   ```

## Important Notes

- Local Supabase runs on:
  - Main API: http://localhost:54321
  - Studio (Dashboard): http://localhost:54323
  - Database: Port 54322

- Default Ports:
  | Service | Port |
  |---------|------|
  | API     | 54321|
  | Studio  | 54323|
  | DB      | 54322|

- If you get port conflicts:
  1. Stop other Supabase instances
  2. Check for running Docker containers
  3. Modify ports in `supabase/config.toml` if needed

## Maintaining Local Data

- Database persists in Docker volume
- Reset database: `npx supabase db reset`
- Backup data: `npx supabase db dump`

## Development Workflow

1. Always start Supabase before development:
   ```bash
   npx supabase start
   ```

2. Check status:
   ```bash
   npx supabase status
   ```

3. After schema changes:
   ```bash
   npx supabase db reset
   ```

4. When finished:
   ```bash
   npx supabase stop
   ``` 