# Modular RAG Frontend

A modern React application for the Modular RAG system with Claude-inspired design.

## Features

- 🎨 Claude AI-inspired minimalist design
- 🔐 JWT authentication with protected routes
- 📄 Multi-format document upload (PDF, DOCX, HTML, MD, TXT)
- 💬 Real-time chat interface with source citations
- 📱 Fully responsive design
- ⚡ Built with React 19 + Vite + Tailwind CSS v4

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Backend API running on http://localhost:8000

### Installation

```bash
# Install dependencies
bun install
# or
npm install

# Start development server
bun dev
# or
npm run dev
```

The app will be available at http://localhost:5173

### Build for Production

```bash
bun run build
# or
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/      # Generic components (Button, Input, Card, etc.)
│   ├── layout/      # Layout components (Header, Container)
│   ├── auth/        # Authentication components
│   ├── rag/         # RAG-specific components (Chat, Messages)
│   └── documents/   # Document management components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── services/        # API service layer
├── context/         # React Context providers
├── utils/           # Utility functions
└── App.jsx          # Root component with routing
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## Available Pages

- `/` - Landing page
- `/login` - User login
- `/signup` - User registration
- `/chat` - Chat interface (protected)
- `/documents` - Document management (protected)

## Tech Stack

- **React 19.1** - UI library
- **Vite 7.1** - Build tool
- **Tailwind CSS 4.0** - Styling
- **React Router 7** - Routing
- **Axios** - HTTP client

## Design System

The application follows a Claude AI-inspired design system with:
- Warm terracotta accent color (#D97757)
- Clean typography with system fonts
- Generous whitespace and subtle shadows
- Smooth transitions and animations

See `docs/DESIGN_SYSTEM.md` for complete design specifications.

## Documentation

- [Design System](docs/DESIGN_SYSTEM.md) - Complete design specifications
- [Frontend Documentation](docs/FRONTEND_DOCUMENTATION.md) - Technical documentation

## License

MIT
