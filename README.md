# Agentopia

Agentopia is an AI Workflow Proof of Concept application that allows users to create, manage, and execute workflows involving AI agents and text processing.

## Features

- Visual representation of AI agent workflows
- Drag-and-drop interface for adding and connecting agent nodes
- Integration with OpenAI API for AI model interactions
- Support for multiple OpenAI models including GPT-4, GPT-3.5-Turbo, and their variants
- Customizable node properties (e.g., AI model selection, system messages, temperature, max tokens)
- Agent Wizard for configuring agent personalities
- Save and load functionality for workflows
- Download workflows as JSON files
- Real-time execution of AI workflows
- Secure API key management with encryption
- Workspace management for organizing multiple workflows
- Credential management for API keys, assistants, and threads

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/agentopia.git
   cd agentopia
   ```

2. Install dependencies for both frontend and backend:
   ```
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `backend` directory with the following content:
   ```
   PORT=3000
   ENCRYPTION_KEY=your_secret_encryption_key
   ```
   Replace `your_secret_encryption_key` with a secure random string.

4. Start the backend server:
   ```
   cd backend
   node server.js
   ```

5. In a new terminal, start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173` to access the application.

## Usage

1. Use the toolbar on the left to add nodes to your workflow.
2. Connect nodes by dragging from one node's output to another node's input.
3. Configure node properties by selecting a node and using the property panel on the right.
4. Use the Agent Wizard to configure agent personalities.
5. Save your workflow using the "Save" button in the menu bar.
6. Execute your workflow using the "Execute Workflow" button.
7. Manage your API keys and other credentials using the Credential Manager.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the API that powers the AI agents
- React Flow for the workflow visualization library

Last updated: October 3rd, 2024