# Agentopia Backend API

[Most of the content remains the same. Update the following section:]

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
- **Response**: Returns the response from the OpenAI API
- **Error Response**:
  ```json
  {
    "error": "Error calling OpenAI API",
    "details": "Error message"
  }
  ```

[The rest of the document remains the same.]

Last updated: October 1, 2024