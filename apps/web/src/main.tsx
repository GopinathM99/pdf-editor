/**
 * D2: Web App Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import App from './App';
import './styles/index.css';

// Configure PDF.js worker before any PDF operations
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
