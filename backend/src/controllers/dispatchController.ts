import { Response } from 'express';
import { TruckDispatch } from '../models/TruckDispatch';
import { Truck } from '../models/Truck';
import { AuthenticatedRequest } from '../middleware/auth';

export const getDispatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startDate, endDate, truckId } = req.query;
  const filter: any = {};

  if (startDate || endDate) {
    filter.dispatchDate = {};
    if (startDate) filter.dispatchDate.$gte = new Date(startDate as string);
    if (endDate) filter.dispatchDate.$lte = new Date(endDate as string);
  }

  if (truckId) {
    filter.truckId = truckId;
  }

  try {
    const dispatches = await TruckDispatch.find(filter).sort({ dispatchDate: -1 });
    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createDispatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { dispatchDate, truckId, quantityLoaded, dispatchTime, arrivalTime } = req.body;

  try {
    const truck = await Truck.findById(truckId);
    if (!truck) {
      res.status(404).json({ message: 'Truck not found' });
      return;
    }

    if (quantityLoaded > truck.capacity) {
      res.status(400).json({
        message: `Quantity loaded (${quantityLoaded}L) exceeds the truck's maximum capacity (${truck.capacity}L)`,
      });
      return;
    }

    const dispatch = await TruckDispatch.create({
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      truckId,
      truckNumber: truck.truckNumber,
      driverName: truck.driverName,
      route: truck.route,
      quantityLoaded,
      dispatchTime,
      arrivalTime,
    });

    res.status(201).json(dispatch);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateDispatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { arrivalTime, quantityLoaded, dispatchTime } = req.body;

  try {
    const dispatch = await TruckDispatch.findById(id);
    if (!dispatch) {
      res.status(404).json({ message: 'Dispatch log not found' });
      return;
    }

    if (quantityLoaded !== undefined) {
      const truck = await Truck.findById(dispatch.truckId);
      if (truck && quantityLoaded > truck.capacity) {
        res.status(400).json({
          message: `Quantity loaded (${quantityLoaded}L) exceeds truck capacity (${truck.capacity}L)`,
        });
        return;
      }
      dispatch.quantityLoaded = quantityLoaded;
    }

    if (arrivalTime !== undefined) dispatch.arrivalTime = arrivalTime;
    if (dispatchTime !== undefined) dispatch.dispatchTime = dispatchTime;

    await dispatch.save();
    res.json(dispatch);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteDispatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const dispatch = await TruckDispatch.findById(req.params.id);
    if (!dispatch) {
      res.status(404).json({ message: 'Dispatch log not found' });
      return;
    }
    await dispatch.deleteOne();
    res.json({ message: 'Dispatch log removed' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
