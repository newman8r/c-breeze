# Backend Architecture Guide (Supabase)

## Project Structure

```
supabase/
├── migrations/           # Database migrations
│   ├── YYYYMMDDHHMMSS_*.sql  # Timestamped migrations
│   └── README.md        # Migration documentation
├── functions/           # Edge functions
│   └── */              # Function directories
├── tests/              # Test files
│   ├── db/             # Database tests
│   └── functions/      # Edge function tests
├── seed/               # Seed data for development
└── config/             # Configuration files
```

## Documentation Standards

### SQL File Headers
Every SQL file should start with a standardized header:

```sql
/**
 * @description Brief description of what this file does
 * @schema public        # Primary schema this affects
 * @tables users, profiles  # Tables this migration touches
 * @version 1.0.0       # Version of this migration
 * @author Author Name  # Original author
 * @date 2024-01-20    # Creation date
 * 
 * @security
 * - RLS policies added/modified
 * - New roles created
 * - Permission changes
 * 
 * @dependencies
 * - Previous migration IDs if relevant
 * - Required extensions
 */
```

### Edge Function Headers
```typescript
/**
 * @function user-notification-handler
 * @description Handles user notification preferences and dispatch
 * @version 1.0.0
 * @author Author Name
 * 
 * @security
 * - Required roles: authenticated
 * - Rate limiting: 100/hour
 * 
 * @input
 * - user_id: UUID
 * - notification_type: string
 * 
 * @output
 * - success: boolean
 * - message: string
 */
```

## Local Development

### 1. Environment Setup

1. Local Supabase Instance:
   ```bash
   supabase start
   ```

2. Development Database:
   ```bash
   # Create development database
   supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres"
   ```

3. Environment Variables:
   ```bash
   # .env.local
   SUPABASE_URL="http://localhost:54321"
   SUPABASE_ANON_KEY="your-local-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-local-service-key"
   ```

### 2. Database Development

#### Migration Workflow

1. Create new migration:
   ```bash
   supabase migration new add_user_preferences
   ```

2. Test migration locally:
   ```bash
   supabase db reset
   ```

3. Verify changes:
   ```bash
   supabase db diff
   ```

#### Testing Strategy

1. Unit Tests (using pgTAP):
   ```sql
   -- tests/db/users_test.sql
   BEGIN;
   SELECT plan(3);  -- Number of tests

   SELECT has_table('public', 'users', 'Should have users table');
   SELECT has_column('public', 'users', 'email', 'Should have email column');
   SELECT col_is_pk('public', 'users', 'id', 'ID should be primary key');

   SELECT * FROM finish();
   ROLLBACK;
   ```

2. Run Tests:
   ```bash
   supabase test db
   ```

### 3. Security Best Practices

#### Row Level Security (RLS)

```sql
-- Example RLS policy
ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### Function Security

```sql
-- Secure function example
CREATE FUNCTION get_user_data(user_id UUID)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = user_id THEN
    RETURN QUERY SELECT * FROM users WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;
```

## Database Design Patterns

### 1. Table Structure

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users NOT NULL,
  -- Add additional fields
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Automatic updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Indexing Strategy

```sql
-- Composite index example
CREATE INDEX idx_profiles_user_status 
ON public.profiles (user_id, status)
WHERE status IS NOT NULL;
```

### 3. Soft Delete Pattern

```sql
ALTER TABLE public.profiles
ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE POLICY "Hide deleted profiles"
ON public.profiles
FOR SELECT
USING (deleted_at IS NULL);
```

## Edge Functions

### 1. Function Structure

```typescript
// functions/notification-handler/index.ts
import { serve } from 'https://deno.fresh.dev/server.ts'
import { createClient } from '@supabase/supabase-js'

interface NotificationRequest {
  user_id: string
  type: string
  message: string
}

serve(async (req) => {
  try {
    const { user_id, type, message } = await req.json() as NotificationRequest
    // Implementation
    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
```

### 2. Error Handling

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message)
  }
}

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.status }
    )
  }
  return new Response(
    JSON.stringify({ error: 'Internal Server Error' }),
    { status: 500 }
  )
}
```

## Production Deployment

### 1. Pre-deployment Checklist

- [ ] All tests passing locally
- [ ] RLS policies verified
- [ ] Migrations tested on staging
- [ ] Performance impact assessed
- [ ] Backup strategy confirmed

### 2. Deployment Process

```bash
# Link to production
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy edge functions
supabase functions deploy notification-handler
```

### 3. Monitoring

1. Set up database alerts:
   - Connection pool utilization
   - Slow queries (>1s)
   - Failed authentications

2. Log monitoring:
   - Edge function errors
   - RLS policy violations
   - Authentication events

## Getting Help

1. Check Supabase documentation
2. Review migration history
3. Test in local environment
4. Consult team documentation

# Backend Configuration

## Email Configuration
- Email Domain: breeze.help
- Email Provider: Resend
- Used for: User invitations, notifications, and system communications
- Verified Status: Domain verified via DNS 