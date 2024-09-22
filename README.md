# Agentopia

Agentopia is a React-based web application that provides a graphical user interface for organizing workflows involving multiple AI agents. It allows users to visually create, connect, and manage AI agent nodes in a flow-based interface, enabling complex, multi-step AI interactions.

## Project Structure

The project is organized into two main parts:

- `frontend/`: Contains the React application built with Vite and Tailwind CSS
- `backend/`: Contains the Express.js server that handles API requests

## Features

- Visual representation of AI agent workflows
- Drag-and-drop interface for adding and connecting agent nodes
- Integration with OpenAI API for AI model interactions
- Customizable node properties (e.g., AI model selection, system messages)
- Save and load functionality for workflows
- Real-time execution of AI workflows

## Technologies Used

- Frontend:
  - React
  - Vite
  - Tailwind CSS
  - React Flow (for node-based interface)
- Backend:
  - Express.js
  - Node.js
- API Integration:
  - OpenAI API

## Setup and Installation

1. Clone the repository:
git clone https://github.com/your-username/agentopia.git
cd agentopia

2. Install dependencies:
npm install
cd frontend && npm install
cd ../backend && npm install

3. Set up environment variables:
- Create a `.env` file in the `backend` directory
- Add your OpenAI API key:
  ```
  OPENAI_API_KEY=your_api_key_here
  ```

## Running the Application

From the root directory, run:
npm start

This will start both the frontend and backend servers concurrently.

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Usage

1. Open the application in your web browser
2. Use the toolbar to add different types of nodes to the canvas
3. Connect nodes by dragging from one node's output to another node's input
4. Configure node properties by clicking on a node and using the property panel
5. Execute the workflow using the "Execute Workflow" button in the menu bar
6. Save and load workflows using the File menu

## Configuration

- OpenAI API: Ensure your API key is set in the backend `.env` file
- Port configuration: The backend port can be changed in `backend/server.js`

## Contributing

We welcome contributions to Agentopia! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-branch-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-branch-name`
5. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT License](https://opensource.org/licenses/MIT)

## Acknowledgements

- OpenAI for providing the AI models and API
- React Flow for the node-based interface library
- All contributors and supporters of the project

## Contact

For any inquiries or issues, please open an issue on the GitHub repository.

---

Agentopia - Empowering AI Workflow Creation