var self = null;

var GameClient = function(settings) {
	self = this;
	self.socket = {
		id: null,
		object: null
	};
	
	self.settings = {
		host: settings.host,
		port: settings.port
	};
	
	self.players = {
		local: null,
		remote: {},
		parted: {}
	};
	
	self.socket.object = this.connect();
	self.container = self.createContainer();
	self.scene = self.createScene();
	self.sceneMain();
	self.camera = self.createCamera();
	self.renderer = self.createRenderer();
	
	self.setupEvents();
	self.movement = {
		flags: {
			forward: false,
			backward: false,
			left: false,
			right: false,
			use: false,
			jump: false,
			walk: false
		},
		keys: {
			forward: 87,
			backward: 83,
			left: 65,
			right: 68,
			use: 69,
			jump: 32,
			walk: 16,
			escape: 27
		},
		speed: 10
	};
	
};

GameClient.prototype.connect = function() {
	var socket = io.connect(self.getAddress());
	socket.on('connected', self.socketConnected);
	socket.on('playerConnected', self.socketPlayerConnected);
	socket.on('playerDisconnected', self.socketPlayerDisconnected);
	socket.on('positionUpdate', self.socketReceivePosition);
	return socket;
};

GameClient.prototype.getAddress = function() {
	return 'http://' + self.settings.host + ':' + self.settings.port;
};

GameClient.prototype.createContainer = function() {
	var div = document.createElement('div');
	document.body.appendChild(div);
	return div;
};

GameClient.prototype.createScene = function() {
	return new THREE.Scene();
};

GameClient.prototype.sceneMain = function() {
	var playerObject = self.createPlayer({
		size: 100
	});
	playerObject.object.position = new THREE.Vector3(0, 0, 0);
	self.players.local = playerObject;
	self.scene.add(playerObject.object);
	
	var refObj, refMat, refMesh;

	refObj = new THREE.CubeGeometry(1500, 5, 5);
	refMat = new THREE.MeshBasicMaterial({color: 0xcccccc});
	refMesh = new THREE.Mesh(refObj, refMat);
	refMesh.position = new THREE.Vector3(0, 0, 0);
	self.scene.add(refMesh);
	
	refObj = new THREE.CubeGeometry(5, 5, 500);
	refMat = new THREE.MeshBasicMaterial({color: 0xcccccc});
	refMesh = new THREE.Mesh(refObj, refMat);
	refMesh.position = new THREE.Vector3(0, 0, 0);
	self.scene.add(refMesh);

};

GameClient.prototype.createPlayer = function(data) {
	if (!data.hasOwnProperty('type')) {
		data.type = Math.floor(Math.random() * 3);
	}
	if (!data.hasOwnProperty('color')) {
		data.color = '0x' + Math.floor(Math.random() * 16777215).toString(16);
	}
	var obj = null;
	switch (data.type) {
		case 0:
			obj = new THREE.CubeGeometry(data.size, data.size, data.size);
			break;
		case 1:
			obj = new THREE.CylinderGeometry(data.size / 3, data.size / 3, data.size);
			break;
		case 2:
			obj = new THREE.SphereGeometry(data.size / 2);
			break;
	}

	var material = new THREE.MeshBasicMaterial({color: data.color});
	var mesh = new THREE.Mesh(obj, material);
	return { object: mesh, type: data.type, color: data.color };
};

GameClient.prototype.createCamera = function() {
	var camera = new THREE.PerspectiveCamera(
		65,                                     // Field of View
		window.innerWidth / window.innerHeight, // Aspect Ratio
		10,                                     // Near clipping plane
		2000                                    // Far clipping plane
	);
	camera.position = new THREE.Vector3(0, 300, 1000);
	camera.lookAt(self.players.local.object.position);
	self.players.local.object.add(camera);
	return camera;
};

GameClient.prototype.createRenderer = function() {
	var renderer = new THREE.CanvasRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	self.container.appendChild(renderer.domElement);
	return renderer;
};

GameClient.prototype.render = function() {
	self.renderer.render(self.scene, self.camera);
};


/////////////////////
GameClient.prototype.setupEvents = function() {
	document.addEventListener('mousemove', self.mouseMoved, false);
	document.addEventListener('keydown', self.keyDown, false);
	document.addEventListener('keyup', self.keyUp, false);
};

GameClient.prototype.keyEvent = function(keycode, state) {
	var keys = self.movement.keys;
	switch (keycode) {
		case keys.forward:
			self.movement.flags.forward = state;
			break;
		case keys.backward:
			self.movement.flags.backward = state;
			break;
		case keys.left:
			self.movement.flags.left = state;
			break;
		case keys.right:
			self.movement.flags.right = state;
			break;
		case keys.use:
			self.movement.flags.use = state;
			break;
		case keys.jump:
			self.movement.flags.jump = state;
			break;
		case keys.walk:
			self.movement.flags.walk = state;
			break;
	}
};

GameClient.prototype.keyUp = function(event) {
	self.keyEvent(event.keyCode, false);
};

GameClient.prototype.keyDown = function(event) {
	self.keyEvent(event.keyCode, true);
};

GameClient.prototype.motion = function() {
	var direction = new THREE.Vector3(0, 0, 0);
	var move = false;
	if (self.movement.flags.forward) {
		direction.z -= 1;
		move = true;
	}
	if (self.movement.flags.backward) {
		direction.z += 1;
		move = true;
	}
	if (self.movement.flags.left) {
		direction.x -= 1;
		move = true;
	}
	if (self.movement.flags.right) {
		direction.x += 1;
		move = true;
	}
	
	if (move) {
		direction.setLength(self.movement.speed);
		self.players.local.object.position.add(self.players.local.object.position, direction);
		self.socketSendPosition(self.players.local.object.position);
	}
};
/////////////////////

GameClient.prototype.socketConnected = function(data) {
	self.socket.id = data.id;
	self.socket.object.emit('playerDetails', {
		type: self.players.local.type,
		color: self.players.local.color
	});
};

GameClient.prototype.socketPlayerConnected = function(data) {
	var player = self.createPlayer({
		size: 50,
		type: data.type,
		color: data.color
	});
	player.object.position = new THREE.Vector3(data.x, 0, data.y);
	self.scene.add(player.object);
	self.players.remote[data.id] = player;
};

GameClient.prototype.socketPlayerDisconnected = function(data) {
	self.players.remote[data.id].object.visible = false
	delete self.players.remote[data.id];
};

GameClient.prototype.socketSendPosition = function() {
	self.socket.object.emit('positionUpdate', {
		x: self.players.local.object.position.x,
		y: self.players.local.object.position.z
	});
};

GameClient.prototype.socketReceivePosition = function(data) {
	// console.log("Position update recieved: " + data);
	self.players.remote[data.id].object.position = new THREE.Vector3(data.x, 0, data.y);
};




GameClient.prototype.run = function(fps) {
	self.motion();
	self.render();
	setTimeout(
		function() {
			self.run(fps);
		},
		1 / fps * 1000
	);
}

var myClient = new GameClient({
	host: 'localhost',
	port: 8081,
});
myClient.run(30);
