import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log("MLA Store: React main.jsx entry point hit.");
window.onerror = function(msg, url, line, col, error) {
  console.error("GLOBAL ERROR:", msg, "at", url, ":", line);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
