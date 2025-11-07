# Frontend Documentation
## Modular RAG Application - React + Tailwind CSS

---

## Overview

A modern, responsive React application for the Modular RAG system featuring Claude-inspired design, real-time document processing, and intelligent query interface.

**Tech Stack:**
- React 19.1.1
- Vite 7.1.7
- Tailwind CSS 4.0
- React Router (for navigation)
- Axios (for API calls)
- React Query (for state management)

**Design Language:** Claude AI-inspired minimalist aesthetic

---

## Project Structure

```
frontend/
├── public/                      # Static assets
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── assets/                  # Images, fonts, icons
│   │   ├── icons/
│   │   └── images/
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Generic components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── Spinner.jsx
│   │   ├── layout/              # Layout components
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Container.jsx
│   │   ├── auth/                # Authentication components
│   │   │   ├── LoginForm.jsx
│   │   │   ├── SignupForm.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── rag/                 # RAG-specific components
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── QueryInput.jsx
│   │   │   ├── SourceCard.jsx
│   │   │   └── TypingIndicator.jsx
│   │   └── documents/           # Document management
│   │       ├── DocumentUpload.jsx
│   │       ├── DocumentList.jsx
│   │       ├── FilePreview.jsx
│   │       └── UploadProgress.jsx
│   ├── pages/                   # Page components
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── DocumentsPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   ├── useDocuments.js
│   │   ├── useToast.js
│   │   └── useLocalStorage.js
│   ├── services/                # API service layer
│   │   ├── api.js               # Axios instance
│   │   ├── authService.js       # Auth API calls
│   │   ├── ragService.js        # RAG API calls
│   │   └── documentService.js   # Document API calls
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── ToastContext.jsx
│   ├── utils/                   # Utility functions
│   │   ├── formatters.js        # Date, text formatters
│   │   ├── validators.js        # Form validation
│   │   ├── constants.js         # App constants
│   │   └── helpers.js           # Helper functions
│   ├── styles/                  # Global styles
│   │   ├── index.css            # Tailwind imports
│   │   └── animations.css       # Custom animations
│   ├── App.jsx                  # Root component
│   └── main.jsx                 # Entry point
├── docs/                        # Documentation
│   ├── DESIGN_SYSTEM.md
│   └── FRONTEND_DOCUMENTATION.md
├── .env.example                 # Environment variables template
├── .gitignore
├── index.html                   # HTML template
├── package.json
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
├── postcss.config.js            # PostCSS configuration
└── README.md
```

---

## Core Features

### 1. Authentication System
- **Login/Signup Forms** with validation
- **JWT Token Management** with automatic refresh
- **Protected Routes** with redirect logic
- **Persistent Sessions** using localStorage
- **User Profile Display** in header

### 2. Document Management
- **Multi-format Upload** (PDF, DOCX, HTML, MD, TXT)
- **Drag & Drop Interface** for easy file upload
- **Upload Progress Tracking** with visual feedback
- **Document List View** with metadata
- **File Preview** before indexing
- **Batch Upload Support**

### 3. Chat Interface
- **Real-time Query Input** with auto-resize textarea
- **Message History** with scroll management
- **Typing Indicators** during AI processing
- **Source Citations** with expandable cards
- **Copy Response** functionality
- **Query Suggestions** for new users
- **Markdown Rendering** in responses

### 4. RAG Pipeline Visualization
- **Processing Steps Display** (Pre-retrieval, Retrieval, etc.)
- **Loading States** for each module
- **Error Handling** with user-friendly messages
- **Retry Mechanism** for failed queries

### 5. Responsive Design
- **Mobile-First Approach**
- **Tablet & Desktop Optimizations**
- **Touch-Friendly Interactions**
- **Adaptive Layouts**

---

## Key Components

### Common Components

#### Button Component
```jsx
// src/components/common/Button.jsx
<Button 
  variant="primary|secondary|ghost"
  size="sm|md|lg"
  loading={boolean}
  disabled={boolean}
  onClick={handler}
>
  Button Text
</Button>
```

**Variants:**
- `primary`: Accent color background
- `secondary`: Outlined style
- `ghost`: Transparent with hover effect

#### Input Component
```jsx
// src/components/common/Input.jsx
<Input
  type="text|email|password"
  label="Label Text"
  placeholder="Placeholder"
  error="Error message"
  value={value}
  onChange={handler}
  required={boolean}
/>
```

#### Card Component
```jsx
// src/components/common/Card.jsx
<Card 
  hover={boolean}
  padding="sm|md|lg"
  shadow={boolean}
>
  Card Content
</Card>
```

### Layout Components

#### Header Component
```jsx
// src/components/layout/Header.jsx
Features:
- Logo and app title
- Navigation links
- User profile dropdown
- Logout button
- Responsive hamburger menu
```

#### Container Component
```jsx
// src/components/layout/Container.jsx
<Container maxWidth="sm|md|lg|xl|2xl">
  Page Content
</Container>
```

### RAG Components

#### ChatInterface Component
```jsx
// src/components/rag/ChatInterface.jsx
Features:
- Message list with auto-scroll
- Query input with submit
- Source display
- Loading states
- Empty state for new chats
```

#### MessageBubble Component
```jsx
// src/components/rag/MessageBubble.jsx
<MessageBubble
  type="user|assistant"
  content="Message text"
  sources={[]}
  timestamp={date}
/>
```

**User Message:**
- Right-aligned
- Warm background color
- Compact padding

**Assistant Message:**
- Left-aligned
- White background with border
- Expandable source citations
- Copy button

#### SourceCard Component
```jsx
// src/components/rag/SourceCard.jsx
<SourceCard
  title="Document Title"
  content="Excerpt text..."
  score={0.92}
  expanded={boolean}
  onToggle={handler}
/>
```

### Document Components

#### DocumentUpload Component
```jsx
// src/components/documents/DocumentUpload.jsx
Features:
- Drag & drop zone
- File type validation
- Size limit checking
- Multiple file support
- Upload progress bar
- Success/error feedback
```

#### DocumentList Component
```jsx
// src/components/documents/DocumentList.jsx
Features:
- Grid/list view toggle
- Document cards with metadata
- Search/filter functionality
- Delete confirmation
- Empty state
```

---

## Pages

### HomePage
**Route:** `/`

**Features:**
- Hero section with app description
- Feature highlights
- Call-to-action buttons
- Quick start guide

**Layout:**
```jsx
<Header />
<HeroSection />
<FeaturesSection />
<CTASection />
<Footer />
```

### LoginPage
**Route:** `/login`

**Features:**
- Login form with validation
- "Remember me" checkbox
- Forgot password link
- Sign up redirect link
- Error message display

### SignupPage
**Route:** `/signup`

**Features:**
- Registration form
- Password strength indicator
- Terms acceptance checkbox
- Login redirect link
- Success message

### ChatPage
**Route:** `/chat`

**Protected:** Yes

**Features:**
- Full-screen chat interface
- Sidebar with chat history
- New chat button
- Settings panel
- Export conversation

**Layout:**
```jsx
<Header />
<div className="flex">
  <Sidebar />
  <ChatInterface />
</div>
```

### DocumentsPage
**Route:** `/documents`

**Protected:** Yes

**Features:**
- Document upload section
- Document list/grid
- Search and filters
- Bulk actions
- Statistics dashboard

---

## Custom Hooks

### useAuth Hook
```javascript
// src/hooks/useAuth.js
const {
  user,           // Current user object
  isAuthenticated, // Boolean auth status
  isLoading,      // Loading state
  login,          // Login function
  signup,         // Signup function
  logout,         // Logout function
  updateUser      // Update user info
} = useAuth();
```

### useChat Hook
```javascript
// src/hooks/useChat.js
const {
  messages,       // Array of messages
  isLoading,      // Query processing state
  sendMessage,    // Send query function
  clearChat,      // Clear conversation
  error           // Error state
} = useChat();
```

### useDocuments Hook
```javascript
// src/hooks/useDocuments.js
const {
  documents,      // Array of documents
  isLoading,      // Loading state
  uploadDocument, // Upload function
  deleteDocument, // Delete function
  refetch         // Refresh list
} = useDocuments();
```

### useToast Hook
```javascript
// src/hooks/useToast.js
const { showToast } = useToast();

showToast({
  type: 'success|error|warning|info',
  message: 'Toast message',
  duration: 3000
});
```

---

## Services

### API Service
```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth Service
```javascript
// src/services/authService.js
export const authService = {
  async login(username, password) {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
  
  async signup(userData) {
    const response = await api.post('/signup', userData);
    return response.data;
  },
  
  async getCurrentUser() {
    const response = await api.get('/me');
    return response.data;
  }
};
```

### RAG Service
```javascript
// src/services/ragService.js
export const ragService = {
  async query(queryText, topK = 5) {
    const response = await api.post('/rag/query', {
      query: queryText,
      top_k: topK
    });
    return response.data;
  },
  
  async indexDocument(document) {
    const response = await api.post('/rag/index', document);
    return response.data;
  }
};
```

### Document Service
```javascript
// src/services/documentService.js
export const documentService = {
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/rag/upload-and-index', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressEvent => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(progress);
      }
    });
    return response.data;
  }
};
```

---

## State Management

### Context Providers

#### AuthContext
```jsx
// src/context/AuthContext.jsx
<AuthProvider>
  <App />
</AuthProvider>
```

**Provides:**
- User authentication state
- Login/logout functions
- Token management
- User profile data

#### ToastContext
```jsx
// src/context/ToastContext.jsx
<ToastProvider>
  <App />
</ToastProvider>
```

**Provides:**
- Toast notification system
- Queue management
- Auto-dismiss functionality

---

## Styling

### Tailwind CSS v4 Configuration

**Note:** Tailwind CSS v4 uses CSS-based configuration instead of JavaScript config files.

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Claude-inspired color palette */
  --color-primary: #D97757;
  --color-primary-hover: #C96847;
  --color-primary-light: #F4E8E3;
  
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F7F7F5;
  --color-bg-tertiary: #EFEDE8;
  
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #5C5C5C;
  --color-text-tertiary: #8E8E8E;
  
  --color-border-light: #E8E6E0;
  --color-border-medium: #D4D2CC;
  
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
               'Helvetica Neue', Arial, sans-serif;
}
```

**Key Differences from v3:**
- No `tailwind.config.js` needed
- Import directly in CSS: `@import "tailwindcss"`
- Use `@theme` for custom design tokens
- CSS variables for theming
- Core utilities only (no custom plugins)

### Global Styles

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Design tokens defined here */
  --color-primary: #D97757;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #F7F7F5;
}

::-webkit-scrollbar-thumb {
  background: #D4D2CC;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #B8B6B0;
}
```

---

## Environment Variables

```env
# .env.example
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Modular RAG
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.docx,.html,.md,.txt
```

---

## Routing

```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents" 
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Development Workflow

### Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
- Runs on `http://localhost:5173`
- Hot Module Replacement (HMR) enabled
- Fast refresh for React components

### Code Quality

```bash
# Lint code
npm run lint

# Format code (if Prettier configured)
npm run format
```

---

## Performance Optimizations

### Code Splitting
```javascript
// Lazy load pages
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
```

### Image Optimization
- Use WebP format with fallbacks
- Lazy load images below the fold
- Responsive images with srcset

### Bundle Optimization
- Tree shaking enabled
- Minification in production
- Gzip compression

---

## Accessibility

### ARIA Labels
```jsx
<button aria-label="Send message">
  <SendIcon />
</button>
```

### Keyboard Navigation
- Tab order follows visual flow
- Enter key submits forms
- Escape key closes modals
- Arrow keys for navigation

### Screen Reader Support
- Semantic HTML elements
- Alt text for images
- Live regions for dynamic content

---

## Testing Strategy

### Unit Tests
- Component rendering
- Hook functionality
- Utility functions

### Integration Tests
- User flows
- API integration
- Form submissions

### E2E Tests
- Complete user journeys
- Authentication flow
- Document upload and query

---

## Deployment

### Build Process
```bash
npm run build
```

**Output:** `dist/` directory

### Environment-Specific Builds
```bash
# Production
VITE_API_URL=https://api.production.com npm run build

# Staging
VITE_API_URL=https://api.staging.com npm run build
```

### Hosting Options
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

---

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

---

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Voice input for queries
- [ ] Export chat as PDF
- [ ] Advanced search filters
- [ ] Real-time collaboration
- [ ] Offline mode with service workers
- [ ] Analytics dashboard
- [ ] Custom themes
- [ ] Keyboard shortcuts panel

---

**Frontend Version:** 1.0.0  
**Last Updated:** November 7, 2025  
**Maintained By:** Frontend Team
