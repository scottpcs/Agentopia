# Agentopia Backend API

This document outlines the API endpoints for the Agentopia backend server.

## Base URL

All endpoints are relative to: `http://localhost:3000`

## Endpoints

### GET /

- **Description**: Welcome message endpoint
- **Response**: 
  ```json
  {
    "message": "Welcome to Agentopia API"
  }
  ```

### POST /api/keys

- **Description**: Store an API key securely
- **Request Body**:
  ```json
  {
    "key": "openai",
    "value": "your_openai_api_key"
  }
  ```
- **Response**:
  ```json
  {
    "keyId": "key_1234567890"
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Failed to store API key"
  }
  ```

### POST /api/openai

- **Description**: Make a call to the OpenAI API
- **Request Body**:
  ```json
  {
    "keyId": "key_1234567890",
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
    "maxTokens": 150
  }
  ```
- **Response**:
  ```json
  {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hello! How can I assist you today?"
        }
      }
    ]
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Error calling OpenAI API"
  }
  ```

### POST /api/workflows

- **Description**: Save a new workflow
- **Request Body**:
  ```json
  {
    "name": "My Workflow",
    "data": {
      // Workflow data (nodes, edges, etc.)
    }
  }
  ```
- **Response**:
  ```json
  {
    "message": "Workflow saved successfully",
    "filename": "My Workflow.json"
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Error saving workflow"
  }
  ```

### GET /api/workflows

- **Description**: Get a list of all saved workflows
- **Response**:
  ```json
  [
    "Workflow1.json",
    "Workflow2.json",
    "Workflow3.json"
  ]
  ```
- **Error Response**:
  ```json
  {
    "error": "Error listing workflows"
  }
  ```

### GET /api/workflows/:name

- **Description**: Load a specific workflow
- **Parameters**:
  - `name`: The name of the workflow to load
- **Response**:
  ```json
  {
    // Workflow data (nodes, edges, etc.)
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "Error loading workflow"
  }
  ```

### GET /api/workflows/:name/download

- **Description**: Download a specific workflow as a JSON file
- **Parameters**:
  - `name`: The name of the workflow to download
- **Response**: JSON file download
- **Error Response**:
  ```json
  {
    "error": "Error downloading workflow"
  }
  ```

## Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Successful request
- 400: Bad request (e.g., invalid parameters)
- 401: Unauthorized (e.g., invalid API key)
- 404: Not found (e.g., workflow not found)
- 500: Server error

Error responses include a JSON object with an `error` field containing a description of the error.

## Rate Limiting

Currently, there is no rate limiting implemented on the backend. However, be aware of OpenAI's rate limits when making requests to their API.

## Authentication

The OpenAI API key is securely stored on the backend and accessed via a `keyId`. This `keyId` is required for each request to the `/api/openai` endpoint.

## Security Considerations

- API keys are stored in-memory on the backend. In a production environment, consider using a secure database for key storage.
- Implement proper authentication and authorization for accessing and using stored API keys and workflows.
- Use HTTPS for all communication between frontend and backend in production.
- Consider implementing key rotation and expiration policies.

## Future Endpoints

As the Agentopia project grows, additional endpoints may be added for features such as:

- User authentication and authorization
- Custom AI model management
- Workflow execution history
- Real-time collaboration on workflows

Please check back for updates to this API documentation as new features are implemented.

Last updated: September 24, 2024