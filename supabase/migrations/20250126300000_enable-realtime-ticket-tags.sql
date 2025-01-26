-- Enable realtime for ticket_tags table
alter publication supabase_realtime add table ticket_tags;

-- Enable realtime for tags table as well since we need tag details
alter publication supabase_realtime add table tags;
