import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div>
      <div className="card flex items-center p-4 mb-4 gap-2">
        <SettingsIcon className="text-primary" />
        <span className="font-bold">System Settings</span>
      </div>

      <div className="grid grid-2 gap-4">
        <div className="card">
          <h4 className="font-bold text-sm mb-4">Notification Preferences</h4>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Email Alerts for New Leads</span>
            <input type="checkbox" defaultChecked className="cursor-pointer" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">WhatsApp Integration Enabled</span>
            <input type="checkbox" defaultChecked className="cursor-pointer" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Daily Summary Reports</span>
            <input type="checkbox" defaultChecked className="cursor-pointer" />
          </div>
          <button className="btn btn-primary btn-sm mt-6 flex items-center gap-2">
            <Save size={14} /> Save Preferences
          </button>
        </div>

        <div className="card">
          <h4 className="font-bold text-sm mb-4">Security Policies</h4>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Enforce 2FA</span>
            <input type="checkbox" className="cursor-pointer" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Session Timeout (Minutes)</span>
            <input type="number" className="form-input text-sm p-1 w-20" defaultValue={30} />
          </div>
          <button className="btn btn-primary btn-sm mt-6 flex items-center gap-2">
            <Save size={14} /> Update Policies
          </button>
        </div>
      </div>
    </div>
  );
};
