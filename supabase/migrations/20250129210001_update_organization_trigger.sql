-- Create a combined trigger function for organization creation
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create initial admin user
  perform public.create_initial_admin(
    NEW.id,
    NEW.created_by,
    (NEW.contact_info->>'email')::text
  );

  -- Initialize RAG settings
  insert into public.rag_settings (
    organization_id,
    chunk_size,
    chunk_overlap,
    embedding_model,
    status
  ) values (
    NEW.id,
    500,  -- default chunk size
    50,   -- default overlap
    'text-embedding-3-small',  -- default model
    'not_built'
  );
  
  return NEW;
end;
$$;

-- Drop existing triggers
drop trigger if exists on_organization_created on public.organizations;

-- Create new combined trigger
create trigger on_organization_created
  after insert on public.organizations
  for each row
  execute function public.handle_new_organization(); 