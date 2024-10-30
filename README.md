# Agentopia

Agentopia is an AI Workflow Proof of Concept application that allows users to create, manage, and execute complex workflows involving AI agents, human agents, and text processing nodes.

## Value Proposition

Agentopia empowers users to visually design and execute complex AI workflows that seamlessly integrate AI agents and human interactions in real-time, enabling efficient collaboration and automation without the need for extensive coding expertise.

## Features

### Visual Workflow Design
- Node-based interface for creating AI workflows
- Drag-and-drop functionality with automatic grid snapping
- Real-time connection visualization
- Support for multiple node types:
  - AI agents with configurable personalities and expertise
  - Human interaction nodes
  - Text input/output nodes
  - Process control nodes

### Advanced Agent Configuration
- Comprehensive personality configuration:
  - Creativity level
  - Communication tone
  - Empathy settings
  - Assertiveness control
  - Humor preferences
  - Optimism levels
- Role-based configuration:
  - Goal orientation
  - Contribution style
  - Task emphasis
  - Domain scope
- Expertise settings:
  - Knowledge depth
  - Specialized skills
  - Certainty levels
  - Responsibility scope

### Model Integration
- Support for multiple OpenAI models:
  - GPT-4 and variants
  - GPT-3.5-Turbo and variants
- Intelligent model selection
- Dynamic temperature adjustment
- Cost estimation and tracking
- Usage optimization

### Workflow Management
- Save and load workflows
- Real-time execution monitoring
- Error handling and recovery
- State management
- Context preservation between nodes

### Security Features
- Encrypted API key storage
- Usage tracking and rate limiting
- Secure credential management
- Access control

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/agentopia.git
cd agentopia
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
- Create a PostgreSQL database named `agentopia`
- Create a user for the application or use an existing one

4. Configure environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/agentopia
ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

5. Initialize the database:
```bash
node scripts/init-db.js
```

6. Start the development server:
```bash
npm run dev
```

7. Open your browser and navigate to `http://localhost:5173`

## Usage

### Creating a Workflow

1. Add Nodes:
   - Drag nodes from the sidebar onto the canvas
   - Configure node properties via the Properties Panel
   - Connect nodes by dragging from output to input handles

2. Configure Agents:
   - Right-click AI Agent nodes to open Properties
   - Configure personality, role, and expertise
   - Set model preferences and parameters
   - Preview generated system instructions

3. Manage API Keys:
   - Open Credential Manager from menu
   - Add, edit, or remove API keys
   - Set usage limits and expiration

4. Execute Workflows:
   - Click "Execute Workflow" in menu bar
   - Monitor execution progress
   - Interact with Human Interaction nodes
   - View results in real-time

### Node Types

1. AI Agent Node:
   - Configurable personality and expertise
   - Model selection
   - Temperature control
   - System instruction preview

2. Human Interaction Node:
   - Real-time input/output
   - Context preservation
   - State management

3. Text Input/Output Nodes:
   - Data entry and display
   - Format control
   - State persistence

## Development

The project uses:
- React with Vite for frontend
- Express.js for backend
- React Flow for node-based interface
- TailwindCSS for styling
- shadcn/ui for components

Key directories:
```
src/
  ├── components/    # React components
  ├── services/     # API services
  ├── utils/        # Utility functions
  ├── nodes/        # Node implementations
  └── store/        # State management
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Install dependencies and setup development environment
4. Make your changes
5. Run tests
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI models
- React Flow for the node-based interface
- All contributors to the project

## Support

For support or questions:
- Open an issue in the repository
- Check the documentation
- Contact the development team

## Future Development

Planned features:
- Advanced multi-agent interactions
- Cost optimization tools
- Performance improvements
- Additional model support
- Enhanced error handling
- Workflow templates

Last updated: October 28, 2024