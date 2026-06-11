import { Response } from 'express';
import { Truck } from '../models/Truck';
import { TruckDispatch } from '../models/TruckDispatch';
import { AuthenticatedRequest } from '../middleware/auth';

export const getTrucks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const trucks = await Truck.find({}).sort({ truckNumber: 1 });
    res.json(trucks);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTruckById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      res.status(404).json({ message: 'Truck not found' });
      return;
    }
    res.json(truck);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createTruck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { truckNumber, capacity, driverName, driverMobile, route } = req.body;
  try {
    const truckExists = await Truck.findOne({ truckNumber });
    if (truckExists) {
      res.status(400).json({ message: 'Truck with this number already exists' });
      return;
    }

    const truck = await Truck.create({
      truckNumber,
      capacity,
      driverName,
      driverMobile,
      route,
    });

    res.status(201).json(truck);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateTruck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const truck = await Truck.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!truck) {
      res.status(404).json({ message: 'Truck not found' });
      return;
    }
    res.json(truck);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteTruck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) {
      res.status(404).json({ message: 'Truck not found' });
      return;
    }
    await truck.deleteOne();
    res.json({ message: 'Truck removed successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTruckHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const dispatches = await TruckDispatch.find({ truckId: req.params.id }).sort({ dispatchDate: -1 });
    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
