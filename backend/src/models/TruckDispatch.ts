import { Schema, model } from 'mongoose';

const truckDispatchSchema = new Schema({
  dispatchDate: {
    type: Date,
    required: [true, 'Dispatch date is required'],
    default: Date.now,
  },
  truckId: {
    type: Schema.Types.ObjectId,
    ref: 'Truck',
    required: [true, 'Truck ID is required'],
  },
  truckNumber: {
    type: String,
    required: true,
  },
  driverName: {
    type: String,
    required: true,
  },
  route: {
    type: String,
    required: true,
  },
  quantityLoaded: {
    type: Number,
    required: [true, 'Quantity loaded is required'],
    min: [0, 'Quantity loaded cannot be negative'],
  },
  dispatchTime: {
    type: String,
    required: [true, 'Dispatch time is required'],
  },
  arrivalTime: {
    type: String,
  },
}, {
  timestamps: true,
});

truckDispatchSchema.index({ dispatchDate: -1 });
truckDispatchSchema.index({ truckId: 1, dispatchDate: -1 });

export const TruckDispatch = model('TruckDispatch', truckDispatchSchema);
export default TruckDispatch;
