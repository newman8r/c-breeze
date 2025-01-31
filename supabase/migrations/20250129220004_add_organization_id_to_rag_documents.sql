-- Add organization_id column to rag_documents
ALTER TABLE public.rag_documents
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update existing documents to set organization_id based on user_id
UPDATE public.rag_documents rd
SET organization_id = (
    SELECT organization_id 
    FROM public.employees e 
    WHERE e.user_id = rd.user_id 
    LIMIT 1
);

-- Make organization_id not null after populating data
ALTER TABLE public.rag_documents
ALTER COLUMN organization_id SET NOT NULL; 