import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../contexts/AuthContext';
import { BarChart3, TrendingUp, PieChart, Users, Award } from 'lucide-react';

interface LeaderboardEntry {
  executive: string;
  total_leads: number;
  won_leads: number;
}

export const Reports: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/dashboard-metrics`);
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center p-6">Loading reports...</div>;
  if (!data) return <div className="text-center p-6 text-danger">Failed to load reports</div>;

  return (
    <div>
      <div className="card flex items-center gap-2 p-4 mb-4">
        <BarChart3 className="text-primary" />
        <span className="font-bold">Comprehensive Analytics & Reports</span>
      </div>

      <div className="grid grid-2 gap-4 mb-4">
        <div className="card">
          <h3 className="card-title flex items-center gap-2 mb-4"><TrendingUp size={16} /> Monthly Lead Growth</h3>
          <table className="custom-table w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">New Leads</th>
              </tr>
            </thead>
            <tbody>
              {data.growth.map((g: any, i: number) => (
                <tr key={i}>
                  <td>{g.month}</td>
                  <td className="text-right font-bold">{g.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="card-title flex items-center gap-2 mb-4"><PieChart size={16} /> Lead Source Distribution</h3>
          <table className="custom-table w-full">
            <thead>
              <tr>
                <th>Source</th>
                <th className="text-right">Leads</th>
              </tr>
            </thead>
            <tbody>
              {data.leadSources.map((s: any, i: number) => (
                <tr key={i}>
                  <td>{s.source || 'Unknown'}</td>
                  <td className="text-right font-bold">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title flex items-center gap-2 mb-4"><Users size={16} /> Executive Performance Report</h3>
        <table className="custom-table w-full">
          <thead>
            <tr>
              <th>Executive</th>
              <th className="text-center">Total Assigned</th>
              <th className="text-center">Successfully Onboarded</th>
              <th className="text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((l: LeaderboardEntry, i: number) => (
              <tr key={i}>
                <td className="font-semibold">{l.executive}</td>
                <td className="text-center">{l.total_leads}</td>
                <td className="text-center text-success font-bold">{l.won_leads}</td>
                <td className="text-right">
                  <span className="badge badge-info">
                    {l.total_leads > 0 ? Math.round((l.won_leads / l.total_leads) * 100) : 0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
