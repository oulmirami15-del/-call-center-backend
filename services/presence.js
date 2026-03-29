const agentsStatus = {
  agent1: 'offline', // 'online' | 'busy' | 'offline'
  agent2: 'offline',
  agent3: 'offline',
  agent4: 'offline'
};

let ioInstance;

function initSocket(io) {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    // We expect the agent dashboard to send `register` when connecting
    socket.on('register', (agentId) => {
      socket.join('agents_room');
      agentsStatus[agentId] = 'online';
      broadcastPresence();
      console.log(`${agentId} registered and online`);
    });

    socket.on('agent:online', (agentId) => setStatus(agentId, 'online'));
    socket.on('agent:busy', (agentId) => setStatus(agentId, 'busy'));
    socket.on('agent:offline', (agentId) => setStatus(agentId, 'offline'));

    // If an agent disconnects, we ideally need to know WHICH agent disconnected to mark them offline.
    // For simplicity, agents will emit agent:offline explicitly when unmounting.
    socket.on('disconnect', () => {
      // In a real scenario, map socket.id to agent.id to auto-mark offline on disconnect
    });
  });
}

function setStatus(agentId, status) {
  if (agentsStatus.hasOwnProperty(agentId)) {
    agentsStatus[agentId] = status;
    broadcastPresence();
  }
}

function broadcastPresence() {
  if (ioInstance) {
    ioInstance.to('agents_room').emit('presence:update', agentsStatus);
  }
}

function getOnlineAgents() {
  // Returns agent IDs that are currently 'online'
  return Object.keys(agentsStatus).filter(id => agentsStatus[id] === 'online');
}

module.exports = {
  initSocket,
  setStatus,
  getOnlineAgents,
  agentsStatus
};
