const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonPath = path.join(__dirname, '../supabase/seed/tickets.json');
const outputPath = path.join(__dirname, '../supabase/seed/tickets_new.sql');

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Create SQL insert statement with proper formatting
let sqlContent = `-- Seed tickets data
INSERT INTO public.tickets (
    organization_id,
    customer_id,
    title,
    description,
    status,
    priority,
    category,
    source,
    due_date
) VALUES\n`;

// Convert each ticket to SQL value format with proper indentation
const values = jsonData.tickets.map((ticket, index) => {
    const isLast = index === jsonData.tickets.length - 1;
    return `    ('${ticket.organization_id}', '${ticket.customer_id}', '${ticket.title.replace(/'/g, "''")}', '${ticket.description.replace(/'/g, "''")}', '${ticket.status}', '${ticket.priority}', '${ticket.category}', '${ticket.source}', '${ticket.due_date}')${isLast ? ';' : ','}`;
}).join('\n');

sqlContent += values;

// Write to file
fs.writeFileSync(outputPath, sqlContent);

console.log('SQL file generated successfully at:', outputPath); 