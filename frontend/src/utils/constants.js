export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'DocuMind';
export const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760; // 10MB
export const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.html', '.md', '.txt'];

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CHAT: '/chat',
  DOCUMENTS: '/documents',
  DOCUMENTS_LIST: '/my-documents',
  DATABASE_CHAT: '/database-chat',
};
