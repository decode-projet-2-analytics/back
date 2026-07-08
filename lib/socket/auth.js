async function authenticateBackofficeSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token;

        if (!token || typeof token !== 'string') {
            return next(new Error('Authentication required'));
        }

        const User = require('../../models/user');
        const { verifyAccessToken } = require('../jwt');

        const payload = verifyAccessToken(token);
        const user = await User.findByPk(payload.sub);

        if (!user) return next(new Error('User not found'));
        if (user.status !== 'validated') return next(new Error('Account not validated'));
        if (user.role !== 'Admin' && user.role !== 'Webmaster') {
            return next(new Error('Insufficient permissions'));
        }

        socket.data.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
            firstname: user.firstname,
        };

        return next();
    } catch {
        return next(new Error('Unauthorized'));
    }
}

module.exports = { authenticateBackofficeSocket };
