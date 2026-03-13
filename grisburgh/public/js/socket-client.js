export function initSocket() {
  const socket = io();

  socket.on('entity:updated', () => {
    if (window.app.state.activeSection === 'campagne') {
      import('./render-campagne.js').then(m => m.renderCampagne());
    } else if (window.app.state.activeSection === 'dashboard') {
      import('./render-dashboard.js').then(m => m.renderDashboard());
    }
  });

  socket.on('entity:visibility', () => {
    if (window.app.state.activeSection === 'campagne') {
      import('./render-campagne.js').then(m => m.renderCampagne());
    } else if (window.app.state.activeSection === 'dashboard') {
      import('./render-dashboard.js').then(m => m.renderDashboard());
    }
  });

  socket.on('entity:secret', () => {
    if (window.app.state.activeSection === 'campagne') {
      import('./render-campagne.js').then(m => m.renderCampagne());
    }
  });

  socket.on('archief:updated', () => {
    if (window.app.state.activeSection === 'archief') {
      import('./render-archief.js').then(m => m.renderArchief());
    }
  });

  socket.on('archief:stateChanged', () => {
    if (window.app.state.activeSection === 'archief') {
      import('./render-archief.js').then(m => m.renderArchief());
    }
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));
}
