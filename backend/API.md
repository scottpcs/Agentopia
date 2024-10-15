# Agentopia API Documentation

This document outlines the API endpoints for the Agentopia backend server.

## Base URL

All API requests should be prefixed with:
http://localhost:3000/api
Copy
## Endpoints

### Workflow Management

#### GET /workflows
- **Description**: Retrieves a list of all saved workflows
- **Response**: An array of workflow names

#### POST /workflows
- **Description**: Saves a new workflow
- **Request Body**:
  ```json
  {
    "name": "Workflow Name",
    "data": {
      // Workflow data in React Flow format
    }
  }

Response: Confirmation message

GET /workflows/:name

Description: Retrieves a specific workflow by name
Response: Workflow data in React Flow format

GET /workflows/:name/download

Description: Downloads a specific workflow as a JSON file
Response: JSON file download

API Key Management
POST /api/keys

Description: Saves a new API key
Request Body:
jsonCopy{
  "name": "Key Name",
  "value": "sk-...",
  "expiresAt": "2023-12-31T23:59:59Z",  // Optional
  "usageLimit": 1000  // Optional
}

Response: Confirmation message with key ID

GET /api/keys

Description: Retrieves a list of all saved API key names
Response: An array of API key names

GET /api/keys/:name

Description: Retrieves a specific API key by name
Response:
jsonCopy{
  "value": "decrypted-api-key",
  "expiresAt": "2023-12-31T23:59:59Z",
  "usageLimit": 1000,
  "usageCount": 50
}


DELETE /api/keys/:name

Description: Deletes a specific API key by name
Response: Confirmation message

POST /api/keys/:name/rotate

Description: Rotates (changes) the value of a specific API key
Response: New API key value

OpenAI API Integration
POST /api/openai

Description: Makes a call to the OpenAI API
Request Body:
jsonCopy{
  "apiKeyName": "api-key-name",
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, AI!"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 150,
  "systemInstructions": "Additional instructions for the AI",
  "customInstructions": "Custom instructions for this specific call"
}

Response: Returns the response from the OpenAI API

Execution Control
POST /api/execute

Description: Starts the execution of a workflow
Request Body:
jsonCopy{
  "workflowName": "MyWorkflow"
}

Response: Execution ID and initial status

POST /api/stop-execution

Description: Stops the currently executing workflow
Request Body:
jsonCopy{
  "executionId": "execution-uuid"
}

Response: Confirmation of stopped execution

GET /api/execution-status/:executionId

Description: Retrieves the current status of a workflow execution
Response: Current execution status and any output data

Error Handling
All endpoints return appropriate HTTP status codes:

200: Successful request
400: Bad request (e.g., invalid input)
401: Unauthorized (e.g., invalid API key)
404: Resource not found
500: Internal server error

Error responses include a JSON object with error and optionally details fields providing more information about the error.
Authentication
Currently, the API uses a simple middleware for authentication. In a production environment, implement proper authentication (e.g., JWT) before using these endpoints.
Notes

This API is designed for local development and testing. Additional security measures should be implemented for production use.
Ensure that the OpenAI API key used has the necessary permissions for the models and endpoints being accessed.
The execution control endpoints (/execute, /stop-execution, /execution-status) support the improved workflow execution features, including stopping and resuming executions.