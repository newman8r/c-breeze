-- Enable real-time for rag_settings table
alter publication supabase_realtime add table rag_settings;

-- Add replication identifier for real-time
alter table rag_settings replica identity full; 