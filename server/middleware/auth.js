import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'chord-loom-fallback-secret';

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized, token missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user payload to request
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};
