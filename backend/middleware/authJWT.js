// middleware/authJWT.js
const jwt = require('jsonwebtoken');

exports.authenticateJWT = (req, res, next) => {
    let token = req.cookies.token;

    // Stöd för Bearer-token i Authorization-header
    if (!token && req.headers.authorization) {
        const [scheme, tkn] = req.headers.authorization.split(' ');
        if (scheme === 'Bearer') token = tkn;
    }

    if (!token) {
        return res.status(401).json({ message: 'Ej auktoriserad' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Ogiltig token' });
    }
};
