import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  CheckSquare,
  PhoneCall,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Search,
  BookOpen,
  FileSignature,
  ChevronDown,
  ChevronRight,
  Target,
  AlertCircle
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  date: string;
  priority: string;
}

interface SidebarCount {
  stage_id: number;
  status: string;
  count: string;
}

interface MenuItem {
  name: string;
  path?: string;
  icon: any;
  roles: string[];
  children?: { name: string; path: string; }[];
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCounts, setSidebarCounts] = useState<SidebarCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Lead Discovery': false,
    'Lead Outreach': false,
    'Meetings': false,
    'Qualification': false,
    'Proposal': false,
    'Won': false,
  });

  // Fetch notifications periodically
  useEffect(() => {
    const fetchNotificationsAndCounts = async () => {
      try {
        const notifRes = await axios.get(`${API_BASE_URL}/notifications`);
        setNotifications(notifRes.data);
        const countsRes = await axios.get(`${API_BASE_URL}/companies/sidebar-counts`);
        setSidebarCounts(countsRes.data);
      } catch (err) {
        console.error('Failed to fetch sidebar data', err);
      }
    };
    
    if (user) {
      fetchNotificationsAndCounts();
      const interval = setInterval(fetchNotificationsAndCounts, 30000); // 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return <>{children}</>;

  const getCountText = (stageId: number, status?: string) => {
    if (status) {
      const match = sidebarCounts.find(c => c.stage_id === stageId && c.status === status);
      return match && parseInt(match.count) > 0 ? ` (${match.count})` : '';
    }
    const total = sidebarCounts.filter(c => c.stage_id === stageId).reduce((acc, c) => acc + parseInt(c.count), 0);
    return total > 0 ? ` (${total})` : '';
  };

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['CEO', 'BD Manager', 'BD Executive', 'Telecaller', 'Admin'] },
    { name: 'CEO Dashboard', path: '/ceo-dashboard', icon: BarChart3, roles: ['CEO', 'Admin'] },
    { name: 'Companies (All Leads)', path: '/companies', icon: Building2, roles: ['CEO', 'BD Manager', 'BD Executive', 'Telecaller', 'Admin'] },
    
    { 
      name: `Lead Discovery${getCountText(1)}`, icon: Search, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'], 
      children: [
        { name: `All Discovery${getCountText(1)}`, path: '/companies?stage=1' },
        { name: `New Lead${getCountText(1, 'New Lead')}`, path: '/companies?stage=1&status=New+Lead' },
        { name: `Researching${getCountText(1, 'Researching')}`, path: '/companies?stage=1&status=Researching' },
        { name: `Ready for Outreach${getCountText(1, 'Ready for Outreach')}`, path: '/companies?stage=1&status=Ready+for+Outreach' }
      ] 
    },
    { 
      name: `Lead Outreach${getCountText(2)}`, icon: PhoneCall, roles: ['CEO', 'BD Manager', 'BD Executive', 'Telecaller', 'Admin'], 
      children: [
        { name: `All Outreach${getCountText(2)}`, path: '/companies?stage=2' },
        { name: `Yet to Contact${getCountText(2, 'Yet to Contact')}`, path: '/companies?stage=2&status=Yet+to+Contact' },
        { name: `Contacted${getCountText(2, 'Contacted')}`, path: '/companies?stage=2&status=Contacted' },
        { name: `Follow-up Required${getCountText(2, 'Follow-up Required')}`, path: '/companies?stage=2&status=Follow-up+Required' },
        { name: `Not Interested${getCountText(2, 'Not Interested')}`, path: '/companies?stage=2&status=Not+Interested' },
        { name: `Wrong Number${getCountText(2, 'Wrong Number')}`, path: '/companies?stage=2&status=Wrong+Number' }
      ] 
    },
    { 
      name: `Meetings${getCountText(3)}`, icon: CalendarDays, roles: ['CEO', 'BD Manager', 'BD Executive', 'Telecaller', 'Admin'], 
      children: [
        { name: `All Meetings${getCountText(3)}`, path: '/companies?stage=3' },
        { name: `Meeting Scheduled${getCountText(3, 'Meeting Scheduled')}`, path: '/companies?stage=3&status=Meeting+Scheduled' },
        { name: `Meeting Completed${getCountText(3, 'Meeting Completed')}`, path: '/companies?stage=3&status=Meeting+Completed' },
        { name: `Rescheduled${getCountText(3, 'Rescheduled')}`, path: '/companies?stage=3&status=Rescheduled' },
        { name: `No Show${getCountText(3, 'No Show')}`, path: '/companies?stage=3&status=No+Show' }
      ] 
    },
    { 
      name: `Qualification${getCountText(4)}`, icon: CheckSquare, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'], 
      children: [
        { name: `All Qualification${getCountText(4)}`, path: '/companies?stage=4' },
        { name: `Qualified${getCountText(4, 'Qualified')}`, path: '/companies?stage=4&status=Qualified' },
        { name: `Need More Information${getCountText(4, 'Need More Information')}`, path: '/companies?stage=4&status=Need+More+Information' },
        { name: `Not Qualified${getCountText(4, 'Not Qualified')}`, path: '/companies?stage=4&status=Not+Qualified' }
      ] 
    },
    { 
      name: `Proposal${getCountText(5)}`, icon: FileText, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'], 
      children: [
        { name: `All Proposals${getCountText(5)}`, path: '/companies?stage=5' },
        { name: `NDA Shared${getCountText(5, 'NDA Shared')}`, path: '/companies?stage=5&status=NDA+Shared' },
        { name: `Proposal Sent${getCountText(5, 'Proposal Sent')}`, path: '/companies?stage=5&status=Proposal+Sent' },
        { name: `Negotiation${getCountText(5, 'Negotiation')}`, path: '/companies?stage=5&status=Negotiation' },
        { name: `Waiting for Decision${getCountText(5, 'Waiting for Decision')}`, path: '/companies?stage=5&status=Waiting+for+Decision' }
      ] 
    },
    { 
      name: `Won${getCountText(6)}`, icon: Target, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'], 
      children: [
        { name: `All Won${getCountText(6)}`, path: '/companies?stage=6' },
        { name: `Agreement Signed${getCountText(6, 'Agreement Signed')}`, path: '/companies?stage=6&status=Agreement+Signed' },
        { name: `Client Onboarded${getCountText(6, 'Client Onboarded')}`, path: '/companies?stage=6&status=Client+Onboarded' }
      ] 
    },
    { 
      name: `Closed Lost${getCountText(7)}`, path: '/companies?stage=7', icon: AlertCircle, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'],
      children: [
        { name: `All Lost${getCountText(7)}`, path: '/companies?stage=7' },
        { name: `Lost to Competitor${getCountText(7, 'Lost to Competitor')}`, path: '/companies?stage=7&status=Lost+to+Competitor' },
        { name: `Budget Issue${getCountText(7, 'Budget Issue')}`, path: '/companies?stage=7&status=Budget+Issue' },
        { name: `No Response${getCountText(7, 'No Response')}`, path: '/companies?stage=7&status=No+Response' },
        { name: `Project Cancelled${getCountText(7, 'Project Cancelled')}`, path: '/companies?stage=7&status=Project+Cancelled' }
      ]
    },
    
    // Tools
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['CEO', 'BD Manager', 'BD Executive', 'Admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['CEO', 'BD Manager', 'Admin'] },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp, roles: ['CEO', 'BD Manager', 'Admin'] },
    
    // Admin
    { name: 'Users', path: '/users-management', icon: Users, roles: ['Admin', 'CEO'] },
    { name: 'Masters', path: '/masters', icon: BookOpen, roles: ['Admin'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, roles: ['CEO', 'BD Manager', 'Admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin'] }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/companies?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    const match = menuItems.find(item => item.path === path || (item.children && item.children.some(c => c.path.split('?')[0] === path)));
    return match ? match.name : 'ABI BD CRM';
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const currentPathWithSearch = location.pathname + location.search;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar-container">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Building2 size={24} />
            <span>ABI Business Legal</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            
            if (item.children) {
              const isExpanded = expandedMenus[item.name];
              const isChildActive = item.children.some(c => c.path === currentPathWithSearch);
              
              return (
                <div key={item.name} className="sidebar-group">
                  <div 
                    className={`sidebar-link ${isChildActive && !isExpanded ? 'active' : ''}`}
                    onClick={() => toggleMenu(item.name)}
                    style={{ justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </div>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  
                  {isExpanded && (
                    <div className="sidebar-subnav">
                      {item.children.map(child => {
                        const isActive = currentPathWithSearch === child.path;
                        return (
                          <Link
                            key={child.name}
                            to={child.path}
                            className={`sidebar-sublink ${isActive ? 'active' : ''}`}
                          >
                            <span className="dot"></span>
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path && !location.search;
            return (
              <Link
                key={item.name}
                to={item.path || '#'}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="font-semibold text-sm" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName}
              </span>
              <span className="text-xs text-muted font-medium">{user.role}</span>
            </div>
            <button onClick={logout} className="theme-switch" title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main-wrapper">
        <header className="header-container">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">{getBreadcrumb()}</span>
            <form onSubmit={handleGlobalSearch} className="search-container">
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search leads..." 
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
