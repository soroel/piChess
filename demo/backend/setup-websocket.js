const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

// Initialize Express app and HTTP server
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: wss?.clients?.size || 0
  });
});

const server = http.createServer(app);

// Create WebSocket server with ping/pong for connection health
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Handle server errors
server.on('error', (error) => {
  console.error('HTTP server error:', error);
});

// Log when server is listening
server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('WebSocket server listening on ' + bind);
});

// Store active connections and players
const clients = new Map(); // userId -> { ws, username, lastPing, ... }
const activePlayers = new Map(); // userId -> player data

// Track connection statistics
const serverStats = {
  connections: 0,
  messages: 0,
  startTime: new Date(),
  get uptime() {
    return Date.now() - this.startTime;
  },
  get activeConnections() {
    return clients.size;
  }
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const connectionId = req.headers['sec-websocket-key'] || Date.now().toString(36);
  const clientIp = req.socket.remoteAddress;
  
  console.log(`New connection from ${clientIp} (ID: ${connectionId})`);
  serverStats.connections++;
  
  // Set up ping-pong for connection health
  let isAlive = true;
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
    const client = clients.get(connectionId);
    if (client) {
      client.lastPing = Date.now();
    }
  });
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString()
  }));

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
      
      // Notify other players
      broadcastPlayerList();
    }
  });

  // Helper function to handle authentication
  function handleAuthentication(ws, { token, userId, username }) {
    console.log('Authenticating user:', { userId, username });
    
    // In a real app, verify the token here
    currentUser = userId;
    
    // Store the WebSocket connection
    clients.set(userId, { ws, username });
    
    // Add or update active player
    activePlayers.set(userId, {
      id: userId,
      username,
      status: 'online',
      lastSeen: new Date().toISOString()
    });
    
    // Send confirmation
    const authResponse = {
      type: 'authenticated',
      userId,
      username,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending auth response:', authResponse);
    ws.send(JSON.stringify(authResponse));
    
    // Send current player list (excluding the current user)
    const otherPlayers = Array.from(activePlayers.entries())
      .filter(([id]) => id !== userId)
      .map(([_, player]) => ({
        id: player.id,
        username: player.username,
        status: player.status
      }));
    
    console.log('Sending initial player list:', otherPlayers);
    ws.send(JSON.stringify({
      type: 'playerList',
      players: otherPlayers
    }));
    
    // Notify other players about the new player
    broadcastToOthers(userId, {
      type: 'playerConnected',
      player: {
        id: userId,
        username,
        status: 'online'
      }
    });
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
  
  // Helper function to handle player ready status
  function handlePlayerReady({ gameId, playerId }) {
    // In a real implementation, you would handle game start logic here
    console.log(`Player ${playerId} is ready for game ${gameId}`);
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
  
    // Helper function to broadcast to all clients except one
  function broadcastToOthers(excludeUserId, message) {
    clients.forEach(({ ws }, userId) => {
      if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
  
  // Helper function to broadcast player list to all clients
  function broadcastPlayerList() {
    const playerList = Array.from(activePlayers.entries())
      .map(([_, player]) => ({
        id: player.id,
        username: player.username,
        status: player.status
      }));
    
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

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Helper function to broadcast player list to all clients
function broadcastPlayerList() {
  const playerList = Array.from(activePlayers.entries()).map(([id, player]) => ({
    id,
    username: player.username,
    status: player.status
  }));
  
  // Broadcast to all connected clients
  broadcastToAll({
    type: 'playerList',
    players: playerList
  });
}

// Helper function to broadcast to all connected clients
function broadcastToAll(message) {
  const messageString = JSON.stringify(message);
  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageString);
    }
  });
}

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('SIGTERM received. Shutting down gracefully');
  
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1001, 'Server is shutting down');
    }
  });
  
  // Close the server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Clear any intervals or timeouts
    clearInterval(connectionCheckInterval);
    
    console.log('Server shutdown complete');
    process.exit(0);
  });
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Attempt to log the error before exiting
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Periodic connection health check
const connectionCheckInterval = setInterval(() => {
  const now = Date.now();
  clients.forEach(({ ws, lastPing }, userId) => {
    if (now - lastPing > 30000) { // 30 seconds without ping
      console.log(`Terminating stale connection for user ${userId}`);
      ws.terminate();
      clients.delete(userId);
      activePlayers.delete(userId);
      broadcastPlayerList();
    }
  });
}, 15000); // Check every 15 seconds
