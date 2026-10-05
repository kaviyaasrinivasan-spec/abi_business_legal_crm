import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import { Users, PhoneCall, CalendarCheck, CheckCircle, BarChart3 } from 'lucide-react';

interface CeoMetrics {
  period: string;
  totalNewLeads: number;
  discoveryCount: number;
  outreachCount: number;
  contactedCount: number;
  followupCount: number;
  notInterestedCount: number;
  wrongNumberCount: number;
  meetingsCount: number;
  scheduledCount: number;
  completedCount: number;
  rescheduledCount: number;
  noshowCount: number;
  wonCount: number;
}

export const CeoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [metrics, setMetrics] = useState<CeoMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/ceo-dashboard?period=${period}`);
        setMetrics(response.data);
      } catch (err) {
        console.error('Failed to fetch CEO metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [period]);

  const toggleClasses = (p: string) => 
    `btn ${period === p ? 'btn-primary' : 'btn-secondary'}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-primary" /> CEO / Owner Dashboard
          </h2>
          <p className="text-sm text-muted mt-1">Track key performance indicators and team activity based on time periods.</p>
        </div>

        {/* Period Toggles */}
        <div className="flex gap-2">
          <button className={toggleClasses('today')} onClick={() => setPeriod('today')}>Today</button>
          <button className={toggleClasses('yesterday')} onClick={() => setPeriod('yesterday')}>Yesterday</button>
          <button className={toggleClasses('week')} onClick={() => setPeriod('week')}>This Week</button>
          <button className={toggleClasses('month')} onClick={() => setPeriod('month')}>This Month</button>
          <button className={toggleClasses('all')} onClick={() => setPeriod('all')}>All Time</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-6 text-muted">Loading metrics...</div>
      ) : metrics ? (
        <div className="grid grid-4 gap-4">
          
          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">NEW LEADS IMPORTED/ADDED</span>
            <span className="kpi-value">{metrics.totalNewLeads}</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)' }}>
              <Users size={20} />
            </div>
            <div className="text-sm text-muted mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              Total leads entered into the system
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">ACTIVE OUTREACH</span>
            <span className="kpi-value">{metrics.outreachCount}</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-light)' }}>
              <PhoneCall size={20} />
            </div>
            <div className="text-sm text-muted mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Contacted:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.contactedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Follow-up:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.followupCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Not Interested:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.notInterestedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Wrong Number:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.wrongNumberCount}</span>
              </div>
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">MEETINGS</span>
            <span className="kpi-value">{metrics.meetingsCount}</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--info)', backgroundColor: 'var(--info-light)' }}>
              <CalendarCheck size={20} />
            </div>
            <div className="text-sm text-muted mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Scheduled:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.scheduledCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Completed:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.completedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Rescheduled:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.rescheduledCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>No Show:</span> <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metrics.noshowCount}</span>
              </div>
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">CLIENTS ONBOARDED</span>
            <span className="kpi-value">{metrics.wonCount}</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}>
              <CheckCircle size={20} />
            </div>
            <div className="text-sm text-muted mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              Successfully closed deals
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center p-6 text-danger">Failed to load data</div>
      )}
    </div>
  );
};
