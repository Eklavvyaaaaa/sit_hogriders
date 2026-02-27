const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format' });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized: Missing token' });
            }

            if (!process.env.JWT_SECRET) {
                console.error("[CRITICAL] Server misconfiguration: process.env.JWT_SECRET is not defined.");
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Forbidden: Insufficient role permissions' });
            }

            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
        }
    };
};

module.exports = authMiddleware;
