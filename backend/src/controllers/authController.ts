import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pitambara_doodh_dairy_secret_token_key_2026', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Check if any user exists in database
    const userCount = await User.countDocuments();

    // If users exist, only Admin can create new users
    if (userCount > 0) {
      if (!req.user || req.user.role !== 'Admin') {
        res.status(403).json({ message: 'Only Admin users can register new accounts' });
        return;
      }
    }

    // Create user. If it's the first user, default to Admin
    const actualRole = userCount === 0 ? 'Admin' : (role || 'Staff');

    const user = await User.create({
      name,
      email,
      password,
      role: actualRole,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const loginUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account has been deactivated' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }
  res.json(req.user);
};

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Don't allow toggling oneself
    if (user._id.toString() === req.user?._id.toString()) {
      res.status(400).json({ message: 'You cannot deactivate your own account' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}` });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
