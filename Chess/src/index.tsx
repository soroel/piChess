import React from 'react';
import ReactDOM from 'react-dom';
import 'normalize.css';
import './defaults.css';
import PiWrapper from './PiWrapper';

// Set Pi Network sandbox mode for development
if (window.Pi) {
  window.Pi.init = { sandbox: true }; // Set to false for production
}

ReactDOM.render(
  <React.StrictMode>
    <PiWrapper />
  </React.StrictMode>,
  document.getElementById('root')
);