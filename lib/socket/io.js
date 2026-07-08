/** @type {import('socket.io').Server | null} */
let io = null;

function setIO(instance) {
    io = instance;
}

function getIO() {
    if (!io) {
        throw new Error('Socket.IO is not initialized');
    }
    return io;
}

module.exports = { setIO, getIO };
