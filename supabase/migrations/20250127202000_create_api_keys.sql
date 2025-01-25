-- Rename migration to: 20250127202000_create_api_keys.sql
-- Create API keys table
create table if not exists api_keys (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid not null references organizations(id) on delete cascade,
    employee_id uuid not null references employees(id) on delete cascade,
    description text not null,
    key_hash text not null,  -- Store the hashed version of the key
    key_last_four text not null,  -- Store last 4 digits for identification
    created_at timestamptz default now() not null,
    last_used_at timestamptz,
    status text not null check (status in ('active', 'revoked')),
    revoked_at timestamptz,
    revoked_by uuid references employees(id) on delete set null,
    metadata jsonb default '{}'::jsonb
);

-- Add RLS policies
alter table api_keys enable row level security;

-- Policy for employees to view their organization's API keys
create policy "Employees can view their organization's API keys"
    on api_keys for select
    using (
        organization_id in (
            select organization_id 
            from employees 
            where user_id = auth.uid()
        )
    );

-- Policy for employees to create API keys
create policy "Employees can create API keys"
    on api_keys for insert
    with check (
        organization_id in (
            select organization_id 
            from employees 
            where user_id = auth.uid()
        )
        and
        employee_id in (
            select id 
            from employees 
            where user_id = auth.uid()
        )
    );

-- Policy for employees to revoke their own API keys
create policy "Employees can revoke their own API keys"
    on api_keys for update
    using (
        employee_id in (
            select id 
            from employees 
            where user_id = auth.uid()
        )
    )
    with check (
        status = 'revoked'
        and
        employee_id in (
            select id 
            from employees 
            where user_id = auth.uid()
        )
    );

-- Add indexes for performance
create index api_keys_organization_id_idx on api_keys(organization_id);
create index api_keys_employee_id_idx on api_keys(employee_id);
create index api_keys_status_idx on api_keys(status);

-- Create function to verify API key
create or replace function verify_api_key(key_to_verify text)
returns table (
    is_valid boolean,
    organization_id uuid,
    employee_id uuid
) 
language plpgsql
security definer
as $$
begin
    -- Hash the provided key using the same method we'll use when creating keys
    -- Note: Implementation will depend on the hashing method chosen
    return query
    select 
        true as is_valid,
        ak.organization_id,
        ak.employee_id
    from api_keys ak
    where ak.key_hash = crypt(key_to_verify, ak.key_hash)
    and ak.status = 'active'
    limit 1;
    
    -- If no results found, return false
    if not found then
        return query select false, null::uuid, null::uuid;
    end if;
end;
$$; 