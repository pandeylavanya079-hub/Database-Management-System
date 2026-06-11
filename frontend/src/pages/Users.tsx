import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Plus, 
  Search, 
  UserPlus, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight,
  Shield,
  Briefcase
} from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff';
  isActive: boolean;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Staff',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching user accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'Staff' });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Error creating user account: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/auth/users/${id}/toggle`);
      fetchUsers();
    } catch (err: any) {
      alert('Error changing user status: ' + (err.response?.data?.message || 'Error occurred'));
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl text-sm outline-none shadow-sm placeholder:text-slate-400"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-dairy-500 hover:bg-dairy-600 text-white font-semibold rounded-2xl shadow-lg text-sm w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-5 h-5 mr-1" /> Register New Account
        </button>
      </div>

      {/* Users Data Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Authorization Role</th>
                <th className="px-6 py-4">Security Level</th>
                <th className="px-6 py-4">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    <div className="w-8 h-8 border-4 border-dairy-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No users found matching search term.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-455 font-semibold">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                        u.role === 'Admin' 
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900 text-rose-700 dark:text-rose-350'
                          : u.role === 'Manager'
                          ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200/50 dark:border-sky-900 text-sky-700 dark:text-sky-350'
                          : 'bg-dairy-50 dark:bg-dairy-950/20 border-dairy-200/50 dark:border-dairy-900 text-dairy-700 dark:text-dairy-350'
                      }`}>
                        {u.role === 'Admin' && <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                        {u.role === 'Manager' && <Shield className="w-3.5 h-3.5 mr-1" />}
                        {u.role === 'Staff' && <Briefcase className="w-3.5 h-3.5 mr-1" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {u.role === 'Admin' && 'Full Financial & Audit Access'}
                      {u.role === 'Manager' && 'Full Operations & Receivables'}
                      {u.role === 'Staff' && 'Entry-level transactional logs'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`flex items-center text-xs font-bold transition-colors ${
                          u.isActive 
                            ? 'text-emerald-500 hover:text-emerald-600'
                            : 'text-slate-400 hover:text-slate-500'
                        }`}
                        title="Toggle Active Status"
                      >
                        {u.isActive ? (
                          <>
                            <ToggleRight className="w-6 h-6 mr-1.5 shrink-0 text-emerald-500" />
                            <span>Active Portal</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 mr-1.5 shrink-0 text-slate-400" />
                            <span>Blocked Access</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register User Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Register User Account
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. ramesh@pitambara.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="minimum 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role Designation</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl outline-none"
                >
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-dairy-500 hover:bg-dairy-600 text-white font-bold rounded-xl shadow-lg shadow-dairy-500/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
