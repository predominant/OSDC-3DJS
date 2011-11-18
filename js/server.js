///////

var GameServer = {
	settings: {
		port: 8081
	},
	clients: {}
};
var GS = GameServer;

///////

var io = require('socket.io').listen(GS.settings.port);
io.configure(function() {
	io.set('transports', ['websocket']);
});

///////

io.sockets.on('connection', function(socket) {
	console.log('    Connection established. ID: ' + socket.id);

	for (var id in GS.clients) {
		socket.emit('playerConnected', {
			id: id,
			x: GS.clients[id].position.x,
			y: GS.clients[id].position.y,
			type: GS.clients[id].type,
			color: GS.clients[id].color
		});
	}
	
	GS.clients[socket.id] = {
		position: {
			x: 0,
			y: 0
		},
		type: null,
		color: null
	};
	
	socket.emit('connected', {});

	socket.on('playerDetails', function(data) {
		GS.clients[socket.id].type = data.type;
		GS.clients[socket.id].color = data.color;
		
		// Announce the new player connected
		socket.broadcast.emit('playerConnected', {
			id: socket.id,
			type: data.type,
			color: data.color
		});
	});
	

	// Re-transmit position updates as soon as they are recieved
	socket.on('positionUpdate', function(data) {
		console.log('Position Received');
		socket.broadcast.emit('positionUpdate', {
			id: socket.id,
			x: data.x,
			y: data.y
		});
		
		// Store each position
		GS.clients[socket.id].position = {
			x: data.x,
			y: data.y
		};
	});
	
	socket.on('disconnect', function() {
		// Announce a player disconnecting
		console.log("EMIT: playerDisconnected");
		socket.broadcast.emit('playerDisconnected', {
			id: socket.id
		});
		delete GS.clients[socket.id];
	});
});
