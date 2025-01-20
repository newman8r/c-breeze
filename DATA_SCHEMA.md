This file is a general recommendation for how we will want to structure our data schema as we build the app. These are not hard rules and we will probably end up changing a lot of this as we go. This file is just a guide to help us get started.


1. **Organization**

   - **Attributes:**
     - `OrganizationID` (Primary Key)
     - `Name`
     - `ContactInfo` (Address, Phone, Email)
     - `Settings` (Preferences, Customizations)
     - `CreatedDate`
     - `SubscriptionPlan` (If applicable)
   - **Relationships:**
     - An **Organization** *has many* **Employees**
     - An **Organization** *has many* **Customers**
     - An **Organization** *has many* **Teams**
     - An **Organization** *has a** **KnowledgeBase**
     - An **Organization** *has many* **APIKeys**
     - An **Organization** *has many* **Tickets**

2. **Employee**

   - **Attributes:**
     - `EmployeeID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `Name`
     - `Email`
     - `Role` (Agent, Admin, Supervisor)
     - `Skills` (List or Tags)
     - `Status` (Active, Inactive)
     - `CreatedDate`
     - `LastLoginDate`
   - **Relationships:**
     - An **Employee** *belongs to* an **Organization**
     - An **Employee** *can be a member of* **Teams**
     - An **Employee** *handles* **Tickets**
     - An **Employee** *creates* **Comments**
     - An **Employee** *starts* **ChatSessions**
     - An **Employee** *has* **PerformanceMetrics**

3. **Customer**

   - **Attributes:**
     - `CustomerID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `Name`
     - `Email`
     - `ContactInfo` (Phone, Address)
     - `Status` (Active, Inactive)
     - `CreatedDate`
     - `LastLoginDate`
   - **Relationships:**
     - A **Customer** *belongs to* an **Organization**
     - A **Customer** *creates* **Tickets**
     - A **Customer** *participates in* **ChatSessions**
     - A **Customer** *creates* **Comments**
     - A **Customer** *provides* **Feedback**
     - A **Customer** *accesses* **KnowledgeBase**

4. **Team**

   - **Attributes:**
     - `TeamID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `Name`
     - `FocusArea` (Support Level, Product Line)
     - `Schedule` (Operating Hours)
     - `CreatedDate`
   - **Relationships:**
     - A **Team** *belongs to* an **Organization**
     - A **Team** *has many* **Employees**
     - A **Team** *handles* **Tickets**

5. **Ticket**

   - **Attributes:**
     - `TicketID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `CustomerID` (Foreign Key)
     - `AssignedEmployeeID` (Foreign Key, Nullable)
     - `AssignedTeamID` (Foreign Key, Nullable)
     - `Title`
     - `Description`
     - `Status` (Open, In Progress, Resolved, Closed)
     - `Priority` (Low, Medium, High, Urgent)
     - `Tags` (List of TagIDs)
     - `CreatedDate`
     - `LastUpdatedDate`
     - `DueDate` (Optional)
   - **Relationships:**
     - A **Ticket** *is created by* a **Customer**
     - A **Ticket** *is handled by* an **Employee** or **Team**
     - A **Ticket** *has many* **Comments**
     - A **Ticket** *has many* **Attachments**
     - A **Ticket** *has* **StatusHistory** records
     - A **Ticket** *has many* **Feedback** entries
     - A **Ticket** *has many* **CustomFieldValues**
     - A **Ticket** *can be routed by* **TicketRoutingRules**
     - A **Ticket** *can be processed by* **AIProcessingLogs**

6. **Comment**

   - **Attributes:**
     - `CommentID` (Primary Key)
     - `TicketID` (Foreign Key)
     - `AuthorType` (Employee, Customer, AI)
     - `AuthorID` (Foreign Key)
     - `Content`
     - `IsInternalNote` (Boolean)
     - `CreatedDate`
   - **Relationships:**
     - A **Comment** *belongs to* a **Ticket**
     - A **Comment** *is authored by* an **Employee**, **Customer**, or **AI**
     - A **Comment** *can have* **Attachments**

7. **Tag**

   - **Attributes:**
     - `TagID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `Name`
     - `Description` (Optional)
   - **Relationships:**
     - A **Tag** *belongs to* an **Organization**
     - A **Tag** *is associated with* **Tickets**, **KnowledgeBaseItems**

8. **Attachment**

   - **Attributes:**
     - `AttachmentID` (Primary Key)
     - `ParentType` (Ticket, Comment, KnowledgeBaseItem, ChatMessage)
     - `ParentID` (Foreign Key)
     - `FileName`
     - `FileType`
     - `FileSize`
     - `FileURL` or `FileData`
     - `UploadedByID` (Foreign Key to EmployeeID or CustomerID)
     - `UploadedDate`
   - **Relationships:**
     - An **Attachment** *belongs to* a **Ticket**, **Comment**, **KnowledgeBaseItem**, or **ChatMessage**

9. **KnowledgeBase**

   - **Attributes:**
     - `KnowledgeBaseID` (Primary Key)
     - `OrganizationID` (Foreign Key)
     - `Name`
     - `Description`
     - `CreatedDate`
   - **Relationships:**
     - A **KnowledgeBase** *belongs to* an **Organization**
     - A **KnowledgeBase** *has many* **KnowledgeBaseItems**
     - A **KnowledgeBase** *is used by* **RAGSystems**

10. **KnowledgeBaseItem**

    - **Attributes:**
      - `ItemID` (Primary Key)
      - `KnowledgeBaseID` (Foreign Key)
      - `ItemType` (Article, Document, Upload, FAQ)
      - `Title`
      - `Content` (For text-based items)
      - `FileURL` or `FileData` (For uploads)
      - `AuthorEmployeeID` (Foreign Key)
      - `Tags` (List of TagIDs)
      - `CreatedDate`
      - `LastUpdatedDate`
      - `IsPublished` (Boolean)
    - **Relationships:**
      - A **KnowledgeBaseItem** *belongs to* a **KnowledgeBase**
      - A **KnowledgeBaseItem** *is authored by* an **Employee**
      - A **KnowledgeBaseItem** *has many* **Tags**
      - A **KnowledgeBaseItem** *can have* **Attachments**

11. **ChatSession**

    - **Attributes:**
      - `ChatSessionID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `CustomerID` (Foreign Key, Nullable)
      - `EmployeeID` (Foreign Key, Nullable)
      - `CreatedDate`
      - `LastUpdatedDate`
      - `Status` (Active, Closed)
      - `SessionType` (LiveChat, BotChat)
    - **Relationships:**
      - A **ChatSession** *belongs to* an **Organization**
      - A **ChatSession** *can involve* **Customers** and **Employees**
      - A **ChatSession** *has many* **ChatMessages**
      - A **ChatSession** *can be processed by* **AIProcessingLogs**
      - A **ChatSession** *has many* **CustomFieldValues**

12. **ChatMessage**

    - **Attributes:**
      - `MessageID` (Primary Key)
      - `ChatSessionID` (Foreign Key)
      - `SenderType` (Employee, Customer, AI)
      - `SenderID` (Foreign Key)
      - `Content`
      - `CreatedDate`
    - **Relationships:**
      - A **ChatMessage** *belongs to* a **ChatSession**
      - A **ChatMessage** *is sent by* an **Employee**, **Customer**, or **AI**
      - A **ChatMessage** *can have* **Attachments**

13. **CommunicationLog**

    - **Attributes:**
      - `CommLogID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `CommunicationType` (Email, SMS, Notification)
      - `SenderID` (Foreign Key to EmployeeID or SystemID)
      - `RecipientID` (Foreign Key to CustomerID or EmployeeID)
      - `Subject` (For emails)
      - `Content`
      - `Status` (Sent, Failed)
      - `CreatedDate`
      - `SentDate`
    - **Relationships:**
      - A **CommunicationLog** *belongs to* an **Organization**
      - A **CommunicationLog** *is sent to* a **Customer** or **Employee**
      - A **CommunicationLog** *can reference* a **Ticket**, **ChatSession**, or **KnowledgeBaseItem**

14. **Feedback**

    - **Attributes:**
      - `FeedbackID` (Primary Key)
      - `TicketID` (Foreign Key, Nullable)
      - `ChatSessionID` (Foreign Key, Nullable)
      - `CustomerID` (Foreign Key)
      - `Rating` (Numeric Scale)
      - `Comments`
      - `CreatedDate`
    - **Relationships:**
      - **Feedback** *belongs to* a **Ticket** or **ChatSession**
      - **Feedback** *is provided by* a **Customer**

15. **PerformanceMetric**

    - **Attributes:**
      - `MetricID` (Primary Key)
      - `EmployeeID` (Foreign Key)
      - `MetricType` (ResponseTime, ResolutionRate, etc.)
      - `MetricValue`
      - `CapturedDate`
    - **Relationships:**
      - A **PerformanceMetric** *belongs to* an **Employee**

16. **AIProcessingLog**

    - **Attributes:**
      - `AIProcessingLogID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `EntityType` (Ticket, ChatSession)
      - `EntityID` (Foreign Key)
      - `ProcessingType` (LLMResponse, Routing, Suggestion)
      - `InputData` (Original Content or Summary)
      - `GeneratedResponse`
      - `Timestamp`
      - `ProcessedBy` (AI Model Version)
    - **Relationships:**
      - An **AIProcessingLog** *belongs to* an **Organization**
      - An **AIProcessingLog** *references* a **Ticket** or **ChatSession**

17. **RAGSystem**

    - **Attributes:**
      - `RAGSystemID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `Name`
      - `Description`
      - `DataSources` (List of KnowledgeBaseIDs, External Sources)
      - `CreatedDate`
      - `LastUpdatedDate`
    - **Relationships:**
      - A **RAGSystem** *belongs to* an **Organization**
      - A **RAGSystem** *uses* **KnowledgeBases**
      - A **RAGSystem** *is used in* **AIProcessingLogs**

18. **CustomFieldDefinition**

    - **Attributes:**
      - `FieldID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `EntityType` (Ticket, Customer, ChatSession)
      - `FieldName`
      - `FieldType` (Text, Number, Date, Dropdown)
      - `Options` (For Dropdowns)
    - **Relationships:**
      - A **CustomFieldDefinition** *belongs to* an **Organization**

19. **CustomFieldValue**

    - **Attributes:**
      - `ValueID` (Primary Key)
      - `FieldID` (Foreign Key)
      - `EntityID` (Foreign Key to the specific EntityType)
      - `Value`
    - **Relationships:**
      - A **CustomFieldValue** *is linked to* a **CustomFieldDefinition**
      - A **CustomFieldValue** *is associated with* an entity (e.g., **Ticket**, **Customer**, **ChatSession**)

20. **TicketRoutingRule**

    - **Attributes:**
      - `RoutingRuleID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `RuleName`
      - `Criteria` (JSON or Structured Data)
      - `Action` (Assign to Team/Employee, Set Priority)
      - `CreatedDate`
      - `IsActive` (Boolean)
    - **Relationships:**
      - A **TicketRoutingRule** *belongs to* an **Organization**
      - A **TicketRoutingRule** *applies to* **Tickets**

21. **APIKey**

    - **Attributes:**
      - `APIKeyID` (Primary Key)
      - `OrganizationID` (Foreign Key)
      - `Key`
      - `Permissions` (List of Allowed Actions)
      - `CreatedDate`
      - `LastUsedDate`
    - **Relationships:**
      - An **APIKey** *belongs to* an **Organization**

22. **StatusHistory**

    - **Attributes:**
      - `StatusHistoryID` (Primary Key)
      - `EntityType` (Ticket, ChatSession)
      - `EntityID` (Foreign Key)
      - `OldStatus`
      - `NewStatus`
      - `ChangedByID` (Foreign Key to EmployeeID or System User)
      - `ChangedDate`
    - **Relationships:**
      - **StatusHistory** *belongs to* a **Ticket** or **ChatSession**

---

### **Key Updates and Additions Explained**

#### **1. Expanded Knowledge Base**

- **KnowledgeBase** Entity:
  - Serves as a container for various **KnowledgeBaseItems**.
  - Allows for multiple knowledge bases per organization if needed.

- **KnowledgeBaseItem** Entity:
  - Supports different `ItemType` values (Article, Document, Upload, FAQ).
  - Handles text content and file uploads.
  - Linked to **Tags** for categorization.
  - Used by the **RAGSystem** for AI context retrieval.

#### **2. AI Functionality Integration**

- **AIProcessingLog** Entity:
  - Records AI interactions for transparency and auditing.
  - Stores `InputData` and `GeneratedResponse`.
  - Tracks which AI model or version processed the data.

- **RAGSystem** Entity:
  - Manages retrieval-augmented generation configurations.
  - Defines data sources (e.g., which knowledge bases are used).
  - Ensures extensibility by allowing admins to add or update knowledge sources.

- **Modified **Comment** and **ChatMessage** Entities:
  - Added `AuthorType` and `SenderType` values for `AI`.
  - AI-generated messages are stored and attributed correctly.

#### **3. User Chat Functionality with Chat Logs**

- **ChatSession** Entity:
  - Represents a conversation between a customer and an employee or AI.
  - Organized by `ChatSessionID`.
  - Stores session metadata like `Status` and `SessionType`.

- **ChatMessage** Entity:
  - Captures individual messages within a chat session.
  - Records who sent the message and when.

#### **4. Communication Logs**

- **CommunicationLog** Entity:
  - Logs all outgoing communications (emails, SMS, notifications).
  - Stores content, status, and references to related entities.

#### **5. Custom Metadata on Different Objects**

- **CustomFieldDefinition** and **CustomFieldValue** Entities:
  - Extended `EntityType` to include `ChatSession`.
  - Allows adding custom fields to **Tickets**, **Customers**, and **ChatSessions**.
  - Provides flexibility without altering the core schema.

#### **6. Ticket Routing Elements**

- **TicketRoutingRule** Entity:
  - Defines rules for automatic ticket assignment and prioritization.
  - Criteria can include keywords, customer attributes, or custom fields.
  - Supports AI-driven routing by integrating with **AIProcessingLog**.

#### **7. Agentic Tool-Using AI**

- **Integration with **TicketRoutingRule**:
  - AI analyzes incoming tickets and suggests or applies routing rules.
  - Logs actions in **AIProcessingLog** for auditing.

- **External API Interaction**:
  - Through **APIKey** and potential **Integration** entities (not explicitly modeled), AI can interact with external systems.

---

### **AI Functionality Workflow**

#### **LLM-Generated Responses**

- **Tickets** and **ChatSessions** are processed by the AI.
- **AIProcessingLog** records the input (customer message) and the AI-generated response.
- The generated response is stored as a **Comment** or **ChatMessage** with `AuthorType` set to `AI`.
- **Employees** can review and edit AI suggestions before sending to the customer.

#### **Human-Assisted Suggestions**

- AI provides response suggestions stored in **AIProcessingLog**.
- **Employees** receive these suggestions in their interface.
- Adjusted responses are then sent as **Comments** or **ChatMessages**.

#### **RAG-Based Knowledge Management**

- **RAGSystem** utilizes the **KnowledgeBase** to provide the AI with relevant context.
- When processing a ticket or chat, the AI retrieves information from the specified knowledge bases.
- Administrators can update **KnowledgeBaseItems**, and they are immediately available to the AI.

#### **Agentic Tool-Using AI**

- AI analyzes incoming **Tickets** using **TicketRoutingRules**.
- It can automatically assign tickets to the appropriate **Team** or **Employee**.
- AI interactions and decisions are logged in **AIProcessingLog** for transparency.

---

### **Schema Visualization (Simplified with Additions)**

```plaintext
[Organization] 1---n [Employee]
[Organization] 1---n [Customer]
[Organization] 1---n [Team]
[Organization] 1---1 [KnowledgeBase]
[Organization] 1---n [APIKey]
[Employee] n---m [Team]
[Customer] 1---n [Ticket]
[Employee] n---n [Ticket]
[Team] n---n [Ticket]
[Ticket] 1---n [Comment]
[Ticket] 1---n [Attachment]
[Ticket] 1---n [CustomFieldValue]
[KnowledgeBase] 1---n [KnowledgeBaseItem]
[KnowledgeBaseItem] n---n [Tag]
[ChatSession] 1---n [ChatMessage]
[ChatSession] 1---n [CustomFieldValue]
[AIProcessingLog] n---1 [Ticket] or [ChatSession]
[RAGSystem] n---n [KnowledgeBase]
```

---

### **Use Cases Demonstrating New Features**

#### **1. AI-Generated Ticket Response**

- A **Customer** submits a **Ticket**.
- The AI processes the ticket, generating a suggested response using the **RAGSystem**.
- An **AIProcessingLog** entry is created with input and generated response.
- An **Employee** reviews, edits, and sends the response as a **Comment**.

#### **2. AI-Driven Ticket Routing**

- A new **Ticket** is submitted.
- The AI analyzes the ticket content.
- Based on **TicketRoutingRules** and AI analysis, the ticket is assigned to a specific **Team**.
- The routing decision is logged in **AIProcessingLog**.

#### **3. Chatbot Handling Customer Queries**

- A **Customer** initiates a **ChatSession**.
- The AI chatbot responds with **ChatMessages**.
- The conversation is stored, and an **AIProcessingLog** captures the interactions.
- If needed, the session is escalated to an **Employee**.

#### **4. Custom Metadata for Chats**

- The **Organization** defines custom fields for **ChatSessions** (e.g., Topic, Sentiment Score).
- **CustomFieldValues** are recorded for each chat session.
- These fields are used in analytics and reporting.

#### **5. Logging All Communications**

- When an email is sent to a **Customer**, a **CommunicationLog** entry is created.
- The log includes email content, recipient, and status.
- This ensures a complete history of interactions.

#### **6. Updating Knowledge Sources for the AI**

- An **Employee** adds a new **KnowledgeBaseItem** (e.g., a product manual).
- The **RAGSystem** automatically incorporates this item.
- Future AI responses can reference the updated information.

---

### **Considerations for AI Ethics and Compliance**

- **Transparency**: All AI interactions are logged in **AIProcessingLog**.
- **Data Privacy**: Ensure compliance with data protection laws when processing customer data.
- **Human Oversight**: AI suggestions are reviewed by **Employees** before being sent.

---

### **Extensibility and Future Enhancements**

- **External Integrations**: Additional entities can be added to manage integrations with other systems (e.g., **Integration** entity).
- **Advanced Analytics**: Extend **PerformanceMetric** to include AI performance.
- **Sentiment Analysis**: Add attributes or entities to capture customer sentiment in chats and tickets.

---

### **Conclusion**

This revised conceptual schema addresses your updated requirements by:

- **Expanding the Knowledge Base**: Accommodating various content types and integrating with AI retrieval systems.
- **Integrating AI Functionality**: Providing structures to support LLM responses, RAG systems, and AI-driven routing.
- **Adding User Chat Support**: Introducing entities for chat sessions and messages, with logging and metadata capabilities.
- **Logging Communications**: Ensuring all email and communication interactions are recorded.
- **Enhancing Custom Metadata**: Allowing custom fields across multiple entities for flexibility.
- **Defining Ticket Routing**: Establishing entities for routing rules and AI-driven assignment.

By incorporating these elements, the schema becomes robust, flexible, and well-suited for a modern customer support platform that leverages AI while maintaining human oversight and interaction.
