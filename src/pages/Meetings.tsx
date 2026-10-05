import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../contexts/AuthContext';
import { CalendarDays, Clock, ExternalLink, Video, Users } from 'lucide-react';

interface Meeting {
  meeting_id: number;
  company_id: number;
  company_name: string;
  meeting_date: string;
  meeting_time: string;
  duration: number;
  meeting_type: string;
  platform: string;
  platform_link: string;
  agenda: string;
  notes: string;
  action_items: string;
}

export const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/meetings`);
        setMeetings(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filtered = meetings.filter(m => {
    if (filter === 'today') return m.meeting_date === today;
    if (filter === 'upcoming') return m.meeting_date >= today;
    return true;
  });

  const getPlatformIcon = (platform: string) => {
    if (platform?.toLowerCase().includes('zoom')) return '🟦';
    if (platform?.toLowerCase().includes('teams')) return '🟪';
    return '🟢';
  };

  return (
    <div>
      <div className="card flex items-center justify-between p-4 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-primary" />
          <span className="font-bold">All Scheduled Meetings</span>
        </div>
        <div className="flex gap-2">
          {(['all', 'today', 'upcoming'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center p-6">Loading meetings...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-muted p-12">No meetings found for selected filter.</div>
      ) : (
        <div className="grid grid-3 gap-4">
          {filtered.map(m => (
            <div key={m.meeting_id} className="card" style={{ borderLeft: `4px solid var(--primary)`, marginBottom: 0 }}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-sm">{m.company_name}</span>
                <span className="badge badge-info text-xs">{m.meeting_type}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <CalendarDays size={12} />
                <span>{new Date(m.meeting_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <Clock size={12} />
                <span>{m.meeting_time} ({m.duration || 30} mins)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted mb-2">
                <Video size={12} />
                <span>{getPlatformIcon(m.platform)} {m.platform}</span>
                {m.platform_link && (
                  <a href={m.platform_link} target="_blank" rel="noreferrer" className="text-primary">
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {m.agenda && (
                <div style={{ backgroundColor: 'var(--secondary-light)', borderRadius: 'var(--radius-sm)', padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span className="font-semibold">Agenda:</span> {m.agenda}
                </div>
              )}

              {m.notes && (
                <div className="mt-2" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span className="font-semibold">Notes:</span> {m.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
