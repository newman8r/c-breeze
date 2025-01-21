# Edge Functions

This directory contains our Supabase Edge Functions. Edge functions run on the edge (close to users) and are perfect for tasks like sending emails, processing webhooks, and other server-side operations.

## Structure

```
functions/
  ├── _shared/           # Shared code between functions
  │   ├── cors.ts        # CORS configuration
  │   └── types.ts       # Shared TypeScript types
  │
  ├── emails/            # Email-related functions
  │   ├── send/          # Generic email sender
  │   └── templates/     # Email templates
  │
  └── README.md          # This file
```

## Best Practices

1. **Environment Variables**
   - Store sensitive data (API keys, etc.) in `.env` files
   - Use different keys for development and production
   - Never commit `.env` files to git

2. **Error Handling**
   - Always return proper error responses
   - Log errors appropriately
   - Use consistent error formats

3. **Type Safety**
   - Use TypeScript for all functions
   - Define interfaces for request/response bodies
   - Share types between functions when possible

4. **Testing**
   - Test locally using `supabase functions serve`
   - Use the `--env-file` flag for local environment variables
   - Test both success and error cases

## Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Serve functions locally:
   ```bash
   supabase functions serve --no-verify-jwt --env-file .env
   ```

3. Test functions:
   ```bash
   curl -i --location --request POST 'http://localhost:54321/functions/v1/[function-name]' \
   --header 'Content-Type: application/json' \
   --data '{}'
   ```

## Deployment

1. Deploy a function:
   ```bash
   supabase functions deploy [function-name] --no-verify-jwt
   ```

2. Set production environment variables:
   ```bash
   supabase secrets set --env-file ./supabase/.env.production
   ```

## Email Functions

Our email functions use Resend for transactional emails. Each email type (invitation, notification, etc.) should:
1. Use a typed template from the `templates` directory
2. Include proper error handling
3. Be testable locally
4. Support both text and HTML versions 