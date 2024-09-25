# Agentopia

Agentopia is a React-based web application that provides a graphical user interface for organizing workflows involving multiple AI agents. It allows users to visually create, connect, and manage AI agent nodes in a flow-based interface, enabling complex, multi-step AI interactions.

## Features

- Visual representation of AI agent workflows
- Drag-and-drop interface for adding and connecting agent nodes
- Integration with OpenAI API for AI model interactions
- Customizable node properties (e.g., AI model selection, system messages)
- Save and load functionality for workflows
- Download workflows as JSON files
- Real-time execution of AI workflows
- Secure API key management
- Workspace management for organizing multiple workflows

## Project Structure

The project is organized into two main parts:

1. Frontend (React application)
2. Backend (Express.js server)

### Frontend

The frontend is built with React and uses React Flow for the node-based interface. It's styled with Tailwind CSS and built using Vite.

### Backend

The backend is an Express.js server that handles API key management, workflow saving/loading, and proxies requests to the OpenAI API.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/agentopia.git
   cd agentopia
   ```

2. Install dependencies:
   ```
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `backend` directory
   - Add the following variables:
     ```
     PORT=3000
     OPENAI_API_KEY=your_openai_api_key_here
     ```

## Running the Application

1. Start the backend server:
   ```
   cd backend
   node server.js
   ```

2. In a new terminal, start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite)

## Usage

1. Use the toolbar to add different types of nodes to the canvas (Agent, TextInput, TextOutput)
2. Connect nodes by dragging from one node's output to another node's input
3. Configure node properties by clicking on a node and using the property panel
4. Save and load workflows using the File menu
5. Execute the workflow using the "Execute Workflow" button in the menu bar

## Workflow Management

- To save a workflow, use the "Save Workflow" option in the File menu
- To load a saved workflow, use the "Load Workflow" option and select from the list of saved workflows
- To download a workflow as a JSON file, use the "Download Workflow" option

## API Key Management

API keys for OpenAI are securely stored on the backend. When configuring an Agent node, you'll be prompted to enter your API key. This key is then stored securely and referenced using a key ID for future operations.

## Contributing

We welcome contributions to Agentopia! Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- OpenAI for providing the AI models and API
- React Flow for the node-based interface library
- All contributors and supporters of the project

## Contact

For any inquiries or issues, please open an issue on the GitHub repository.

---

Agentopia - Empowering AI Workflow Creation