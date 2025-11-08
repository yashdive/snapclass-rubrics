# Snap! Rubric Generator

An AI-powered rubric generation system for Snap! programming assignments using Angular 18 frontend and Node.js backend with RAG (Retrieval-Augmented Generation).

## Project Structure

```
snapclass-rubrics-repo/
├── client/          # Angular 18 frontend
├── server/          # Node.js backend with RAG
└── README.md
```

## Features

- **AI-Powered Generation**: Uses Llama 3.1 70B via Hugging Face for intelligent rubric creation
- **RAG Pipeline**: Retrieves relevant context from Snap! programming manual using vector search
- **Row-Level Regeneration**: Regenerate entire category objectives while preserving point scales
- **Interactive Editing**: Double-click cells to edit, with inline controls
- **Tier-Aware AI**: Understands scoring tiers and maintains consistency across objectives
- **Responsive UI**: Clean, modern interface with expandable instruction panels

## Prerequisites

- Node.js 18+ and npm
- Angular CLI 18
- Hugging Face API token (for Llama 3.1 70B access)
- Ollama (for local embeddings)

## Setup

### Backend Setup

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with your Hugging Face token:
   ```
   HF_TOKEN=your_hugging_face_token_here
   ```

4. Start the server:
   ```bash
   node api.js
   ```
   Server runs on `http://localhost:3001`

### Frontend Setup

1. Navigate to client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm start
   ```
   Frontend runs on `http://localhost:4200`

## Usage

1. **Generate Rubric**:
   - Open `http://localhost:4200`
   - Enter assignment title, description, and optional requirements
   - Click "Generate Rubric"

2. **Edit Objectives**:
   - Double-click any cell to edit text and points
   - Click the ✎ icon in the cell's bottom-right to edit
   - Save changes with the checkmark button

3. **Regenerate Row**:
   - Click the 🔄 button in any category (bottom-right corner)
   - Enter optional instruction for AI guidance
   - Click "Generate" to regenerate all objectives in that row
   - Category and point values remain unchanged

4. **Regenerate Entire Rubric**:
   - Click "Edit & Regenerate All" at the top
   - Modify assignment details if needed
   - Click "Regenerate Entire Rubric"

## Technology Stack

### Frontend
- **Angular 18** - Standalone components architecture
- **TypeScript** - Type-safe development
- **RxJS** - Reactive data handling
- **Template-driven forms** - ngModel bindings

### Backend
- **Node.js + Express** - REST API server
- **LangChain** - RAG pipeline orchestration
- **Hugging Face Inference** - Llama 3.1 70B Instruct
- **Ollama Embeddings** - Local vector embeddings
- **MemoryVectorStore** - In-memory vector search
- **PDFLoader** - Snap! manual ingestion

## API Endpoints

- `POST /generate` - Generate complete rubric from assignment details
- `POST /regenerate-row` - Regenerate objectives for one category
- `POST /regenerate-cell` - Regenerate single objective (legacy)

## Development Notes

- Backend initializes vector store at startup (904 chunks from Snap! manual)
- Point values are preserved during regeneration to maintain table alignment
- Objectives sorted descending by points (highest quality → lowest)
- CSS budget warnings in build are cosmetic (dev mode unaffected)

## Environment Variables

**Server (.env):**
- `HF_TOKEN` - Hugging Face API token for model access

## Ports

- Frontend: `4200`
- Backend: `3001`

## License

[Your License]

## Contributors

[Your Name/Team]
