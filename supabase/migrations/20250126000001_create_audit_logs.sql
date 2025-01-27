/**
 * @description Creates audit log table to track all system events
 * @schema public
 * @tables audit_logs
 * @version 1.0.0
 * @date 2024-01-26
 * 
 * @security
 * - RLS policies for organization-based access
 * - Immutable records (no updates/deletes)
 */

-- Create enum for actor types
CREATE TYPE public.actor_type AS ENUM ('employee', 'customer', 'ai', 'system');

-- Create enum for action types
CREATE TYPE public.action_type AS ENUM ('create', 'read', 'update', 'delete', 'execute', 'other');

-- Create enum for resource types based on our existing entities
CREATE TYPE public.resource_type AS ENUM (
    'system',
    'organization',
    'employee',
    'customer',
    'ticket',
    'tag',
    'invitation',
    'profile',
    'user_settings',
    'api_key',
    'document'
);

-- Create enum for severity levels
CREATE TYPE public.severity_level AS ENUM ('info', 'warning', 'error', 'critical');

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    event_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id),
    timestamp timestamptz DEFAULT now() NOT NULL,
    actor_id uuid REFERENCES auth.users(id),
    actor_type actor_type NOT NULL,
    ip_address inet,
    user_agent text,
    action_type action_type NOT NULL,
    action_description text,
    action_meta jsonb,
    resource_type resource_type NOT NULL,
    resource_id uuid,
    related_resources jsonb DEFAULT '[]'::jsonb,
    details_before jsonb,
    details_after jsonb,
    ai_metadata jsonb,
    session_id text,
    request_id text,
    client_info jsonb DEFAULT '{}'::jsonb,
    duration_ms integer,
    severity severity_level DEFAULT 'info'::severity_level NOT NULL,
    status text CHECK (status IN ('success', 'failure')),
    error_code text,
    error_message text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_ip_address CHECK (ip_address::text ~ '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$')
);

-- Create indexes for common query patterns
CREATE INDEX audit_logs_organization_id_idx ON public.audit_logs(organization_id);
CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs(timestamp);
CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX audit_logs_resource_type_idx ON public.audit_logs(resource_type);
CREATE INDEX audit_logs_action_type_idx ON public.audit_logs(action_type);
CREATE INDEX audit_logs_status_idx ON public.audit_logs(status);
CREATE INDEX audit_logs_org_timestamp_idx ON public.audit_logs(organization_id, timestamp DESC);
CREATE INDEX audit_logs_action_meta_gin_idx ON public.audit_logs USING gin (action_meta jsonb_path_ops);
CREATE INDEX audit_logs_client_info_gin_idx ON public.audit_logs USING gin (client_info jsonb_path_ops);
CREATE INDEX audit_logs_severity_idx ON public.audit_logs(severity);
CREATE INDEX audit_logs_session_id_idx ON public.audit_logs(session_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Allow organization admins to view audit logs for their organization
CREATE POLICY "Organization admins can view their audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = audit_logs.organization_id
            AND e.role = 'admin'
        )
    );

-- Allow viewing system-level audit logs (no organization_id) for super admins
CREATE POLICY "Super admins can view system audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.is_root_admin = true
        )
        AND audit_logs.organization_id IS NULL
    );

-- Only allow system to insert audit logs (will be done through functions)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);  -- Will be controlled through function security

-- Prevent updates and deletes (audit logs are immutable)
CREATE POLICY "Audit logs are immutable"
    ON public.audit_logs
    FOR UPDATE
    USING (false);

CREATE POLICY "Audit logs cannot be deleted"
    ON public.audit_logs
    FOR DELETE
    USING (false);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    _organization_id uuid DEFAULT NULL,
    _actor_id uuid DEFAULT NULL,
    _actor_type actor_type DEFAULT NULL,
    _ip_address inet DEFAULT NULL,
    _user_agent text DEFAULT NULL,
    _action_type action_type DEFAULT NULL,
    _action_description text DEFAULT NULL,
    _action_meta jsonb DEFAULT NULL,
    _resource_type resource_type DEFAULT NULL,
    _resource_id uuid DEFAULT NULL,
    _related_resources jsonb DEFAULT '[]'::jsonb,
    _details_before jsonb DEFAULT NULL,
    _details_after jsonb DEFAULT NULL,
    _ai_metadata jsonb DEFAULT NULL,
    _session_id text DEFAULT NULL,
    _request_id text DEFAULT NULL,
    _client_info jsonb DEFAULT '{}'::jsonb,
    _duration_ms integer DEFAULT NULL,
    _severity severity_level DEFAULT 'info',
    _status text DEFAULT 'success',
    _error_code text DEFAULT NULL,
    _error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _event_id uuid;
BEGIN
    -- Validate required fields
    IF _organization_id IS NULL THEN
        RAISE EXCEPTION 'organization_id is required';
    END IF;
    
    IF _actor_type IS NULL THEN
        RAISE EXCEPTION 'actor_type is required';
    END IF;
    
    IF _action_type IS NULL THEN
        RAISE EXCEPTION 'action_type is required';
    END IF;
    
    IF _resource_type IS NULL THEN
        RAISE EXCEPTION 'resource_type is required';
    END IF;

    INSERT INTO public.audit_logs (
        organization_id,
        actor_id,
        actor_type,
        ip_address,
        user_agent,
        action_type,
        action_description,
        action_meta,
        resource_type,
        resource_id,
        related_resources,
        details_before,
        details_after,
        ai_metadata,
        session_id,
        request_id,
        client_info,
        duration_ms,
        severity,
        status,
        error_code,
        error_message
    )
    VALUES (
        _organization_id,
        _actor_id,
        _actor_type,
        _ip_address,
        _user_agent,
        _action_type,
        _action_description,
        _action_meta,
        _resource_type,
        _resource_id,
        _related_resources,
        _details_before,
        _details_after,
        _ai_metadata,
        _session_id,
        _request_id,
        _client_info,
        _duration_ms,
        _severity,
        _status,
        _error_code,
        _error_message
    )
    RETURNING event_id INTO _event_id;

    RETURN _event_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON TYPE public.actor_type TO anon, authenticated;
GRANT USAGE ON TYPE public.action_type TO anon, authenticated;
GRANT USAGE ON TYPE public.resource_type TO anon, authenticated;
GRANT USAGE ON TYPE public.severity_level TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated; 