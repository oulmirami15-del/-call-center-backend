require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});

const { initDb } = require('./services/db');
initDb();

const presenceService = require('./services/presence');
presenceService.initSocket(io);

const twilioRoutes = require('./routes/twilio');
const agentsRoutes = require('./routes/agents');
const callsRoutes  = require('./routes/calls');

app.use('/twilio', twilioRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/calls', callsRoutes);

app.set('socketio', io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
