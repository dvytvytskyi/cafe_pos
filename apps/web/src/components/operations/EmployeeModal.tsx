import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Mail, Phone, Hash, Briefcase, MapPin } from 'lucide-react';
import { Employee } from '@/lib/staff';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSave: (employee: Employee) => void;
}

export default function EmployeeModal({ isOpen, onClose, employee, onSave }: EmployeeModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    nie: '',
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: '',
    scheduleStart: '10:00',
    scheduleEnd: '15:00',
    daysPerWeek: 5,
    position: 'Waiter',
    section: 'Floor',
    phone: '',
    email: '',
    status: 'active'
  });

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        name: '',
        nie: '',
        contractStart: new Date().toISOString().split('T')[0],
        contractEnd: '',
        scheduleStart: '10:00',
        scheduleEnd: '15:00',
        daysPerWeek: 5,
        position: 'Waiter',
        section: 'Floor',
        phone: '',
        email: '',
        status: 'active'
      });
    }
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate initials
    const nameParts = (formData.name || '').split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (formData.name?.substring(0, 2) || 'XX').toUpperCase();

    const newEmployee: Employee = {
      ...(formData as Employee),
      id: employee?.id || `EMP-${Date.now().toString().slice(-4)}`,
      avatarInitials: initials,
    };
    
    onSave(newEmployee);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
            <h3 className="text-xl font-bold text-gray-900">
              {employee ? 'Edit Employee' : 'New Employee'}
            </h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Albert Mesropov"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">NIE / ID</label>
                  <input 
                    type="text" 
                    name="nie"
                    value={formData.nie}
                    onChange={handleChange}
                    placeholder="e.g. Y1234567Z"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Contract Start</label>
                  <input 
                    type="date" 
                    name="contractStart"
                    value={formData.contractStart}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Contract End</label>
                  <input 
                    type="date" 
                    name="contractEnd"
                    value={formData.contractEnd || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Start Time</label>
                  <input 
                    type="time" 
                    name="scheduleStart"
                    value={formData.scheduleStart}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">End Time</label>
                  <input 
                    type="time" 
                    name="scheduleEnd"
                    value={formData.scheduleEnd}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Days/Week</label>
                  <input 
                    type="number" 
                    name="daysPerWeek"
                    value={formData.daysPerWeek}
                    onChange={handleChange}
                    min="1" max="7"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Position</label>
                  <select 
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all appearance-none"
                  >
                    <option value="Waiter">Waiter</option>
                    <option value="Chef">Chef</option>
                    <option value="Bartender">Bartender</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Section</label>
                  <select 
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all appearance-none"
                  >
                    <option value="Floor">Floor</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Bar">Bar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 mb-2 block">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="employee@corgicafe.com"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                </div>
              </div>

            </form>
          </div>
          
          <div className="px-8 py-5 border-t border-gray-100 flex gap-4 bg-white justify-end rounded-b-3xl">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="employee-form"
              className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Save Employee
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
