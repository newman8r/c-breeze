# Lessons Learned: Development and Deployment Workflows

## Environment Setup

### Local Development
- Local Supabase runs on default ports:
  - API: http://localhost:54321
  - Studio (Dashboard): http://localhost:54323
  - Database: Port 54322

- Start local Supabase:
  ```bash
  sudo npx supabase start
  ```

- Environment variables for local development go in `.env.development`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
  ```

### Production Environment
- Production Supabase instance is at `dryluaztyuofappqaqkp.supabase.co`
- Production frontend is deployed via Amplify to CloudFront (https://do2y0u8pyxvic.cloudfront.net)
- CloudFront Distribution ID: E2BLT641TVRPVQ

## Database Management

### Local Database
1. Create new migrations:
   ```bash
   sudo npx supabase migration new your_migration_name
   ```

2. Apply migrations locally:
   ```bash
   sudo npx supabase db reset
   ```

### Production Database
1. Push migrations to production:
   ```bash
   sudo npx supabase db push
   ```
   Note: This command requires the database password from the Supabase dashboard

2. Verify migrations:
   - Check tables/views in Supabase dashboard
   - Use the SQL editor in Supabase dashboard to verify schema

## Deployment Process

### Frontend Deployment
1. Deploy using Amplify CLI:
   ```bash
   cd frontend
   amplify push    # Updates backend resources
   amplify publish # Builds and deploys frontend
   ```

2. Clear CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id E2BLT641TVRPVQ --paths "/*" --profile gauntlet
   ```

## Common Pitfalls

### Environment Confusion
- Local development uses `.env.development` with localhost URLs
- Production uses environment variables set in Amplify
- Never mix production and local environment variables

### Database Schema Changes
- Always test migrations locally first with `supabase db reset`
- Push to production using `supabase db push`
- Verify changes in Supabase dashboard after pushing

### Deployment Issues
1. If changes aren't reflecting:
   - Check CloudFront cache
   - Create invalidation
   - Verify environment variables in Amplify

2. If database queries fail:
   - Verify migrations were pushed to production
   - Check table/view permissions in Supabase
   - Verify RLS policies

### Authentication
- Local development uses local Supabase auth
- Production uses production Supabase auth
- Auth tokens are not interchangeable between environments

## Best Practices

1. Database Changes:
   - Always create migrations for schema changes
   - Test migrations locally before pushing to production
   - Document RLS policies in migration files

2. Environment Management:
   - Keep separate `.env.development` and `.env.production` files
   - Never commit environment files
   - Use Amplify for production environment variables

3. Deployment:
   - Always invalidate CloudFront cache after deployment
   - Verify changes in production environment
   - Monitor logs for any errors

4. Local Development:
   - Always use `sudo` with Supabase commands
   - Keep local Supabase up to date
   - Reset database when switching branches

## Useful Commands Reference

### Local Development
```bash
# Start Supabase
sudo npx supabase start

# Stop Supabase
sudo npx supabase stop

# Reset local database
sudo npx supabase db reset

# Create new migration
sudo npx supabase migration new migration_name
```

### Production Deployment
```bash
# Deploy frontend
cd frontend
amplify publish

# Push database changes
sudo npx supabase db push

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id E2BLT641TVRPVQ --paths "/*" --profile gauntlet
```

### Troubleshooting
```bash
# Check Supabase status
sudo npx supabase status

# View local database
sudo npx supabase db dump

# Link to production (if needed)
sudo npx supabase link --project-ref dryluaztyuofappqaqkp
``` 