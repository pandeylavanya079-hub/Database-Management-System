import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'pitambara_doodh_dairy_secret_token_key_2026');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    if (!req.user.isActive) {
      res.status(403).json({ message: 'User account is deactivated' });
      return;
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: `Role '${req.user.role}' is not authorized to access this resource` });
      return;
    }

    next();
  };
};
