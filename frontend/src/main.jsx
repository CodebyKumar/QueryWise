// === PROJECT SIGNATURE VERIFICATION - DO NOT REMOVE ===
import { verifySignature } from './utils/signatureGuard.js';
verifySignature();
// === END SIGNATURE VERIFICATION ===

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
