# Snap! Rubric Generator

An AI-powered rubric generation system for Snap! programming assignments using Angular 18 frontend and Node.js backend with RAG (Retrieval-Augmented Generation).

## Documentation

- Stakeholder overview of the database plan: docs/db-plan.md

## Project Structure

```
snapclass-rubrics-generator/
├── client/                 # Angular 18 frontend (Production-ready)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Core functionality (interceptors, guards)
│   │   │   │   └── interceptors/
│   │   │   │       ├── error.interceptor.ts
│   │   │   │       └── logging.interceptor.ts
│   │   │   ├── shared/         # Shared resources (models, components)
│   │   │   │   └── models/
│   │   │   │       └── rubric.model.ts
│   │   │   ├── services/       # API services
│   │   │   │   └── rubric-api.service.ts
│   │   │   ├── pages/          # Feature pages/components
│   │   │   │   ├── home/
│   │   │   │   └── rubric-display/
│   │   │   ├── app.component.*
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── environments/       # Environment configurations
│   │   │   ├── environment.ts
│   │   │   └── environment.development.ts
│   │   └── index.html
│   ├── angular.json
│   └── package.json
│
└── server/                 # Node.js backend (Production-ready)
    ├── src/
    │   ├── config/            # Configuration files
    │   │   ├── env.config.js
    │   │   └── cors.config.js
    │   ├── controllers/       # Request handlers
    │   │   └── rubric.controller.js
    │   ├── services/          # Business logic
    │   │   ├── ai.service.js
    │   │   ├── rag.service.js
    │   │   ├── prompt.service.js
    │   │   └── rubric.service.js
    │   ├── routes/            # API routes
    │   │   ├── index.js
    │   │   └── rubric.routes.js
    │   ├── middleware/        # Express middleware
    │   │   ├── error.middleware.js
    │   │   └── logger.middleware.js
    │   ├── app.js             # Express app configuration
    │   └── server.js          # Server entry point
    ├── data/                  # Data files
    │   └── all_assignments.json
    ├── .env.example           # Environment template
    ├── SnapManual.pdf         # RAG document (not in git)
    └── package.json
```

## Features

- **AI-Powered Generation**: Uses Llama 3.1 70B via Hugging Face for intelligent rubric creation
- **RAG Pipeline**: Retrieves relevant context from Snap! programming manual using vector search
- **Row-Level Regeneration**: Regenerate entire category objectives while preserving point scales
- **Interactive Editing**: Double-click cells to edit, with inline controls
- **Tier-Aware AI**: Understands scoring tiers and maintains consistency across objectives
- **Responsive UI**: Clean, modern interface with expandable instruction panels
- **Production-Ready Architecture**: Proper separation of concerns with MVC pattern
- **Error Handling**: Global error middleware with detailed logging
- **Environment Configuration**: Separate configs for development and production

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

3. **Add the Snap! Manual PDF**:
   - Download or copy `SnapManual.pdf` to the `server/` directory
   - This file is required for the RAG pipeline but not included in git (it's large)

4. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and add your Hugging Face token:
   ```env
   HF_TOKEN=your_hugging_face_token_here
   PORT=3001
   NODE_ENV=development
   ```

6. Start the server:
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
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
   # or
   ng serve
   ```
   Frontend runs on `http://localhost:4200`

4. Build for production:
   ```bash
   npm run build
   # Output: dist/client-angular/
   ```

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
- **HTTP Interceptors** - Error handling and logging
- **Environment-based Configuration** - Dev/Prod separation

### Backend
- **Node.js + Express** - REST API server with MVC architecture
- **LangChain** - RAG pipeline orchestration
- **Hugging Face Inference** - Llama 3.1 70B Instruct
- **Ollama Embeddings** - Local vector embeddings
- **MemoryVectorStore** - In-memory vector search (904 chunks)
- **PDFLoader** - Snap! manual ingestion
- **Layered Architecture** - Controllers → Services → Models

## API Endpoints

### Base URL: `/api`

- **Health Check**
  - `GET /api/health` - Server health status

- **Rubric Generation**
  - `POST /api/rubric/generate` - Generate complete rubric
    ```json
    {
      "title": "Assignment Title",
      "description": "Assignment description",
      "question": "Optional requirements"
    }
    ```

- **Rubric Regeneration**
  - `POST /api/rubric/regenerate-row` - Regenerate entire category
    ```json
    {
      "title": "Assignment Title",
      "description": "Assignment description",
      "categoryName": "Category Name",
      "categoryReasoning": "Category purpose",
      "objectives": [...],
      "instruction": "Optional AI guidance"
    }
    ```

  - `POST /api/rubric/regenerate-cell` - Regenerate single objective
    ```json
    {
      "title": "Assignment Title",
      "description": "Assignment description",
      "categoryName": "Category Name",
      "categoryReasoning": "Category purpose",
      "allObjectives": [...],
      "existingObjective": {...},
      "instruction": "Optional AI guidance"
    }
    ```

## Environment Variables

### Server Configuration (`.env`)

```env
# Required
HF_TOKEN=your_hugging_face_token_here

# Optional (with defaults)
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*

# AI Model Configuration
AI_MODEL=meta-llama/Llama-3.1-70B-Instruct
MAX_TOKENS=2048
TEMPERATURE=0.7

# RAG Configuration
DOC_PATH=SnapManual.pdf
CHUNK_SIZE=500
CHUNK_OVERLAP=50
SEARCH_RESULTS=5
```

### Client Configuration

Edit `src/environments/environment.ts` for production:
```typescript
export const environment = {
  production: true,
  apiUrl: '/api', // Relative URL for production
  apiTimeout: 60000,
};
```

Edit `src/environments/environment.development.ts` for development:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  apiTimeout: 60000,
};
```

## Deployment

### Backend Deployment

1. Set environment variables on your server
2. Install dependencies: `npm install --production`
3. Start server: `npm start`
4. Ensure `SnapManual.pdf` is in the server directory

### Frontend Deployment

1. Build for production: `npm run build`
2. Deploy `dist/client-angular/` folder to your web server
3. Configure server to serve `index.html` for all routes (SPA routing)
4. Update `environment.ts` with production API URL

### Docker Deployment (Future Enhancement)

Consider containerizing both frontend and backend for easier deployment.

## Development Notes

- Backend initializes vector store at startup (904 chunks from Snap! manual)
- Point values are preserved during regeneration to maintain table alignment
- Objectives sorted descending by points (highest quality → lowest)
- HTTP interceptors provide automatic error handling and request/response logging
- Modular service architecture allows easy testing and maintenance

## Ports

- Frontend: `4200` (development)
- Backend: `3001` (configurable via .env)

## Scripts

### Server
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

### Client
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `ng serve` - Alternative to start dev server
- `ng build --configuration production` - Production build

## Architecture Highlights

### Backend (MVC Pattern)
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic and orchestration
- **Config**: Centralized configuration management
- **Middleware**: Cross-cutting concerns (logging, errors)
- **Routes**: API endpoint definitions

### Frontend (Angular Best Practices)
- **Core Module**: Singleton services and app-wide functionality
- **Shared Module**: Reusable components and models
- **Feature Modules**: Lazy-loaded page components
- **Interceptors**: HTTP request/response transformation
- **Environment Files**: Configuration per environment

## License

MIT

## Contributors

[Your Name/Team]

