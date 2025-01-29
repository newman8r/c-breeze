-- Create ticket_analysis table for storing AI analysis results
create type ticket_analysis_status as enum ('pending', 'processing', 'completed', 'error');

create table ticket_analysis (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references tickets(id) on delete cascade,
    organization_id uuid not null references organizations(id),
    vector_search_results jsonb,
    processing_results jsonb,
    response_generation_results jsonb,
    status ticket_analysis_status not null default 'pending',
    error_message text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Add indexes for common queries
create index ticket_analysis_ticket_id_idx on ticket_analysis(ticket_id);
create index ticket_analysis_organization_id_idx on ticket_analysis(organization_id);
create index ticket_analysis_status_idx on ticket_analysis(status);

-- Add RLS policies
alter table ticket_analysis enable row level security;

create policy "Organizations can view their own ticket analysis"
    on ticket_analysis for select
    using (
        organization_id in (
            select org.id from organizations org
            inner join employees emp on emp.organization_id = org.id
            where emp.user_id = auth.uid()
        )
    );

create policy "Organizations can update their own ticket analysis"
    on ticket_analysis for update
    using (
        organization_id in (
            select org.id from organizations org
            inner join employees emp on emp.organization_id = org.id
            where emp.user_id = auth.uid()
        )
    );

-- Add realtime replication
alter publication supabase_realtime add table ticket_analysis;

-- Add trigger for updated_at
create trigger set_ticket_analysis_updated_at
    before update on ticket_analysis
    for each row
    execute function update_updated_at_column(); 