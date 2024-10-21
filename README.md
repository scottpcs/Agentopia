# Agentopia

Agentopia is an AI Workflow Proof of Concept application that allows users to create, manage, and execute complex workflows involving AI agents, human agents, and text processing nodes.

## Value Proposition

Agentopia empowers users to visually design and execute complex AI workflows that seamlessly integrate AI agents and human interactions in real-time, enabling efficient collaboration and automation without the need for extensive coding expertise.

## Features

- Visual node-based interface for creating AI workflows
- Support for AI agents, human agents, text input, text output, and human interaction nodes
- Integration with OpenAI API for AI model interactions
- Support for multiple OpenAI models including GPT-4, GPT-3.5-Turbo, and their variants
- Customizable node properties (e.g., AI model selection, temperature, max tokens, system instructions, custom instructions)
- Real-time workflow execution with visual feedback
- Ability to stop and resume workflow execution
- Dynamic updates to node properties during execution
- Workspace management for organizing multiple workflows
- Save, load, and download functionality for workflows
- Secure API key management with encryption
- Property panel for detailed node configuration
- Interaction panel for real-time node testing and interaction
- Support for multi-agent discussions with proper identification of participants
- Context management and visualization

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)

## Setup

1. Clone the repository:
git clone https://github.com/your-username/agentopia.git
cd agentopia
Copy
2. Install dependencies:
npm install
Copy
3. Set up the database:
- Create a PostgreSQL database named `agentopia`
- Create a user for the application or use an existing one

4. Configure environment variables:
Create a `.env` file in the root directory with the following content:
DATABASE_URL=postgresql://username:password@localhost:5432/agentopia
ENCRYPTION_KEY=your_32_byte_encryption_key_here
CopyReplace `username`, `password`, and the encryption key with your actual values.

5. Initialize the database:
node scripts/init-db.js
Copy
6. Start the development server:
npm run dev
Copy
7. Open your browser and navigate to `http://localhost:5173` to access the application.

## Usage

1. Create a new workflow:
- Use the toolbar on the left to add nodes to your workflow canvas.
- Available node types: AI Agent, Human Agent, Text Input, Text Output, Human Interaction.
- Connect nodes by dragging from one node's output handle to another node's input handle.

2. Configure nodes:
- Left-click on a node to open the Interaction Panel.
- Right-click on a node to open the Property Panel.
- For AI agents, set the model, temperature, max tokens, API key, system instructions, and custom instructions.
- For human agents and interaction nodes, set the name and any additional information.

3. Manage API keys:
- Click on "Manage Credentials" in the menu bar to open the Credential Manager.
- Add, edit, or delete API keys for OpenAI or other services.

4. Execute the workflow:
- Click the "Execute Workflow" button in the menu bar.
- Follow the execution progress and interact with Human Interaction nodes when prompted.
- Use the "Stop Execution" button to halt the workflow at any time.

5. Save and load workflows:
- Use the "Save Workflow" option in the File menu to save your current workflow.
- Use the "Load Workflow" option to open a previously saved workflow.

6. Manage workspaces:
- Click on "Set Workspace" to manage and switch between different workspaces.

## Development

- The frontend is built with React and uses React Flow for the node-based interface.
- The backend uses Express.js and interacts with a PostgreSQL database.
- API calls to OpenAI are made through a secure backend proxy to protect API keys.

To contribute to the project:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes and commit them
4. Push to your fork and submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI models used in this project
- React Flow for the node-based interface library
- All contributors who have helped shape and improve Agentopia