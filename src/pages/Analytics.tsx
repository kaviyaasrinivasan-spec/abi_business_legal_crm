import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import { TrendingUp, PieChart, BarChart2, Target, Zap } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/reports/dashboard-metrics`)
      .then(r => setData(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-6">Loading analytics...</div>;
  if (!data) return <div className="badge badge-danger p-4 w-full text-center">Failed to load analytics</div>;

  const formatINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  const maxGrowth = Math.max(...data.growth.map((g: any) => g.count), 1);
  const maxSource = Math.max(...data.leadSources.map((s: any) => s.count), 1);
  const maxIndustry = Math.max(...data.industries.map((i: any) => i.count), 1);

  return (
    <div>
      <div className="card flex items-center gap-2 p-4 mb-4"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: 'white' }}>
        <TrendingUp size={20} />
        <span className="font-bold text-lg">Business Development Analytics</span>
        <span className="ml-4 text-sm" style={{ opacity: 0.85 }}>Real-time insights on your commercial client acquisition pipeline</span>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-4 gap-4 mb-6">
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">TOTAL PIPELINE VALUE</span>
          <span className="kpi-value" style={{ fontSize: '22px' }}>{formatINR(data.pipelineValue)}</span>
          <div className="kpi-icon-wrapper"><Target size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">EXPECTED REVENUE</span>
          <span className="kpi-value" style={{ fontSize: '22px' }}>{formatINR(data.expectedRevenue)}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', background: 'var(--success-light)' }}><Zap size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">CONVERSION RATE</span>
          <span className="kpi-value">{data.winRate}%</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--warning)', background: 'var(--warning-light)' }}><PieChart size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">AVG SALES CYCLE</span>
          <span className="kpi-value">{data.avgSalesCycle} Days</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--info)', background: 'var(--info-light)' }}><BarChart2 size={20} /></div>
        </div>
      </div>

      {/* Monthly Lead Growth Chart */}
      <div className="grid grid-2 gap-4 mb-4">
        <div className="card">
          <h3 className="card-title mb-4">📈 Monthly Lead Acquisition Trend</h3>
          <div className="chart-container" style={{ height: '220px', alignItems: 'flex-end' }}>
            {data.growth.length === 0 ? (
              <div className="text-muted text-xs text-center w-full py-12">No monthly data yet.</div>
            ) : data.growth.map((g: any, i: number) => {
              const height = Math.max(8, (g.count / maxGrowth) * 180);
              return (
                <div key={i} className="chart-bar-wrapper" style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: 'var(--text-main)',
                    marginBottom: '4px'
                  }}>{g.count}</div>
                  <div className="chart-bar" style={{ height: `${height}px`, background: 'linear-gradient(180deg, #1e40af, #3b82f6)' }} />
                  <span className="chart-label" style={{ fontSize: '10px' }}>{g.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales Funnel */}
        <div className="card">
          <h3 className="card-title mb-4">🎯 Acquisition Funnel Conversion</h3>
          <div className="chart-funnel">
            {data.funnel.map((row: any) => {
              const pct = data.totalLeads > 0 ? (row.count / data.totalLeads) * 100 : 0;
              return (
                <div key={row.stage} className="chart-funnel-row">
                  <span className="chart-funnel-label" style={{ fontSize: '12px' }}>{row.stage}</span>
                  <div className="chart-funnel-bar-bg">
                    <div className="chart-funnel-bar-fill" style={{
                      width: `${Math.max(6, pct)}%`,
                      background: 'linear-gradient(90deg, #1e40af, #7c3aed)'
                    }}>
                      {row.count} ({Math.round(pct)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source & Industry Side by Side */}
      <div className="grid grid-2 gap-4 mb-4">
        {/* Lead Sources Bar Chart */}
        <div className="card">
          <h3 className="card-title mb-4">📊 Lead Source Breakdown</h3>
          <div className="flex flex-col gap-2">
            {data.leadSources.map((s: any, i: number) => {
              const pct = (s.count / maxSource) * 100;
              const colors = ['#1e40af','#0284c7','#0d9488','#854d0e','#7c3aed','#b91c1c'];
              return (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{s.source || 'Unknown'}</span>
                    <span className="text-sm font-bold">{s.count}</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-full)', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(4, pct)}%`,
                      background: colors[i % colors.length],
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s'
                    }} />
                  </div>
                </div>
              );
            })}
            {data.leadSources.length === 0 && <p className="text-muted text-xs">No source data yet.</p>}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="card">
          <h3 className="card-title mb-4">🏭 Industry Breakdown</h3>
          <div className="flex flex-col gap-2">
            {data.industries.map((ind: any, i: number) => {
              const pct = (ind.count / maxIndustry) * 100;
              const colors = ['#7c3aed','#0284c7','#0d9488','#854d0e','#1e40af','#b91c1c'];
              return (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{ind.industry || 'Other'}</span>
                    <span className="text-sm font-bold">{ind.count}</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-full)', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(4, pct)}%`,
                      background: colors[i % colors.length],
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s'
                    }} />
                  </div>
                </div>
              );
            })}
            {data.industries.length === 0 && <p className="text-muted text-xs">No industry data yet.</p>}
          </div>
        </div>
      </div>

      {/* Executive Leaderboard */}
      <div className="card">
        <h3 className="card-title mb-4">🏆 Executive Performance Leaderboard</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Executive</th>
                <th className="text-center">Leads Assigned</th>
                <th className="text-center">Onboarded Clients</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">No data available.</td></tr>
              ) : data.leaderboard
                  .sort((a: any, b: any) => b.won_leads - a.won_leads)
                  .map((exec: any, idx: number) => {
                    const pct = exec.total_leads > 0 ? Math.round((exec.won_leads / exec.total_leads) * 100) : 0;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <tr key={idx}>
                        <td className="font-bold text-center">{medals[idx] || idx + 1}</td>
                        <td className="font-semibold">{exec.executive}</td>
                        <td className="text-center">{exec.total_leads}</td>
                        <td className="text-center font-bold" style={{ color: 'var(--success)' }}>{exec.won_leads}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-full)', height: '8px', width: '100px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, background: pct > 50 ? 'var(--success)' : 'var(--primary)', height: '100%', transition: 'width 0.5s' }} />
                            </div>
                            <span className="text-sm font-bold">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
