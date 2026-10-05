import React from 'react';
import { BookOpen, Settings2 } from 'lucide-react';

export const Masters: React.FC = () => {
  return (
    <div>
      <div className="card flex items-center p-4 mb-4 gap-2">
        <BookOpen className="text-primary" />
        <span className="font-bold">Master Data Management</span>
      </div>
      
      <div className="grid grid-3 gap-4">
        {['Industries', 'Lead Sources', 'Business Categories', 'Pipeline Stages', 'NDA Templates'].map(m => (
          <div key={m} className="card p-4 flex flex-col justify-between" style={{ minHeight: '120px' }}>
            <h4 className="font-bold text-sm mb-2">{m}</h4>
            <p className="text-xs text-muted mb-4">Manage predefined {m.toLowerCase()} for the CRM.</p>
            <button className="btn btn-secondary btn-sm flex items-center justify-center gap-2">
              <Settings2 size={14} /> Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
