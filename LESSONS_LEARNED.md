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

## Database Migration Management

### Development vs Production

#### Development (`db reset`)
- Drops and recreates entire database
- Runs ALL migrations from scratch
- Applies seed data
- Used for clean slate development
- NEVER use in production

#### Production (`db push`)
- Checks `_supabase_migrations` table
- Only applies new, unapplied migrations
- Preserves existing data
- Safe for production use
- Migrations must be backward compatible

### Best Practices
1. **Migration Design**:
   - Always make migrations additive
   - Avoid destructive changes
   - Include rollback procedures
   - Test migrations on copy of production data

2. **Version Control**:
   - Never modify existing migrations
   - Always create new migrations for changes
   - Document migration dependencies
   - Keep migrations atomic and focused

3. **Testing Process**:
   ```bash
   # Development testing
   sudo npx supabase db reset
   
   # Production simulation
   sudo npx supabase db remote commit    # Commit current state
   sudo npx supabase db push             # Test migration process
   ```

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
- If encountering unexpected database behavior, check if all migrations have been applied using `supabase migration list`
- Pay attention to migrations that show up in LOCAL but not in REMOTE - these need to be applied

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

## Authentication State Management

### Common Issues with Supabase Auth

#### Multiple Client Instances
- **Symptom**: "Multiple GoTrueClient instances detected" warning in console
- **Impact**: Causes undefined behavior in auth state management
- **Detection**: 
  - Watch for auth state changes not propagating
  - Login/logout operations "hanging"
  - Multiple initialization logs in console

#### Auth State Race Conditions
- **Symptom**: Undefined user state alternating with defined state
- **Detection**: Console logs showing pattern like:
  ```
  User: undefined
  User: 123-456
  User: undefined
  User: 123-456
  ```

### Best Practices

1. **Client Instance Management**:
   ```typescript
   // Single instance pattern
   let browserClient = null
   export const createClient = () => {
     if (browserClient) return browserClient
     browserClient = createClientComponentClient()
     return browserClient
   }
   ```

2. **Auth State Handling**:
   - Use a single SessionProvider at root level
   - Handle auth state changes in one place
   - Clear all storage during sign out
   - Force page reload after auth state changes

3. **Development Environment**:
   - Add webpack polling for better dev experience:
   ```javascript
   webpack: (config) => {
     config.watchOptions = {
       poll: 1000,
       aggregateTimeout: 300,
     }
     return config
   }
   ```

### Troubleshooting Steps

1. **Auth State Issues**:
   - Check browser console for multiple client warnings
   - Verify single client instance pattern
   - Clear all browser storage and cookies
   - Force reload page

2. **Session Management**:
   - Verify session cookie presence
   - Check localStorage for Supabase items
   - Monitor auth state change events
   - Use browser dev tools Application tab

3. **Development Setup**:
   - Use proper webpack configuration
   - Enable strict mode in Next.js
   - Monitor for unnecessary re-renders

### Code Review Checklist

- [ ] Single Supabase client instance
- [ ] Proper auth state cleanup on logout
- [ ] Session provider at root level
- [ ] No direct supabase imports in components
- [ ] Proper error handling in auth operations

### Quick Fixes

1. **Hanging Auth Operations**:
   ```javascript
   // Force cleanup and reload
   localStorage.clear()
   sessionStorage.clear()
   window.location.href = '/'
   ```

2. **Multiple Clients**:
   - Remove direct supabase imports
   - Use createClient() utility
   - Check for duplicate providers

3. **Development Issues**:
   - Add webpack polling
   - Clear browser storage
   - Restart development server

Remember: Auth state management is critical for security. Always err on the side of forcing a clean state rather than trying to recover from an inconsistent one.

### Registration Flow Best Practices

#### Race Conditions with RLS and Auth State
- **Problem**: Role/Employee data access fails immediately after registration
- **Impact**: Users see errors or blank states when accessing RLS-protected data
- **Root Cause**: Auth context tries to fetch role data before database triggers complete

#### Solution Pattern
1. **Correct Registration Order**:
   ```typescript
   // ❌ Problematic Pattern
   1. Sign up and get session
   2. Create organization
   3. Try to access employee data (fails due to RLS)
   
   // ✅ Correct Pattern
   1. Sign up (without session)
   2. Create organization with service role
   3. Wait for triggers to complete
   4. Verify employee record exists
   5. Only then sign in to get session
   ```

2. **Helper Function for Trigger Completion**:
   ```typescript
   async function waitForTriggerCompletion(
     supabase: any,
     userId: string,
     orgId: string,
     maxAttempts = 10,
     delayMs = 1000
   ): Promise<boolean> {
     // Try multiple times with delay
     // Use both direct access and RPC calls
     // Refresh session periodically
   }
   ```

3. **Strategic Console Logging**:
   - Log each step of registration process
   - Include timing information
   - Log both success and failure states
   - Helps diagnose issues in production

#### Key Takeaways
1. Never assume database triggers complete instantly
2. Create all required records before setting auth session
3. Use service role client for initial setup
4. Verify record creation before proceeding
5. Add comprehensive logging for debugging

Remember: Auth state changes trigger context updates immediately. Ensure all required data exists before triggering these updates.

## Supabase Auth Token Handling

### Problem
When making requests to Supabase Edge Functions from frontend components, we encountered "No access token available" errors. This happened because components were using direct Supabase client imports instead of the shared client utility.

### Solution
1. Use the shared client utility:
```typescript
import { createClient } from '@/utils/supabase'

// Inside your function:
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
```

2. The shared utility in `utils/supabase.ts` maintains a singleton instance with proper session handling:
```typescript
let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export const createClient = () => {
  if (browserClient) return browserClient
  browserClient = createClientComponentClient<Database>()
  return browserClient
}
```

### Key Takeaways
- Never import Supabase client directly in components
- Always use the shared `createClient()` utility
- Create client instances inside functions, not at component level
- Check for session existence before making authenticated requests
- Handle auth errors gracefully

### Signs of This Issue
- "No access token available" errors
- Auth token undefined in requests
- Edge functions returning 401 unauthorized errors
- Inconsistent auth behavior between components

Remember: Auth state management is critical for security. Always err on the side of forcing a clean state rather than trying to recover from an inconsistent one.

## Next.js Static Export Issues

### Dynamic Routes with Static Export

#### Problem
When using `output: 'export'` in Next.js config, you may encounter this error:
```
Error: Page "/path/[param]/page" is missing param "value" in "generateStaticParams()", 
which is required with "output: export" config.
```

This occurs because static exports need to know all possible route parameters at build time.

#### Solution Pattern
1. **Implement `generateStaticParams`**:
```typescript
// In your [param]/page.tsx file
export async function generateStaticParams() {
  const supabase = createClient()
  
  // Fetch ALL possible parameter values
  const { data: items } = await supabase
    .from('your_table')
    .select('slug')
  
  // Return array of param objects
  return (items ?? []).map((item) => ({
    param: item.slug
  }))
}
```

2. **Key Requirements**:
   - Function must be at root level of page file
   - Must be named exactly `generateStaticParams`
   - Must return array with at least one parameter set
   - Parameter names must match route segments
   - Must handle database fetch errors gracefully

#### Common Pitfalls
- Missing `generateStaticParams` function
- Function returning empty array
- Parameter names not matching route segments
- Database query failing during build
- Function placed inside component instead of at root

#### Best Practices
1. Always test static builds locally before deployment:
   ```bash
   npm run build
   ```
2. Add error handling to database queries
3. Add console logs during build to verify params
4. Consider caching mechanism for large parameter sets
5. Keep route parameters list reasonable in size

Remember: Static exports need ALL possible routes at build time. If your dynamic routes come from database content, ensure your `generateStaticParams` function can access and return all possible values.

## Real-time Subscription Debugging

### Problem Context
When implementing real-time updates for ticket messages in the customer dashboard, we encountered several issues:
1. WebSocket updates weren't being received on the customer side
2. Employee dashboard subscriptions worked while customer subscriptions failed
3. Complex subscription filters caused errors with the WebSocket stream

### Investigation Process
1. First attempted to use direct `user_id` linking between customers and `auth.users`
2. Added RLS policies to simplify access control
3. Compared working employee dashboard subscription with customer dashboard
4. Discovered that complex subscription filters were causing issues:
   ```typescript
   // ❌ Problematic approach - complex filters
   .on('postgres_changes', {
     event: 'INSERT',
     schema: 'public',
     table: 'tickets',
     filter: `customer_email=eq.${session.user.email}`  // Invalid column error
   })

   // ✅ Working approach - rely on RLS
   .on('postgres_changes', {
     event: 'INSERT',
     schema: 'public',
     table: 'tickets'
   })
   ```

### Solution Pattern
1. **Remove Complex Filters**:
   - Don't try to filter in the subscription
   - Let Row Level Security (RLS) handle access control
   - Keep subscription setup simple and consistent

2. **RLS-First Approach**:
   ```sql
   -- Enable RLS on tables
   ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
   
   -- Create permissive policy for testing
   CREATE POLICY "Always allow" ON public.ticket_messages
   FOR ALL USING (true);
   ```

3. **Consistent Subscription Pattern**:
   ```typescript
   const channel = supabase
     .channel('customer-tickets')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'ticket_messages'
     })
     .subscribe()
   ```

### Key Takeaways
1. Supabase real-time filters should be simple
   - Complex filters with subqueries aren't supported
   - Use RLS for complex access control
   - Keep subscription parameters minimal

2. Debug real-time issues systematically:
   - Start with permissive RLS policies
   - Compare working vs non-working implementations
   - Check WebSocket stream for detailed error messages
   - Monitor browser console for subscription status

3. RLS and Real-time Work Together:
   - RLS policies automatically apply to real-time events
   - No need to duplicate access control in subscriptions
   - Subscriptions receive only the events RLS allows

4. Testing Strategy:
   - Test with permissive policies first
   - Gradually add restrictions
   - Monitor WebSocket messages in browser dev tools
   - Compare behavior across different user roles

Remember: When debugging real-time issues, start with the simplest possible configuration and gradually add complexity. Let RLS handle access control rather than trying to implement it in the subscription filters. 