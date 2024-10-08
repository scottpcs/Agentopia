# Agentopia API Documentation

This document outlines the API endpoints for the Agentopia backend server.

## Base URL

All API requests should be prefixed with:

```
http://localhost:3000/api
```

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
  ```
- **Response**: Confirmation message

#### GET /workflows/:name
- **Description**: Retrieves a specific workflow by name
- **Response**: Workflow data in React Flow format

#### GET /workflows/:name/download
- **Description**: Downloads a specific workflow as a JSON file
- **Response**: JSON file download

### API Key Management

#### POST /api/keys
- **Description**: Saves a new API key
- **Request Body**:
  ```json
  {
    "name": "Key Name",
    "value": "sk-..."
  }
  ```
- **Response**: Confirmation message with key ID

#### GET /api/keys
- **Description**: Retrieves a list of all saved API key names
- **Response**: An array of API key names

#### GET /api/keys/:name
- **Description**: Retrieves a specific API key by name
- **Response**: 
  ```json
  {
    "value": "decrypted-api-key"
  }
  ```

#### DELETE /api/keys/:name
- **Description**: Deletes a specific API key by name
- **Response**: Confirmation message

### OpenAI API Integration

#### POST /api/openai
- **Description**: Makes a call to the OpenAI API
- **Request Body**:
  ```json
  {
    "keyName": "api-key-name",
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
    "customInstructions": "Additional instructions for the AI"
  }
  ```
- **Response**: Returns the response from the OpenAI API

## Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Successful request
- 400: Bad request (e.g., invalid input)
- 404: Resource not found
- 500: Internal server error

Error responses include a JSON object with `error` and optionally `details` fields providing more information about the error.

## Authentication

Currently, the API uses a simple middleware for authentication. In a production environment, implement proper authentication (e.g., JWT) before using these endpoints.

## Notes

- This API is designed for local development and testing. Additional security measures should be implemented for production use.
- Ensure that the OpenAI API key used has the necessary permissions for the models and endpoints being accessed.