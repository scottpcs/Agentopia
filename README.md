# Agentopia

Agentopia is an AI Workflow Proof of Concept application that allows users to create, manage, and execute workflows involving AI agents and text processing.

## Features

- Visual representation of AI agent workflows
- Drag-and-drop interface for adding and connecting agent nodes
- Integration with OpenAI API for AI model interactions
- Support for multiple OpenAI models including GPT-4, GPT-3.5-Turbo, and their variants
- Customizable node properties (e.g., AI model selection, system messages, temperature, max tokens)
- Secure API key management with encryption
- Save and load functionality for workflows
- Download workflows as JSON files

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/agentopia.git
   cd agentopia
   ```

2. Set up the backend:
   ```
   cd backend
   npm install
   ```

3. Set up the database:
   - Create a PostgreSQL database named `agentopia`
   - Create a user for the application or use an existing one

4. Configure environment variables:
   Create a `.env` file in the `backend` directory with the following content:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/agentopia
   ENCRYPTION_KEY=your_32_byte_encryption_key_here
   ```
   Replace `username`, `password`, and the encryption key with your actual values.

5. Initialize the database:
   ```
   node -e "require('./encryptedKeyService.js').init().then(() => console.log('Initialization complete')).catch(console.error)"
   ```

6. Start the backend server:
   ```
   npm start
   ```

7. Set up the frontend (from the project root):
   ```
   cd frontend
   npm install
   npm run dev
   ```

8. Open your browser and navigate to `http://localhost:5173` to access the application.

## Usage

1. Use the toolbar on the left to add nodes to your workflow.
2. Connect nodes by dragging from one node's output to another node's input.
3. Configure node properties by selecting a node and using the property panel on the right.
4. Save your workflow using the "Save" button in the menu bar.
5. Execute your workflow using the "Execute Workflow" button.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.