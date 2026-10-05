import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import { Kanban, Calendar, AlertCircle, ArrowRight } from 'lucide-react';

interface Company {
  company_id: number;
  company_name: string;
  industry: string;
  stage_id: number;
  status: string;
  priority: string;
  assigned_executive_name: string;
}

export const LeadPipeline: React.FC = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/companies`);
      setCompanies(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const stages = [
    { id: 1, name: 'Lead Discovery', color: 'var(--primary)' },
    { id: 2, name: 'Lead Outreach', color: '#0284c7' },
    { id: 3, name: 'Meetings', color: '#0d9488' },
    { id: 4, name: 'Qualification', color: '#854d0e' },
    { id: 5, name: 'Proposal', color: '#7c3aed' },
    { id: 6, name: 'Won (Onboarded)', color: 'var(--success)' },
    { id: 7, name: 'Closed Lost', color: 'var(--danger)' }
  ];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: number) => {
    e.preventDefault();
    const companyIdStr = e.dataTransfer.getData('text/plain');
    if (!companyIdStr) return;
    const companyId = parseInt(companyIdStr, 10);

    const oldComp = companies.find(c => c.company_id === companyId);
    if (!oldComp) return;
    if (oldComp.stage_id === targetStageId) return;

    // Optimistic update
    setCompanies(prev => prev.map(c => c.company_id === companyId ? { ...c, stage_id: targetStageId } : c));

    try {
      // Find default status for the new stage
      let status = 'Status Updated';
      if (targetStageId === 1) status = 'New Lead';
      else if (targetStageId === 2) status = 'Initial Contact';
      else if (targetStageId === 3) status = 'Meeting Scheduled';
      else if (targetStageId === 4) status = 'Opportunity Qualified';
      else if (targetStageId === 5) status = 'Proposal Shared';
      else if (targetStageId === 6) status = 'Client Onboarded';
      else if (targetStageId === 7) status = 'Lost';

      await axios.put(`${API_BASE_URL}/companies/${companyId}`, {
        stage_id: targetStageId,
        status: status
      });
      fetchCompanies(); // Sync back
    } catch (err) {
      alert('Failed to update stage');
      fetchCompanies(); // rollback
    }
  };

  return (
    <div>
      <div className="card flex items-center justify-between mb-4 p-4">
        <div className="flex items-center gap-2">
          <Kanban className="text-primary" />
          <span className="font-bold text-sm">Drag and Drop leads to advance them across acquisition stages.</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-6">Loading pipeline board...</div>
      ) : (
        <div className="kanban-board">
          {stages.map((stage) => {
            const stageLeads = companies.filter(c => c.stage_id === stage.id);
            return (
              <div
                key={stage.id}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="kanban-column-header" style={{ borderBottom: `2px solid ${stage.color}` }}>
                  <span className="kanban-column-title">{stage.name}</span>
                  <span className="kanban-column-count">{stageLeads.length}</span>
                </div>

                <div className="kanban-cards-wrapper">
                  {stageLeads.map((c) => (
                    <div
                      key={c.company_id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, c.company_id)}
                    >
                      <div className="kanban-card-title">{c.company_name}</div>
                      <div className="text-xs text-muted font-medium mb-2">{c.industry}</div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted">{c.assigned_executive_name || 'Unassigned'}</span>
                        <span className={`badge ${c.priority === 'High' ? 'badge-danger' : c.priority === 'Medium' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '9px' }}>
                          {c.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-center text-xs text-muted py-8" style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      Drag leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
