import { Schema, model } from 'mongoose';

const truckSchema = new Schema({
  truckNumber: {
    type: String,
    required: [true, 'Truck number is required'],
    unique: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: [true, 'Truck capacity is required'],
    min: [0, 'Capacity cannot be negative'],
  },
  driverName: {
    type: String,
    required: [true, 'Driver name is required'],
    trim: true,
  },
  driverMobile: {
    type: String,
    required: [true, 'Driver mobile number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'],
  },
  route: {
    type: String,
    required: [true, 'Route is required'],
    trim: true,
  },
}, {
  timestamps: true,
});

truckSchema.index({ truckNumber: 1 });

export const Truck = model('Truck', truckSchema);
export default Truck;
