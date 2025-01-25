# API Endpoints Documentation

This document outlines all available API endpoints in our system. Each endpoint requires an API key for authentication, which should be included in the request headers.

## Authentication

All requests must include the following headers:
```
Content-Type: application/json
apikey: your-api-key
```

## Endpoints

### Create Ticket
Creates a new ticket in the system.

**Endpoint:** `POST /functions/v1/api-create-ticket`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "subject": "Ticket Subject",
  "description": "Detailed description of the issue",
  "priority": "low" | "medium" | "high"
}
```

**Response:**
```json
{
  "success": true,
  "ticket_id": "uuid",
  "customer_id": "uuid",
  "status": "open"
}
```

### Add Message to Ticket
Adds a new message to an existing ticket.

**Endpoint:** `POST /functions/v1/api-add-ticket-message`

**Request Body:**
```json
{
  "ticket_id": "uuid",
  "message": "Your message content"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "uuid",
  "created_at": "timestamp"
}
```

### Get Ticket Details
Retrieves a ticket and all its messages.

**Endpoint:** `GET /functions/v1/api-get-ticket?ticket_id=uuid`

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "organization_id": "uuid",
    "customer_id": "uuid",
    "title": "string",
    "description": "string",
    "status": "open" | "resolved" | "closed",
    "priority": "low" | "medium" | "high",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "customer": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    }
  },
  "messages": [
    {
      "id": "uuid",
      "content": "string",
      "sender_type": "customer",
      "created_at": "timestamp"
    }
  ]
}
```

### Update Ticket Status
Updates the status of an existing ticket.

**Endpoint:** `POST /functions/v1/api-update-ticket-status`

**Request Body:**
```json
{
  "ticket_id": "uuid",
  "status": "open" | "resolved" | "closed"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "status": "string",
    "updated_at": "timestamp"
  },
  "message": {
    "id": "uuid",
    "content": "Status updated to: [status]",
    "created_at": "timestamp"
  }
}
```

### Get Customer Tickets
Retrieves all tickets associated with a customer's email address.

**Endpoint:** `GET /functions/v1/api-get-customer-tickets?email=customer@example.com`

**Response:**
```json
{
  "success": true,
  "customer": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  },
  "tickets": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "messages": [
        {
          "id": "uuid",
          "content": "string",
          "sender_type": "string",
          "created_at": "timestamp"
        }
      ]
    }
  ]
}
```

## Error Responses

All endpoints may return the following error responses:

### Authentication Error
```json
{
  "error": "Invalid API key"
}
```

### Not Found Error
```json
{
  "error": "Resource not found"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "details": "Description of what went wrong"
}
```

### Server Error
```json
{
  "error": "Failed to process request",
  "details": "Description of what went wrong"
}
```

## Rate Limiting

API endpoints are subject to rate limiting. Current limits are:
- 100 requests per minute per API key
- 1000 requests per hour per API key

## Best Practices

1. **Error Handling**
   - Always check the response status and handle errors appropriately
   - Implement exponential backoff for retries
   - Log failed requests for debugging

2. **Performance**
   - Cache responses when appropriate
   - Batch requests when possible
   - Use appropriate timeouts

3. **Security**
   - Store API keys securely
   - Use HTTPS for all requests
   - Validate input before sending

## Changelog

### 2025-01-27
- Initial API documentation
- Added endpoints for ticket creation, message addition, ticket retrieval, status updates, and customer ticket listing 