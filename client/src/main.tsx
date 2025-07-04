import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'azure-maps-control/dist/atlas.min.css';

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress WebSocket connection errors from Vite dev server and Replit tooling
  if (event.reason && (
      (event.reason.message && (
        event.reason.message.includes('WebSocket') || 
        event.reason.message.includes('wss://localhost') ||
        event.reason.message.includes('Failed to construct \'WebSocket\'')
      )) ||
      (event.reason.stack && (
        event.reason.stack.includes('eruda.js') ||
        event.reason.stack.includes('@vite/client') ||
        event.reason.stack.includes('setupWebSocket')
      ))
    )) {
    event.preventDefault();
    return;
  }
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  // Suppress WebSocket related errors from Vite dev server and Replit tooling
  if (event.error && (
      (event.error.message && (
        event.error.message.includes('WebSocket') || 
        event.error.message.includes('wss://localhost') ||
        event.error.message.includes('Failed to construct \'WebSocket\'') ||
        event.error.message.includes('ResizeObserver loop completed') ||
        event.error.message.includes('ResizeObserver loop limit exceeded')
      )) ||
      (event.error.stack && (
        event.error.stack.includes('eruda.js') ||
        event.error.stack.includes('@vite/client') ||
        event.error.stack.includes('setupWebSocket')
      ))
    )) {
    event.preventDefault();
    return;
  }
  
  // Suppress ResizeObserver errors specifically
  if (event.message && event.message.includes('ResizeObserver')) {
    event.preventDefault();
    return;
  }
  
  console.error('Global error:', event.error);
});

// Suppress Vite debug messages and WebSocket errors
const originalConsoleDebug = console.debug;
console.debug = (...args) => {
  // Suppress "[vite] connecting..." messages
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[vite]')) {
    return;
  }
  originalConsoleDebug.apply(console, args);
};

// Override console.error to suppress WebSocket-related errors
const originalConsoleError = console.error;
console.error = (...args) => {
  // Check if any argument contains WebSocket or other noise
  const shouldSuppressError = args.some(arg => {
    if (typeof arg === 'string') {
      return arg.includes('WebSocket') || 
             arg.includes('wss://') || 
             arg.includes('Failed to construct') ||
             arg.includes('ResizeObserver loop completed');
    }
    if (arg && typeof arg === 'object' && arg.message) {
      return arg.message.includes('WebSocket') || 
             arg.message.includes('wss://') ||
             arg.message.includes('ResizeObserver loop completed');
    }
    if (arg && typeof arg === 'object' && arg.stack) {
      return arg.stack.includes('eruda.js') || 
             arg.stack.includes('@vite/client') || 
             arg.stack.includes('setupWebSocket');
    }
    return false;
  });
  
  if (!shouldSuppressError) {
    originalConsoleError.apply(console, args);
  }
};

// Enhanced console suppression for cleaner development experience
const originalConsoleLog = console.log;
console.log = (...args) => {
  const shouldSuppress = args.some(arg => {
    // Suppress DOMException objects related to WebSocket
    if (arg && typeof arg === 'object' && arg.constructor && arg.constructor.name === 'DOMException') {
      return arg.message && (arg.message.includes('WebSocket') || arg.message.includes('wss://'));
    }
    
    // Suppress string messages related to WebSocket connections
    if (typeof arg === 'string') {
      return arg.includes('WebSocket connected successfully') ||
             arg.includes('WebSocket message received') ||
             arg.includes('WebSocket connection to') ||
             arg.includes('connecting...') ||
             arg.includes('Download the React DevTools') ||
             arg.includes('wss://');
    }
    
    // Suppress WebSocket message objects
    if (typeof arg === 'object' && arg !== null) {
      return (arg.type === 'connection_status') ||
             (arg.type === 'mqtt_message') ||
             (arg.data && typeof arg.data === 'object');
    }
    
    return false;
  });
  
  if (!shouldSuppress) {
    originalConsoleLog.apply(console, args);
  }
};

// Add global error handler to suppress unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress WebSocket-related unhandled promise rejections
  if (event.reason && typeof event.reason === 'object') {
    if (event.reason.message && event.reason.message.includes('WebSocket')) {
      event.preventDefault();
      return;
    }
  }
  if (typeof event.reason === 'string' && event.reason.includes('WebSocket')) {
    event.preventDefault();
    return;
  }
});

// Override console.warn to suppress DOM warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const shouldSuppressWarn = args.some(arg => {
    if (typeof arg === 'string') {
      return arg.includes('autocomplete attributes') ||
             arg.includes('WebSocket') ||
             arg.includes('Download the React DevTools');
    }
    return false;
  });
  
  if (!shouldSuppressWarn) {
    originalConsoleWarn.apply(console, args);
  }
};

// Add global koi fish animation to body
document.addEventListener('DOMContentLoaded', () => {
  // Create the global animation container
  const animationContainer = document.createElement('div');
  animationContainer.id = 'global-koi-animation';
  animationContainer.innerHTML = `
    <div class="seaLevel"></div>
    <div class="fish">
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
    </div>
    <div class="fish">
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
      <div class="koiCoil"></div>
    </div>
  `;
  document.body.appendChild(animationContainer);
});

createRoot(document.getElementById("root")!).render(<App />);
