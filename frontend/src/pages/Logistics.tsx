import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Truck, 
  Trash2, 
  Edit3, 
  Search, 
  Navigation, 
  Compass, 
  Clock, 
  CheckCircle2, 
  CalendarDays,
  FileText,
  ChevronRight
} from 'lucide-react';

interface TruckData {
  _id: string;
  truckNumber: string;
  capacity: number;
  driverName: string;
  driverMobile: string;
  route: string;
}

interface Dispatch {
  _id: string;
  dispatchDate: string;
  truckId: string;
  truckNumber: string;
  driverName: string;
  route: string;
  quantityLoaded: number;
  dispatchTime: string;
  arrivalTime?: string;
}

export const Logistics: React.FC = () => {
  const { user } = useAuth();
  const canModify = ['Admin', 'Manager'].includes(user?.role || '');

  // Tabs
  const [activeTab, setActiveTab] = useState<'trucks' | 'dispatches'>('trucks');

  // Core Data
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [truckModalOpen, setTruckModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);

  // Form structures
  const [truckForm, setTruckForm] = useState({
    truckNumber: '',
    capacity: '',
    driverName: '',
    driverMobile: '',
    route: '',
  });

  const [dispatchForm, setDispatchForm] = useState({
    truckId: '',
    quantityLoaded: '',
    dispatchTime: '',
    arrivalTime: '',
    dispatchDate: new Date().toISOString().substring(0, 10),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [trucksResp, dispatchesResp] = await Promise.all([
        api.get('/trucks'),
        api.get('/dispatches')
      ]);
      setTrucks(trucksResp.data);
      setDispatches(dispatchesResp.data);
    } catch (err) {
      console.error('Error loading logistics metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Truck CRUD handlers
  const handleOpenAddTruck = () => {
    setEditingTruckId(null);
    setTruckForm({ truckNumber: '', capacity: '', driverName: '', driverMobile: '', route: '' });
    setTruckModalOpen(true);
  };

  const handleOpenEditTruck = (t: TruckData) => {
    setEditingTruckId(t._id);
    setTruckForm({
      truckNumber: t.truckNumber,
      capacity: String(t.capacity),
      driverName: t.driverName,
      driverMobile: t.driverMobile,
      route: t.route,
    });
    setTruckModalOpen(true);
  };

  const handleTruckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...truckForm, capacity: Number(truckForm.capacity) };
      if (editingTruckId) {
        await api.put(`/trucks/${editingTruckId}`, payload);
      } else {
        await api.post('/trucks', payload);
      }
      setTruckModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Error registering tanker details: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const handleDeleteTruck = async (id: string) => {
    if (!window.confirm('Delete this tanker record?')) return;
    try {
      await api.delete(`/trucks/${id}`);
      loadData();
    } catch (err) {
      alert('Error deleting truck record');
    }
  };

  // Dispatch CRUD handlers
  const handleOpenAddDispatch = () => {
    setEditingDispatchId(null);
    setDispatchForm({
      truckId: trucks[0]?._id || '',
      quantityLoaded: '',
      dispatchTime: '06:00 AM',
      arrivalTime: '',
      dispatchDate: new Date().toISOString().substring(0, 10),
    });
    setDispatchModalOpen(true);
  };

  const handleOpenEditDispatch = (d: Dispatch) => {
    setEditingDispatchId(d._id);
    setDispatchForm({
      truckId: d.truckId,
      quantityLoaded: String(d.quantityLoaded),
      dispatchTime: d.dispatchTime,
      arrivalTime: d.arrivalTime || '',
      dispatchDate: new Date(d.dispatchDate).toISOString().substring(0, 10),
    });
    setDispatchModalOpen(true);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...dispatchForm,
        quantityLoaded: Number(dispatchForm.quantityLoaded),
      };
      if (editingDispatchId) {
        await api.put(`/dispatches/${editingDispatchId}`, payload);
      } else {
        await api.post('/dispatches', payload);
      }
      setDispatchModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Error saving dispatch log: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const handleDeleteDispatch = async (id: string) => {
    if (!window.confirm('Delete this dispatch log?')) return;
    try {
      await api.delete(`/dispatches/${id}`);
      loadData();
    } catch (err) {
      alert('Error deleting dispatch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('trucks')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-colors flex items-center ${
              activeTab === 'trucks'
                ? 'bg-dairy-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 mr-2" /> Tankers Registry ({trucks.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-colors flex items-center ${
              activeTab === 'dispatches'
                ? 'bg-dairy-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-4 h-4 mr-2" /> Dispatch Register ({dispatches.length})
          </button>
        </div>

        <div>
          {activeTab === 'trucks' ? (
            <button
              onClick={handleOpenAddTruck}
              className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Fleet Truck
            </button>
          ) : (
            <button
              onClick={handleOpenAddDispatch}
              disabled={trucks.length === 0}
              className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-lg text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Log Daily Tanker Dispatch
            </button>
          )}
        </div>
      </div>

      {activeTab === 'trucks' ? (
        /* Trucks Table Registry */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Tanker Number</th>
                  <th className="px-6 py-4">Chilling Capacity</th>
                  <th className="px-6 py-4">Driver Name</th>
                  <th className="px-6 py-4">Assigned Route</th>
                  <th className="px-6 py-4">Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : trucks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">No trucks registered in the database.</td>
                  </tr>
                ) : (
                  trucks.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{t.truckNumber}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{t.capacity.toLocaleString()} Liters</td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{t.driverName}</div>
                        <div className="text-[10px] text-slate-400">{t.driverMobile}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{t.route}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenEditTruck(t)}
                            className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Vehicle Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            disabled={!canModify}
                            onClick={() => handleDeleteTruck(t._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Remove Vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Dispatches Register Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Dispatch Date</th>
                  <th className="px-6 py-4">Tanker Info</th>
                  <th className="px-6 py-4">Driver / Route</th>
                  <th className="px-6 py-4">Volume Loaded</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : dispatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No transit dispatches registered.</td>
                  </tr>
                ) : (
                  dispatches.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(d.dispatchDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{d.truckNumber}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="font-semibold">{d.driverName}</div>
                        <div className="text-[10px] text-slate-400">{d.route}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{d.quantityLoaded.toLocaleString()} Liters</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-dairy-500" />
                          <span>{d.dispatchTime}</span>
                          {d.arrivalTime && (
                            <>
                              <ChevronRight className="w-3 h-3 text-slate-350" />
                              <span>{d.arrivalTime}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.arrivalTime 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {d.arrivalTime ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1 animate-spin" />}
                          {d.arrivalTime ? 'Arrived' : 'In Transit'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenEditDispatch(d)}
                            className="p-1.5 text-slate-400 hover:text-dairy-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit dispatch details / Log arrival"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            disabled={!canModify}
                            onClick={() => handleDeleteDispatch(d._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Truck Dialog Modal */}
      {truckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingTruckId ? 'Edit Tanker Record' : 'Register Tanker Truck'}
            </h3>

            <form onSubmit={handleTruckSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Truck Registration Number</label>
                <input
                  type="text"
                  required
                  value={truckForm.truckNumber}
                  onChange={(e) => setTruckForm({ ...truckForm, truckNumber: e.target.value })}
                  placeholder="e.g. MP-07-G-1234"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chilling Capacity (L)</label>
                  <input
                    type="number"
                    required
                    value={truckForm.capacity}
                    onChange={(e) => setTruckForm({ ...truckForm, capacity: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Route</label>
                  <input
                    type="text"
                    required
                    value={truckForm.route}
                    onChange={(e) => setTruckForm({ ...truckForm, route: e.target.value })}
                    placeholder="e.g. Dabra Route"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={truckForm.driverName}
                    onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })}
                    placeholder="e.g. Sunil Yadav"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Driver Contact</label>
                  <input
                    type="text"
                    required
                    value={truckForm.driverMobile}
                    onChange={(e) => setTruckForm({ ...truckForm, driverMobile: e.target.value })}
                    placeholder="10 digit number"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTruckModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  Save Tanker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Dialog Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingDispatchId ? 'Update Dispatch / Arrival' : 'Record Tanker Dispatch'}
            </h3>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Tanker Truck</label>
                <select
                  required
                  disabled={!!editingDispatchId}
                  value={dispatchForm.truckId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, truckId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                >
                  {trucks.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.truckNumber} ({t.route} - Max Cap: {t.capacity}L)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Milk Quantity Loaded (L)</label>
                  <input
                    type="number"
                    required
                    value={dispatchForm.quantityLoaded}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, quantityLoaded: e.target.value })}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dispatch Date</label>
                  <input
                    type="date"
                    required
                    value={dispatchForm.dispatchDate}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dispatch Time</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.dispatchTime}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchTime: e.target.value })}
                    placeholder="e.g. 06:15 AM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arrival Time (Optional)</label>
                  <input
                    type="text"
                    value={dispatchForm.arrivalTime}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, arrivalTime: e.target.value })}
                    placeholder="e.g. 11:30 AM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-semibold text-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;
