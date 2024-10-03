# Agentopia Backend API Documentation

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

#### POST /keys
- **Description**: Saves a new API key
- **Request Body**:
  ```json
  {
    "name": "Key Name",
    "value": "sk-..."
  }
  ```
- **Response**: Confirmation message

#### GET /keys
- **Description**: Retrieves a list of all saved API key names
- **Response**: An array of API key names

#### GET /keys/:name
- **Description**: Retrieves a specific API key by name
- **Response**: 
  ```json
  {
    "value": "decrypted-api-key"
  }
  ```

### Assistant Management

#### POST /assistants
- **Description**: Saves a new assistant
- **Request Body**:
  ```json
  {
    "name": "Assistant Name",
    "id": "assistant-id"
  }
  ```
- **Response**: Confirmation message

#### GET /assistants
- **Description**: Retrieves a list of all saved assistant names
- **Response**: An array of assistant names

#### GET /assistants/:name
- **Description**: Retrieves a specific assistant by name
- **Response**: 
  ```json
  {
    "id": "assistant-id"
  }
  ```

### Thread Management

#### POST /threads
- **Description**: Saves a new thread
- **Request Body**:
  ```json
  {
    "name": "Thread Name",
    "id": "thread-id"
  }
  ```
- **Response**: Confirmation message

#### GET /threads
- **Description**: Retrieves a list of all saved thread names
- **Response**: An array of thread names

#### GET /threads/:name
- **Description**: Retrieves a specific thread by name
- **Response**: 
  ```json
  {
    "id": "thread-id"
  }
  ```

### OpenAI API Integration

#### POST /openai
- **Description**: Makes a call to the OpenAI API
- **Request Body**:
  ```json
  {
    "keyId": "api-key-name",
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
- **Error Response**:
  ```json
  {
    "error": "Error calling OpenAI API",
    "details": "Error message"
  }
  ```

## Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Successful request
- 400: Bad request (e.g., invalid input)
- 404: Resource not found
- 500: Internal server error

Error responses include a JSON object with `error` and `details` fields providing more information about the error.

## Security

- API keys are encrypted before storage and decrypted when retrieved.
- The server uses CORS to restrict access to allowed origins.
- Sensitive operations should be performed over HTTPS in a production environment.

## Notes

- This API is designed for local development and testing. Additional security measures should be implemented for production use.
- Ensure that the OpenAI API key used has the necessary permissions for the models and endpoints being accessed.

Last updated: October 3, 2024