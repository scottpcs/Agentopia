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
POST /api/openai

Description: Make a call to the OpenAI API
Request Body:
{
  "apiKey": "your_openai_api_key",
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

Response:
{
  "response": "Hello! How can I assist you today?"
}

Error Response:
{
  "error": "Error message details"
}


## Error Handling

All endpoints return appropriate HTTP status codes:

200: Successful request
400: Bad request (e.g., invalid parameters)
401: Unauthorized (e.g., invalid API key)
500: Server error


Error responses include a JSON object with an error field containing a description of the error.

## Rate Limiting
Currently, there is no rate limiting implemented on the backend. However, be aware of OpenAI's rate limits when making requests to their API.
## Authentication
The OpenAI API key is required for each request to the /api/openai endpoint. In a production environment, consider implementing a more secure authentication method.
## Future Endpoints
As the Agentopia project grows, additional endpoints may be added for features such as:

Saving and loading workflows
User authentication and authorization
Custom AI model management
Workflow execution history

Please check back for updates to this API documentation as new features are implemented.

Last updated: [Current Date]