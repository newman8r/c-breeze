# Audit Logs System

> **Location**: `supabase/migrations/20250126000001_create_audit_logs.sql`  
> **Created**: January 26, 2025  
> **Status**: Active  
> **Type**: Core System Feature

The audit logs system provides comprehensive tracking of all events and actions that occur within the application. It captures who did what, when, and how, making it invaluable for security monitoring, debugging, and compliance.

## Overview

The system is designed with the following key principles:
- Complete immutability of records
- Comprehensive event tracking
- Organization-level isolation
- Performance-optimized querying
- Flexible metadata storage

## Table Structure

The `audit_logs` table is designed to be immutable (no updates or deletes allowed) and captures detailed information about each event:

### Core Fields
- `event_id`: UUID - Unique identifier for each audit log entry
- `organization_id`: UUID - Reference to the organization (nullable for system-wide events)
- `timestamp`: timestamptz - When the event occurred
- `created_at`: timestamptz - When the audit log was created

### Actor Information
- `actor_id`: UUID - Reference to auth.users
- `actor_type`: ENUM ('employee', 'customer', 'ai', 'system')
- `ip_address`: inet - IP address of the actor
- `user_agent`: text - User agent string
- `session_id`: text - For grouping related actions
- `request_id`: text - For tracking specific HTTP requests

### Action Details
- `action_type`: ENUM ('create', 'read', 'update', 'delete', 'execute', 'other')
- `action_description`: text - Human-readable description
- `action_meta`: jsonb - Additional structured metadata about the action
- `resource_type`: ENUM - Type of resource being acted upon
- `resource_id`: UUID - ID of the affected resource
- `related_resources`: jsonb - Array of related resource references

### State Changes
- `details_before`: jsonb - Resource state before the action
- `details_after`: jsonb - Resource state after the action
- `ai_metadata`: jsonb - AI-specific metadata when applicable

### Performance & Diagnostics
- `client_info`: jsonb - Additional client metadata
- `duration_ms`: integer - Action duration in milliseconds
- `severity`: ENUM ('info', 'warning', 'error', 'critical')
- `status`: text ('success' or 'failure')
- `error_code`: text
- `error_message`: text

## Access Control

The audit logs implement Row Level Security (RLS) with the following policies:

1. **Organization Admins**
   - Can view audit logs for their organization
   - Must have 'admin' role in the organization

2. **Super Admins**
   - Can view system-level audit logs (where organization_id is NULL)
   - Must have is_root_admin = true

3. **Immutability**
   - No updates allowed
   - No deletes allowed
   - Inserts controlled through the log_audit_event function

## Implementation

### Database Objects

1. **Enums**
   ```sql
   CREATE TYPE public.actor_type AS ENUM ('employee', 'customer', 'ai', 'system');
   CREATE TYPE public.action_type AS ENUM ('create', 'read', 'update', 'delete', 'execute', 'other');
   CREATE TYPE public.severity_level AS ENUM ('info', 'warning', 'error', 'critical');
   ```

2. **Indexes**
   ```sql
   CREATE INDEX audit_logs_org_timestamp_idx ON public.audit_logs(organization_id, timestamp DESC);
   CREATE INDEX audit_logs_action_meta_gin_idx ON public.audit_logs USING gin (action_meta jsonb_path_ops);
   ```

## Usage

### Logging Events

Use the `log_audit_event` function to create audit logs. Required fields are:
- organization_id
- actor_type
- action_type
- resource_type

```sql
SELECT log_audit_event(
    _organization_id := 'org-uuid',
    _actor_type := 'employee',
    _action_type := 'create',
    _resource_type := 'ticket',
    _action_description := 'Created support ticket',
    _action_meta := '{"priority": "high"}'::jsonb
);
```

### Common Usage Patterns

1. **User Actions**
```sql
SELECT log_audit_event(
    _organization_id := org_id,
    _actor_id := user_id,
    _actor_type := 'employee',
    _action_type := 'update',
    _resource_type := 'ticket',
    _resource_id := ticket_id,
    _details_before := old_data,
    _details_after := new_data
);
```

2. **System Events**
```sql
SELECT log_audit_event(
    _organization_id := org_id,
    _actor_type := 'system',
    _action_type := 'execute',
    _resource_type := 'system',
    _severity := 'info',
    _action_description := 'Daily cleanup job completed'
);
```

3. **Error Logging**
```sql
SELECT log_audit_event(
    _organization_id := org_id,
    _actor_type := 'system',
    _action_type := 'execute',
    _resource_type := 'system',
    _severity := 'error',
    _status := 'failure',
    _error_code := 'ERR_001',
    _error_message := 'Failed to process payment'
);
```

## Performance Considerations

### Indexing Strategy
The table includes several indexes to optimize common query patterns:
- Organization + timestamp (DESC) for efficient log viewing
- GIN indexes on JSONB fields for efficient JSON querying
- Indexes on commonly filtered fields (status, severity, etc.)

### Query Optimization
- Use the composite index (organization_id, timestamp) for log viewing
- Utilize JSONB containment operators for metadata searches
- Consider partitioning if the table grows very large

## Best Practices

1. **Consistent Resource Types**
   - Use the predefined resource_type enum values
   - Each represents a major entity in the system

2. **Action Metadata**
   - Use action_meta for structured data about the action
   - Use action_description for human-readable summaries

3. **State Changes**
   - Capture both before/after states when possible
   - Store only relevant fields, not entire objects

4. **Error Handling**
   - Always set appropriate severity levels
   - Include error codes for systematic error tracking
   - Provide detailed error messages

5. **Performance Tracking**
   - Use duration_ms for long-running operations
   - Include client_info for client-side performance data

## Querying Examples

### Recent Activity for an Organization
```sql
SELECT 
    timestamp,
    actor_type,
    action_type,
    resource_type,
    action_description
FROM audit_logs
WHERE organization_id = 'org-uuid'
ORDER BY timestamp DESC
LIMIT 100;
```

### Error Analysis
```sql
SELECT 
    error_code,
    COUNT(*) as error_count,
    AVG(duration_ms) as avg_duration
FROM audit_logs
WHERE status = 'failure'
    AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY error_count DESC;
```

### User Activity Timeline
```sql
SELECT 
    timestamp,
    action_type,
    resource_type,
    action_description,
    status
FROM audit_logs
WHERE actor_id = 'user-uuid'
    AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

## Maintenance

### Data Retention
- Currently no automatic pruning of old logs
- Consider implementing a retention policy based on:
  - Age of logs
  - Organization requirements
  - Compliance needs

### Monitoring
- Monitor table size growth
- Watch for slow queries
- Track usage patterns

## Support

For issues or questions about the audit logs system:
1. Check this documentation first
2. Review the migration file
3. Test queries in a safe environment
4. Contact the backend team 