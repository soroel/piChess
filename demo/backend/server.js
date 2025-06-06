const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections and players
const clients = new Map(); // userId -> { ws, username, ... }
const activePlayers = new Map(); // userId -> player data

// Middleware for parsing JSON bodies
app.use(express.json());

// Simple in-memory store for matchmaking
const matchmakingQueue = [];

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let currentUser = null;

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      switch (data.type) {
        case 'authenticate':
          handleAuthentication(ws, data);
          break;
          
        case 'challenge':
          handleChallenge(data);
          break;
          
        case 'challengeResponse':
          handleChallengeResponse(data);
          break;
          
        case 'playerReady':
          handlePlayerReady(data);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format'
      }));
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentUser) {
      // Remove from active players
      activePlayers.delete(currentUser);
      clients.delete(currentUser);
      
      // Remove from matchmaking queue
      const queueIndex = matchmakingQueue.findIndex(id => id === currentUser);
      if (queueIndex !== -1) {
        matchmakingQueue.splice(queueIndex, 1);
      }
      
      // Notify other players
      broadcastPlayerList();
    }
  });

  // Helper function to handle authentication
  function handleAuthentication(ws, { token, userId, username }) {
    // In a real app, verify the token here
    currentUser = userId;
    
    // Store the WebSocket connection
    clients.set(userId, { ws, username });
    
    // Add to active players
    activePlayers.set(userId, {
      id: userId,
      username,
      status: 'online'
    });
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'authenticated',
      userId,
      username
    }));
    
    // Send current player list
    broadcastPlayerList();
  }
  
  // Helper function to handle challenges
  function handleChallenge({ to, matchId, from }) {
    const targetClient = clients.get(to);
    const challenger = activePlayers.get(from);
    
    if (targetClient && challenger) {
      // Send challenge to target player
      targetClient.ws.send(JSON.stringify({
        type: 'challengeReceived',
        from: {
          id: from,
          username: challenger.username
        },
        matchId
      }));
      
      // Update status to 'challenging'
      updatePlayerStatus(from, 'challenging');
    }
  }
  
  // Helper function to handle challenge responses
  function handleChallengeResponse({ matchId, accepted, to }) {
    const targetClient = clients.get(to);
    const respondingPlayer = activePlayers.get(currentUser);
    
    if (targetClient && respondingPlayer) {
      if (accepted) {
        // Notify challenger that challenge was accepted
        targetClient.ws.send(JSON.stringify({
          type: 'challengeAccepted',
          matchId,
          opponent: {
            id: currentUser,
            username: respondingPlayer.username
          }
        }));
        
        // Update status to 'in-game' for both players
        updatePlayerStatus(currentUser, 'in-game');
        updatePlayerStatus(to, 'in-game');
      } else {
        // Notify challenger that challenge was declined
        targetClient.ws.send(JSON.stringify({
          type: 'challengeDeclined',
          matchId,
          username: respondingPlayer.username
        }));
        
        // Reset status to 'online'
        updatePlayerStatus(currentUser, 'online');
        updatePlayerStatus(to, 'online');
      }
    }
  }
  
  // Helper function to update player status
  function updatePlayerStatus(userId, status) {
    const player = activePlayers.get(userId);
    if (player) {
      player.status = status;
      activePlayers.set(userId, player);
      broadcastPlayerList();
    }
  }
  
  // Helper function to broadcast player list to all clients
  function broadcastPlayerList() {
    const playerList = Array.from(activePlayers.values());
    
    clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'playerList',
          players: playerList
        }));
      }
    });
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
