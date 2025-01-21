/**
 * @description Creates core ticketing system tables including customers, tags, tickets, and ticket_tags
 * @schema public
 * @tables customers, tags, tickets, ticket_tags
 * @version 1.0.0
 * @date 2024-01-21
 * 
 * @security
 * - RLS policies for all tables
 * - Customers linked to organizations
 * - Tickets linked to customers, organizations, and employees
 * 
 * @dependencies
 * - Requires organizations and employees tables
 */

-- Create customers table
CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    contact_info jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now() NOT NULL,
    last_login_at timestamptz,
    UNIQUE(email, organization_id)
);

-- Create indexes for customers
CREATE INDEX customers_organization_id_idx ON public.customers(organization_id);
CREATE INDEX customers_email_idx ON public.customers(email);

-- Create tags table
CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, name)
);

-- Create index for tags
CREATE INDEX tags_organization_id_idx ON public.tags(organization_id);

-- Create tickets table
CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    customer_id uuid REFERENCES public.customers(id) NOT NULL,
    assigned_to uuid REFERENCES public.employees(id),
    title text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    priority text NOT NULL DEFAULT 'medium',
    category text,
    source text,
    due_date timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES public.employees(id),
    satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'urgent')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create indexes for tickets
CREATE INDEX tickets_organization_id_idx ON public.tickets(organization_id);
CREATE INDEX tickets_customer_id_idx ON public.tickets(customer_id);
CREATE INDEX tickets_assigned_to_idx ON public.tickets(assigned_to);
CREATE INDEX tickets_status_idx ON public.tickets(status);
CREATE INDEX tickets_priority_idx ON public.tickets(priority);
CREATE INDEX tickets_created_at_idx ON public.tickets(created_at);

-- Create ticket_tags junction table
CREATE TABLE public.ticket_tags (
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (ticket_id, tag_id)
);

-- Create index for ticket_tags
CREATE INDEX ticket_tags_tag_id_idx ON public.ticket_tags(tag_id);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Customers policies
CREATE POLICY "Users can view customers in their organization"
    ON public.customers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = customers.organization_id
        )
    );

CREATE POLICY "Employees can create customers in their organization"
    ON public.customers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Employees can update customers in their organization"
    ON public.customers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = customers.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

-- Tags policies
CREATE POLICY "Users can view tags in their organization"
    ON public.tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = tags.organization_id
        )
    );

CREATE POLICY "Employees can manage tags in their organization"
    ON public.tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = tags.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

-- Tickets policies
CREATE POLICY "Users can view tickets in their organization"
    ON public.tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = tickets.organization_id
        )
    );

CREATE POLICY "Employees can create tickets in their organization"
    ON public.tickets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Employees can update tickets in their organization"
    ON public.tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = tickets.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

-- Ticket tags policies
CREATE POLICY "Users can view ticket tags in their organization"
    ON public.ticket_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.employees e ON e.organization_id = t.organization_id
            WHERE e.user_id = auth.uid()
            AND t.id = ticket_tags.ticket_id
        )
    );

CREATE POLICY "Employees can manage ticket tags in their organization"
    ON public.ticket_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.employees e ON e.organization_id = t.organization_id
            WHERE e.user_id = auth.uid()
            AND t.id = ticket_tags.ticket_id
        )
    );

-- Create trigger for updated_at on tickets
CREATE TRIGGER set_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
