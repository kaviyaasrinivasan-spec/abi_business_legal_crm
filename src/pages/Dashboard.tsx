import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import {
  TrendingUp,
  Users,
  Building,
  CheckCircle,
  FileSignature,
  FileCheck,
  CalendarCheck,
  AlertTriangle,
  FolderDot,
  IndianRupee,
  Activity,
  Award
} from 'lucide-react';

interface DashboardData {
  totalLeads: number;
  leadDiscovery: number;
  leadOutreach: number;
  meetings: number;
  qualified: number;
  proposals: number;
  won: number;
  lost: number;
  ndaPending: number;
  ndaSigned: number;
  pipelineValue: number;
  expectedRevenue: number;
  winRate: number;
  avgSalesCycle: number;
  funnel: { stage: string; count: number }[];
  leadSources: { source: string; count: number }[];
  industries: { industry: string; count: number }[];
  growth: { month: string; count: number }[];
  leaderboard: { executive: string; total_leads: number; won_leads: number }[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/dashboard-metrics`);
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError(`Failed to load dashboard metrics: ${err.message} ${err.response?.data?.error || ''}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="text-center p-6">Loading analytics...</div>;
  if (error) return <div className="badge badge-danger p-4 w-full text-center">{error}</div>;
  if (!data) return null;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const isTelecaller = user?.role === 'Telecaller';

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)', color: 'white' }}>
        <h2 className="text-xl font-bold">Welcome back, {user?.fullName}!</h2>
        <p className="text-sm mt-1" style={{ opacity: 0.9 }}>
          Here is the latest acquisition activity for ABI Business Legal client onboarding.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4 gap-4 mb-4">
        {/* Total Leads */}
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">TOTAL COMMERCIAL LEADS</span>
          <span className="kpi-value">{data.totalLeads}</span>
          <div className="kpi-icon-wrapper">
            <Building size={20} />
          </div>
        </div>

        {/* NDA Pending */}
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">NDA PENDING SIGNATURE</span>
          <span className="kpi-value">{data.ndaPending}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-light)' }}>
            <FileSignature size={20} />
          </div>
        </div>

        {/* NDA Signed */}
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">NDA SIGNED COPIES</span>
          <span className="kpi-value">{data.ndaSigned}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}>
            <FileCheck size={20} />
          </div>
        </div>

        {/* Clients Onboarded */}
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">ONBOARDED CLIENTS</span>
          <span className="kpi-value">{data.won}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--info)', backgroundColor: 'var(--info-light)' }}>
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Second Row of KPI Cards (Financials - Hidden for Telecaller) */}
      {!isTelecaller && (
        <div className="grid grid-4 gap-4 mb-4">
          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">PIPELINE VALUE</span>
            <span className="kpi-value">{formatCurrency(data.pipelineValue)}</span>
            <div className="kpi-icon-wrapper">
              <IndianRupee size={20} />
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">EXPECTED REVENUE</span>
            <span className="kpi-value">{formatCurrency(data.expectedRevenue)}</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--info)', backgroundColor: 'var(--info-light)' }}>
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">WIN RATE</span>
            <span className="kpi-value">{data.winRate}%</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}>
              <Award size={20} />
            </div>
          </div>

          <div className="card kpi-card">
            <span className="text-xs text-muted font-bold">AVG SALES CYCLE</span>
            <span className="kpi-value">{data.avgSalesCycle} Days</span>
            <div className="kpi-icon-wrapper" style={{ color: 'var(--secondary)', backgroundColor: 'var(--secondary-light)' }}>
              <Activity size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Role specific panels */}
      {isTelecaller && (
        <div className="card mb-4">
          <h3 className="card-title mb-4">Telecaller Overview & Performance</h3>
          <div className="grid grid-3 gap-4">
            <div className="p-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span className="text-muted text-xs font-bold block">DISCOVERY STAGE LEADS</span>
              <span className="text-xl font-bold block mt-2 text-primary">{data.leadDiscovery}</span>
            </div>
            <div className="p-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span className="text-muted text-xs font-bold block">OUTREACH STAGE LEADS</span>
              <span className="text-xl font-bold block mt-2 text-primary">{data.leadOutreach}</span>
            </div>
            <div className="p-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span className="text-muted text-xs font-bold block">MEETINGS SCHEDULED</span>
              <span className="text-xl font-bold block mt-2 text-primary">{data.meetings}</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-12 gap-4">
        {/* Sales Funnel */}
        <div className="card span-6">
          <h3 className="card-title mb-4">Acquisition Sales Funnel</h3>
          <div className="chart-funnel">
            {data.funnel.map((row) => {
              const pct = data.totalLeads > 0 ? (row.count / data.totalLeads) * 100 : 0;
              return (
                <div key={row.stage} className="chart-funnel-row">
                  <span className="chart-funnel-label">{row.stage}</span>
                  <div className="chart-funnel-bar-bg">
                    <div className="chart-funnel-bar-fill" style={{ width: `${Math.max(8, pct)}%` }}>
                      {row.count} ({Math.round(pct)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Sources */}
        <div className="card span-6">
          <h3 className="card-title mb-4">Lead Source Distribution</h3>
          <div className="chart-container">
            {data.leadSources.length === 0 ? (
              <div className="text-muted text-xs text-center w-full py-12">No source data available</div>
            ) : (
              data.leadSources.map(s => {
                const maxCount = Math.max(...data.leadSources.map(l => l.count), 1);
                const height = (s.count / maxCount) * 180;
                return (
                  <div key={s.source || 'Unknown'} className="chart-bar-wrapper">
                    <div className="chart-bar" style={{ height: `${height}px`, width: '40px' }} title={`${s.source}: ${s.count}`} />
                    <span className="chart-label mt-2 text-xs" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.source || 'Other'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-12 gap-4 mt-4">
        {/* Industry Distribution */}
        <div className="card span-6">
          <h3 className="card-title mb-4">Leads by Industry</h3>
          <div className="chart-container">
            {data.industries.length === 0 ? (
              <div className="text-muted text-xs text-center w-full py-12">No industry data available</div>
            ) : (
              data.industries.map(i => {
                const maxCount = Math.max(...data.industries.map(l => l.count), 1);
                const height = (i.count / maxCount) * 180;
                return (
                  <div key={i.industry || 'Unknown'} className="chart-bar-wrapper">
                    <div className="chart-bar" style={{ height: `${height}px`, width: '40px', backgroundColor: '#0284c7' }} title={`${i.industry}: ${i.count}`} />
                    <span className="chart-label mt-2 text-xs" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.industry || 'Other'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Executive Leaderboard */}
        <div className="card span-6">
          <h3 className="card-title mb-4">Executive Leaderboard</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Executive Name</th>
                  <th className="text-center">Total Leads</th>
                  <th className="text-center">Won / Onboarded</th>
                  <th className="text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">No executive data loaded</td>
                  </tr>
                ) : (
                  data.leaderboard.map((exec, idx) => {
                    const pct = exec.total_leads > 0 ? Math.round((exec.won_leads / exec.total_leads) * 100) : 0;
                    return (
                      <tr key={idx}>
                        <td className="font-semibold">{exec.executive}</td>
                        <td className="text-center">{exec.total_leads}</td>
                        <td className="text-center">{exec.won_leads}</td>
                        <td className="text-right font-bold text-success">{pct}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
