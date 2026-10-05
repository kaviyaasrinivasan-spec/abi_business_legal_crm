import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  User,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  FileSpreadsheet,
  FileSignature,
  FileUp,
  History,
  X,
  PlusCircle,
  Clock,
  ExternalLink,
  MapPin,
  Briefcase,
  Layers,
  ArrowRightCircle
} from 'lucide-react';

interface Contact {
  contact_id: number;
  name: string;
  designation: string;
  department: string;
  email: string;
  mobile: string;
  whatsapp: string;
  linkedin: string;
  is_decision_maker: boolean;
  is_influencer: boolean;
  is_finance: boolean;
  is_legal: boolean;
  is_primary: boolean;
  notes: string;
}

interface TimelineItem {
  timeline_id: number;
  action_type: string;
  description: string;
  created_at: string;
  action_by_name: string;
}

interface Company {
  company_id: number;
  company_name: string;
  legal_name: string;
  gst_number: string;
  pan: string;
  website: string;
  linkedin: string;
  industry: string;
  business_category: string;
  business_size: string;
  employee_count: number;
  annual_turnover: number;
  city: string;
  state: string;
  country: string;
  address: string;
  pin_code: string;
  notes: string;
  tags: string[];
  priority: string;
  lead_source: string;
  stage_id: number;
  status: string;
  assigned_executive_id: number;
  assigned_executive_name: string;
  created_at: string;
  stage_updated_at?: string;
  contacts?: Contact[];
  timeline?: TimelineItem[];
  meetings?: any[];
  tasks?: any[];
  proposals?: any[];
  ndas?: any[];
  documents?: any[];
  contact_person?: string;
  contact_designation?: string;
  contact_no?: string;
  contact_landline?: string;
  area?: string;
  contact_email?: string;
}

const pipelineOptions = [
  { stageId: 1, status: 'New Lead', label: 'Lead Discovery - New Lead' },
  { stageId: 1, status: 'Researching', label: 'Lead Discovery - Researching' },
  { stageId: 1, status: 'Ready for Outreach', label: 'Lead Discovery - Ready for Outreach' },
  { stageId: 2, status: 'Yet to Contact', label: 'Lead Outreach - Yet to Contact' },
  { stageId: 2, status: 'Contacted', label: 'Lead Outreach - Contacted' },
  { stageId: 2, status: 'Follow-up Required', label: 'Lead Outreach - Follow-up Required' },
  { stageId: 2, status: 'Not Interested', label: 'Lead Outreach - Not Interested' },
  { stageId: 2, status: 'Wrong Number', label: 'Lead Outreach - Wrong Number' },
  { stageId: 3, status: 'Meeting Scheduled', label: 'Meetings - Meeting Scheduled' },
  { stageId: 3, status: 'Meeting Completed', label: 'Meetings - Meeting Completed' },
  { stageId: 3, status: 'Rescheduled', label: 'Meetings - Rescheduled' },
  { stageId: 3, status: 'No Show', label: 'Meetings - No Show' },
  { stageId: 4, status: 'Qualified', label: 'Qualification - Qualified' },
  { stageId: 4, status: 'Need More Information', label: 'Qualification - Need More Information' },
  { stageId: 4, status: 'Not Qualified', label: 'Qualification - Not Qualified' },
  { stageId: 5, status: 'NDA Shared', label: 'Proposal - NDA Shared' },
  { stageId: 5, status: 'Proposal Sent', label: 'Proposal - Proposal Sent' },
  { stageId: 5, status: 'Negotiation', label: 'Proposal - Negotiation' },
  { stageId: 5, status: 'Waiting for Decision', label: 'Proposal - Waiting for Decision' },
  { stageId: 6, status: 'Agreement Signed', label: 'Won - Agreement Signed' },
  { stageId: 6, status: 'Client Onboarded', label: 'Won - Client Onboarded' },
  { stageId: 7, status: 'Lost to Competitor', label: 'Closed Lost - Lost to Competitor' },
  { stageId: 7, status: 'Budget Issue', label: 'Closed Lost - Budget Issue' },
  { stageId: 7, status: 'No Response', label: 'Closed Lost - No Response' },
  { stageId: 7, status: 'Project Cancelled', label: 'Closed Lost - Project Cancelled' }
];

export const Companies: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Inline Pipeline Progression state
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [editStageId, setEditStageId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Excel Upload state
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form states - Company Create/Edit
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formMobileNos, setFormMobileNos] = useState<string[]>(['']);
  const [formLandlineNos, setFormLandlineNos] = useState<string[]>(['']);
  const [formArea, setFormArea] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formLinkedin, setFormLinkedin] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSize, setFormSize] = useState('Medium');
  const [formEmployees, setFormEmployees] = useState('');
  const [formTurnover, setFormTurnover] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formAddress, setFormAddress] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formSource, setFormSource] = useState('');
  const [formExecutive, setFormExecutive] = useState('');
  const [formStage, setFormStage] = useState('1');
  const [formStatus, setFormStatus] = useState('New Lead');

  // Contact Persons Form
  const [contactName, setContactName] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactDept, setContactDept] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactIsDM, setContactIsDM] = useState(false);
  const [contactIsInf, setContactIsInf] = useState(false);
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [contactNotes, setContactNotes] = useState('');

  // Meetings Form
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetDuration, setMeetDuration] = useState('30');
  const [meetType, setMeetType] = useState('Online');
  const [meetPlatform, setMeetPlatform] = useState('Google Meet');
  const [meetLink, setMeetLink] = useState('');
  const [meetAgenda, setMeetAgenda] = useState('');

  // Follow-ups Form
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('');
  const [fuComments, setFuComments] = useState('');

  // Proposals Form
  const [propNumber, setPropNumber] = useState('');
  const [propCategory, setPropCategory] = useState('');
  const [propEstValue, setPropEstValue] = useState('');
  const [propDiscount, setPropDiscount] = useState('0');
  const [propFinalValue, setPropFinalValue] = useState('');
  const [propClosingDate, setPropClosingDate] = useState('');

  // NDA Form
  const [ndaVersion, setNdaVersion] = useState('1.0');
  const [ndaSentDate, setNdaSentDate] = useState('');
  const [ndaExpiryDate, setNdaExpiryDate] = useState('');

  // Document Upload Form
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Company Profile');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/companies`);
      setCompanies(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch companies list');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingExcel(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/companies/upload-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert(response.data.message || 'Excel imported successfully!');
      fetchCompanies(); // Refresh the list
    } catch (err: any) {
      console.error('Upload Error:', err);
      alert(err.response?.data?.error || 'Failed to upload Excel file. Please check the format.');
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  const fetchExecutives = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setExecutives(response.data.filter((u: any) => u.role === 'BD Executive'));
    } catch (err) {
      console.error('Failed to load executives list', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
    if (['Admin', 'CEO', 'BD Manager'].includes(user?.role || '')) {
      fetchExecutives();
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stage = params.get('stage');
    const status = params.get('status');
    
    if (stage !== null) setStageFilter(stage);
    else setStageFilter('');
    
    if (status !== null) setStatusFilter(status);
    else setStatusFilter('');
  }, [location.search]);

  const handleOpenCompanyDetail = async (id: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies/${id}`);
      setSelectedCompany(response.data);
      setEditStageId(response.data.stage_id.toString());
      setEditStatus(response.data.status);
      setIsEditingStage(false);
      setActiveTab('profile');
    } catch (err) {
      alert('Error fetching company details');
    }
  };

  const handleUpdatePipelineStage = async () => {
    if (!selectedCompany) return;
    try {
      await axios.put(`${API_BASE_URL}/companies/${selectedCompany.company_id}`, {
        stage_id: parseInt(editStageId),
        status: editStatus
      });
      setIsEditingStage(false);
      handleOpenCompanyDetail(selectedCompany.company_id);
      fetchCompanies();
    } catch (err) {
      alert('Error updating pipeline stage');
    }
  };

  const handleInlineStatusUpdate = async (companyId: number, combinedValue: string) => {
    const [stageIdStr, status] = combinedValue.split('|');
    if (!stageIdStr || !status) return;
    
    try {
      await axios.put(`${API_BASE_URL}/companies/${companyId}`, {
        stage_id: parseInt(stageIdStr),
        status: status
      });
      fetchCompanies(); // Refresh the table automatically
    } catch (err) {
      alert('Error updating pipeline stage');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        company_name: formName,
        contact_person: formContactPerson,
        contact_designation: formDesignation,
        contact_no: formMobileNos.filter(n => n.trim() !== '').join(', '),
        contact_landline: formLandlineNos.filter(n => n.trim() !== '').join(', '),
        area: formArea,
        contact_email: formEmail,
        website: formWebsite,
        linkedin: formLinkedin,
        industry: formIndustry,
        business_category: formCategory,
        business_size: formSize,
        employee_count: formEmployees ? parseInt(formEmployees) : null,
        annual_turnover: formTurnover ? parseFloat(formTurnover) : null,
        city: formCity,
        state: formState,
        country: formCountry,
        address: formAddress,
        pin_code: formPinCode,
        notes: formNotes,
        priority: formPriority,
        lead_source: formSource,
        stage_id: parseInt(formStage),
        status: formStatus,
        assigned_executive_id: formExecutive ? parseInt(formExecutive) : null
      };

      await axios.post(`${API_BASE_URL}/companies`, payload);
      setShowAddModal(false);
      resetCompanyForm();
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register company lead');
    }
  };

  const handleSaveCompanyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_name: formName,
        contact_person: formContactPerson,
        contact_designation: formDesignation,
        contact_no: formMobileNos.filter(n => n.trim() !== '').join(', '),
        contact_landline: formLandlineNos.filter(n => n.trim() !== '').join(', '),
        area: formArea,
        contact_email: formEmail,
        website: formWebsite,
        linkedin: formLinkedin,
        industry: formIndustry,
        business_category: formCategory,
        business_size: formSize,
        employee_count: formEmployees ? parseInt(formEmployees) : null,
        annual_turnover: formTurnover ? parseFloat(formTurnover) : null,
        city: formCity,
        state: formState,
        country: formCountry,
        address: formAddress,
        pin_code: formPinCode,
        notes: formNotes,
        priority: formPriority,
        lead_source: formSource,
        stage_id: parseInt(formStage),
        status: formStatus,
        assigned_executive_id: formExecutive ? parseInt(formExecutive) : null
      };

      const response = await axios.put(`${API_BASE_URL}/companies/${selectedCompany.company_id}`, payload);
      setShowEditProfileModal(false);
      handleOpenCompanyDetail(selectedCompany.company_id);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update company');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/companies/${id}`);
      if (selectedCompany?.company_id === id) {
        setSelectedCompany(null);
      }
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete company');
    }
  };

  const handleUpdateRemarks = async (companyId: number, remarks: string) => {
    try {
      await axios.put(`${API_BASE_URL}/companies/${companyId}`, {
        notes: remarks
      });
      setCompanies(prev => prev.map(c => c.company_id === companyId ? { ...c, notes: remarks } : c));
    } catch (err: any) {
      alert('Failed to save remarks');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        name: contactName,
        designation: contactDesignation,
        department: contactDept,
        email: contactEmail,
        mobile: contactPhone,
        whatsapp: contactWhatsapp,
        linkedin: contactLinkedin,
        is_decision_maker: contactIsDM,
        is_influencer: contactIsInf,
        is_primary: contactIsPrimary
      };
      await axios.post(`${API_BASE_URL}/contacts`, payload);
      setContactName('');
      setContactDesignation('');
      setContactEmail('');
      setContactPhone('');
      setContactIsDM(false);
      setContactIsPrimary(false);
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err) {
      alert('Error creating contact person');
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        meeting_date: meetDate,
        meeting_time: meetTime,
        duration: parseInt(meetDuration),
        meeting_type: meetType,
        platform: meetPlatform,
        platform_link: meetLink,
        agenda: meetAgenda
      };
      await axios.post(`${API_BASE_URL}/meetings`, payload);
      setMeetDate('');
      setMeetTime('');
      setMeetAgenda('');
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err) {
      alert('Error scheduling meeting');
    }
  };

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        follow_up_date: fuDate,
        follow_up_time: fuTime || null,
        comments: fuComments,
        status: 'Pending'
      };
      await axios.post(`${API_BASE_URL}/followups`, payload);
      setFuDate('');
      setFuTime('');
      setFuComments('');
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err) {
      alert('Error scheduling follow-up');
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        proposal_number: propNumber,
        service_category: propCategory,
        estimated_value: parseFloat(propEstValue),
        discount: parseFloat(propDiscount),
        final_value: parseFloat(propFinalValue),
        expected_closing_date: propClosingDate,
        status: 'Draft',
        pdf_link: 'uploads/proposal_' + propNumber + '.pdf'
      };
      await axios.post(`${API_BASE_URL}/proposals`, payload);
      setPropNumber('');
      setPropCategory('');
      setPropEstValue('');
      setPropFinalValue('');
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error drafting proposal');
    }
  };

  const handleCreateNDA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        nda_version: ndaVersion,
        sent_date: ndaSentDate,
        expiry_date: ndaExpiryDate || null,
        status: 'Sent',
        pdf_link: 'uploads/nda_' + ndaVersion + '.pdf'
      };
      await axios.post(`${API_BASE_URL}/ndas`, payload);
      setNdaSentDate('');
      setNdaExpiryDate('');
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err) {
      alert('Error creating NDA entry');
    }
  };

  const handleSignNDA = async (ndaId: number) => {
    if (!selectedCompany) return;
    try {
      await axios.put(`${API_BASE_URL}/ndas/${ndaId}`, {
        status: 'Signed',
        signed_date: new Date().toISOString().split('T')[0]
      });
      handleOpenCompanyDetail(selectedCompany.company_id);
      fetchCompanies();
    } catch (err) {
      alert('Error signing NDA');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      const payload = {
        company_id: selectedCompany.company_id,
        name: docName,
        type: docType,
        file_url: 'uploads/mock_' + Date.now() + '_' + docName,
        version: '1.0'
      };
      await axios.post(`${API_BASE_URL}/documents`, payload);
      setDocName('');
      handleOpenCompanyDetail(selectedCompany.company_id);
    } catch (err) {
      alert('Error uploading document metadata');
    }
  };

  const resetCompanyForm = () => {
    setFormName('');
    setFormContactPerson('');
    setFormDesignation('');
    setFormMobileNos(['']);
    setFormLandlineNos(['']);
    setFormArea('');
    setFormEmail('');
    setFormWebsite('');
    setFormLinkedin('');
    setFormIndustry('');
    setFormCategory('');
    setFormSize('Medium');
    setFormEmployees('');
    setFormTurnover('');
    setFormCity('');
    setFormState('');
    setFormCountry('India');
    setFormAddress('');
    setFormPinCode('');
    setFormNotes('');
    setFormPriority('Medium');
    setFormSource('');
    setFormExecutive('');
    setFormStage('1');
    setFormStatus('New Lead');
  };

  const loadCompanyIntoForm = (c: Company) => {
    setFormName(c.company_name);
    setFormContactPerson(c.contact_person || '');
    setFormDesignation(c.contact_designation || '');
    const parsedMobiles = c.contact_no ? c.contact_no.split(',').map(s => s.trim()).filter(Boolean) : [];
    setFormMobileNos(parsedMobiles.length > 0 ? parsedMobiles : ['']);
    const parsedLandlines = c.contact_landline ? c.contact_landline.split(',').map(s => s.trim()).filter(Boolean) : [];
    setFormLandlineNos(parsedLandlines.length > 0 ? parsedLandlines : ['']);
    setFormArea(c.area || '');
    setFormEmail(c.contact_email || '');
    setFormWebsite(c.website || '');
    setFormLinkedin(c.linkedin || '');
    setFormIndustry(c.industry || '');
    setFormCategory(c.business_category || '');
    setFormSize(c.business_size || 'Medium');
    setFormEmployees(c.employee_count?.toString() || '');
    setFormTurnover(c.annual_turnover?.toString() || '');
    setFormCity(c.city || '');
    setFormState(c.state || '');
    setFormCountry(c.country || 'India');
    setFormAddress(c.address || '');
    setFormPinCode(c.pin_code || '');
    setFormNotes(c.notes || '');
    setFormPriority(c.priority || 'Medium');
    setFormSource(c.lead_source || '');
    setFormExecutive(c.assigned_executive_id?.toString() || '');
    setFormStage(c.stage_id?.toString() || '1');
    setFormStatus(c.status || 'New Lead');
  };

  // Filter listings
  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.pan && c.pan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage = stageFilter ? c.stage_id.toString() === stageFilter : true;
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    const matchesIndustry = industryFilter ? c.industry === industryFilter : true;

    return matchesSearch && matchesStage && matchesStatus && matchesIndustry;
  });

  const getStageName = (stageId: number) => {
    const stages: Record<number, string> = {
      1: 'Lead Discovery',
      2: 'Lead Outreach',
      3: 'Meetings',
      4: 'Qualification',
      5: 'Proposal',
      6: 'Won',
      7: 'Closed Lost'
    };
    return stages[stageId] || `Stage ${stageId}`;
  };

  const isTelecaller = user?.role === 'Telecaller';

  return (
    <div>
      {/* Search & Actions Panel */}
      <div className="card flex items-center justify-between gap-4 p-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="search-container w-full">
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search companies by name, GST, PAN, city..."
              className="search-input w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: '180px' }} value={stageFilter} onChange={e => {
            setStageFilter(e.target.value);
            setStatusFilter('');
          }}>
            <option value="">All Stages</option>
            <option value="1">Lead Discovery</option>
            <option value="2">Lead Outreach</option>
            <option value="3">Meetings</option>
            <option value="4">Qualification</option>
            <option value="5">Proposal</option>
            <option value="6">Won</option>
            <option value="7">Closed Lost</option>
          </select>
          <select className="form-select" style={{ width: '180px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {pipelineOptions
              .filter(p => (stageFilter ? p.stageId.toString() === stageFilter : true))
              .map(p => (
                <option key={p.status} value={p.status}>{p.status}</option>
              ))
            }
          </select>
        </div>

        <div className="flex gap-2">
          {['Admin', 'CEO'].includes(user?.role || '') && (
            <>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleExcelUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary flex items-center gap-2"
                disabled={uploadingExcel}
              >
                <FileSpreadsheet size={16} />
                <span>{uploadingExcel ? 'Uploading...' : 'Upload Excel'}</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              resetCompanyForm();
              setShowAddModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Lead / Company</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center p-6">Loading companies...</div>
      ) : filteredCompanies.length === 0 ? (
        <div className="card text-center text-muted p-12">No companies matching filters</div>
      ) : (
        <div className="grid grid-3 gap-4" style={{ padding: '8px 0' }}>
          {filteredCompanies.map((c) => (
            <div key={c.company_id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
              <div className="flex items-center justify-between border-b" style={{ paddingBottom: '12px', borderColor: 'var(--border)' }}>
                <div className="font-bold text-primary flex items-center gap-2">
                  <Building2 size={16} className="text-muted" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '15px' }}>{c.company_name}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenCompanyDetail(c.company_id)} 
                    className="btn btn-secondary btn-sm" 
                    title="View Details" 
                    style={{ padding: '4px', cursor: 'pointer' }}
                  >
                    <Eye size={14} />
                  </button>
                  {['Admin', 'CEO', 'BD Manager'].includes(user?.role || '') && (
                    <button 
                      type="button"
                      onClick={() => setConfirmDeleteId(c.company_id)} 
                      className="btn btn-danger btn-sm" 
                      title="Delete" 
                      style={{ padding: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-2 gap-3 text-sm mb-4 cursor-pointer" onClick={() => handleOpenCompanyDetail(c.company_id)}>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">Industry</span>
                  <span className="font-medium">{c.industry || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">City & Area</span>
                  <span className="font-medium">{c.city || c.area ? `${c.city || ''}${c.city && c.area ? ', ' : ''}${c.area || ''}` : '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">Contact Person</span>
                  <span className="font-medium">{c.contact_person || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">Designation</span>
                  <span className="font-medium">{c.contact_designation || '—'}</span>
                </div>
                <div className="span-2">
                  <span className="text-muted block text-xs font-semibold mb-1">Contact Numbers</span>
                  <span className="font-medium">
                    {c.contact_no ? `M: ${c.contact_no}` : ''}
                    {c.contact_no && c.contact_landline ? ' | ' : ''}
                    {c.contact_landline ? `L: ${c.contact_landline}` : ''}
                    {!c.contact_no && !c.contact_landline ? '—' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">Uploaded Date</span>
                  <span className="font-medium">{new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-muted block text-xs font-semibold mb-1">Stage Updated</span>
                  <span className="font-medium">{c.stage_updated_at ? new Date(c.stage_updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Editable Remarks Field */}
              <div className="mb-4">
                <span className="text-muted block text-xs font-semibold mb-1">Remarks</span>
                <textarea
                  className="form-textarea w-full text-sm"
                  placeholder="Click here to add or update remarks..."
                  rows={2}
                  style={{ minHeight: '46px', padding: '8px 10px', resize: 'vertical', color: 'var(--text)', lineHeight: '1.4' }}
                  defaultValue={c.notes || ''}
                  onBlur={(e) => handleUpdateRemarks(c.company_id, e.target.value)}
                />
              </div>

              <div className="mt-auto border-t flex flex-col gap-2" style={{ paddingTop: '12px', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <select
                    className="form-select flex-1"
                    style={{ padding: '4px 8px', fontSize: '12px', height: '32px', minHeight: '32px' }}
                    value={c.stage_id.toString()}
                    onChange={(e) => {
                      const newStageId = e.target.value;
                      const validOptions = pipelineOptions.filter(p => p.stageId.toString() === newStageId);
                      const newStatus = validOptions.length > 0 ? validOptions[0].status : '';
                      handleInlineStatusUpdate(c.company_id, `${newStageId}|${newStatus}`);
                    }}
                  >
                    <option value="1">Lead Discovery</option>
                    <option value="2">Lead Outreach</option>
                    <option value="3">Meetings</option>
                    <option value="4">Qualification</option>
                    <option value="5">Proposal</option>
                    <option value="6">Won</option>
                    <option value="7">Closed Lost</option>
                  </select>

                  <select
                    className="form-select flex-1"
                    style={{ padding: '4px 8px', fontSize: '12px', height: '32px', minHeight: '32px' }}
                    value={`${c.stage_id}|${c.status}`}
                    onChange={(e) => handleInlineStatusUpdate(c.company_id, e.target.value)}
                  >
                    {pipelineOptions.filter(opt => opt.stageId === c.stage_id).map(opt => (
                      <option key={`${opt.stageId}|${opt.status}`} value={`${opt.stageId}|${opt.status}`}>
                        {opt.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">Register New Lead (Company)</h3>
              <button className="theme-switch" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body grid grid-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input type="text" required className="form-input" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input type="text" className="form-input" value={formContactPerson} onChange={e => setFormContactPerson(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select className="form-select" value={formDesignation} onChange={e => setFormDesignation(e.target.value)}>
                    <option value="">Select Designation</option>
                    <option>CEO</option>
                    <option>Founder</option>
                    <option>Managing Director</option>
                    <option>General Manager</option>
                    <option>HR Manager</option>
                    <option>Marketing Manager</option>
                    <option>Sales Manager</option>
                    <option>Software Engineer</option>
                    <option>Team Lead</option>
                    <option>Executive</option>
                    <option>Consultant</option>
                    <option>Owner</option>
                    <option>Freelancer</option>
                    <option>Student</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile No(s)</label>
                  {formMobileNos.map((no, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" className="form-input" placeholder="e.g. 9876543210" value={no} onChange={e => {
                        const newNos = [...formMobileNos];
                        newNos[idx] = e.target.value;
                        setFormMobileNos(newNos);
                      }} />
                      {idx === formMobileNos.length - 1 ? (
                        <button type="button" className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={() => setFormMobileNos([...formMobileNos, ''])}>+</button>
                      ) : (
                        <button type="button" className="btn btn-danger" style={{ padding: '0 12px' }} onClick={() => setFormMobileNos(formMobileNos.filter((_, i) => i !== idx))}>-</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Landline No(s)</label>
                  {formLandlineNos.map((no, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" className="form-input" placeholder="e.g. 044-12345678" value={no} onChange={e => {
                        const newNos = [...formLandlineNos];
                        newNos[idx] = e.target.value;
                        setFormLandlineNos(newNos);
                      }} />
                      {idx === formLandlineNos.length - 1 ? (
                        <button type="button" className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={() => setFormLandlineNos([...formLandlineNos, ''])}>+</button>
                      ) : (
                        <button type="button" className="btn btn-danger" style={{ padding: '0 12px' }} onClick={() => setFormLandlineNos(formLandlineNos.filter((_, i) => i !== idx))}>-</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <select className="form-select" value={formIndustry} onChange={e => setFormIndustry(e.target.value)}>
                    <option value="">Select Industry</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="IT & Software">IT & Software</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Banking & Finance">Banking & Finance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Source</label>
                  <select className="form-select" value={formSource} onChange={e => setFormSource(e.target.value)}>
                    <option value="">Select Source</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="LinkedIn outreach">LinkedIn outreach</option>
                    <option value="Website form">Website form</option>
                    <option value="Reference">Reference</option>
                    <option value="WhatsApp campaign">WhatsApp campaign</option>
                  </select>
                </div>
                {!isTelecaller && (
                  <div className="form-group">
                    <label className="form-label">Annual Turnover (INR)</label>
                    <input type="number" className="form-input" value={formTurnover} onChange={e => setFormTurnover(e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Business Size</label>
                  <select className="form-select" value={formSize} onChange={e => setFormSize(e.target.value)}>
                    <option value="Small">Small (&lt; 50 employees)</option>
                    <option value="Medium">Medium (50-250 employees)</option>
                    <option value="Large">Large (&gt; 250 employees)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" value={formCity} onChange={e => setFormCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area</label>
                  <input type="text" className="form-input" placeholder="e.g. Anna Nagar, T.Nagar" value={formArea} onChange={e => setFormArea(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" value={formState} onChange={e => setFormState(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={formPinCode} onChange={e => setFormPinCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={formPriority} onChange={e => setFormPriority(e.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                {['Admin', 'CEO', 'BD Manager'].includes(user?.role || '') && (
                  <div className="form-group">
                    <label className="form-label">Assign Executive</label>
                    <select className="form-select" value={formExecutive} onChange={e => setFormExecutive(e.target.value)}>
                      <option value="">Unassigned</option>
                      {executives.map(ex => (
                        <option key={ex.user_id} value={ex.user_id}>{ex.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group span-2">
                  <label className="form-label">Address</label>
                  <textarea rows={2} className="form-textarea" value={formAddress} onChange={e => setFormAddress(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" style={{ height: '90vh' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Building2 className="text-primary" />
                <div>
                  <h3 className="modal-title">{selectedCompany.company_name}</h3>
                  {!isEditingStage ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-info text-xs">{getStageName(selectedCompany.stage_id)} — {selectedCompany.status}</span>
                      <button className="text-xs text-primary underline" style={{ background: 'none' }} onClick={() => setIsEditingStage(true)}>Move Stage</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <select className="form-select" style={{ padding: '2px 6px', fontSize: '11px', width: 'auto' }} value={editStageId} onChange={e => {
                        setEditStageId(e.target.value);
                        const validOptions = pipelineOptions.filter(p => p.stageId.toString() === e.target.value);
                        if (validOptions.length > 0) setEditStatus(validOptions[0].status);
                      }}>
                        <option value="1">Lead Discovery</option>
                        <option value="2">Lead Outreach</option>
                        <option value="3">Meetings</option>
                        <option value="4">Qualification</option>
                        <option value="5">Proposal</option>
                        <option value="6">Won</option>
                        <option value="7">Closed Lost</option>
                      </select>
                      <select className="form-select" style={{ padding: '2px 6px', fontSize: '11px', width: 'auto' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        {pipelineOptions.filter(p => p.stageId.toString() === editStageId).map(p => (
                          <option key={p.status} value={p.status}>{p.status}</option>
                        ))}
                      </select>
                      <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={handleUpdatePipelineStage}>Save</button>
                      <button className="text-xs text-muted underline" style={{ background: 'none' }} onClick={() => setIsEditingStage(false)}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    loadCompanyIntoForm(selectedCompany);
                    setShowEditProfileModal(true);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Edit size={12} />
                  <span>Edit Profile</span>
                </button>
                <button className="theme-switch" onClick={() => setSelectedCompany(null)}><X size={20} /></button>
              </div>
            </div>

            {/* Tabs Header */}
            <div className="tabs-container p-4" style={{ margin: 0, paddingBottom: 0 }}>
              <span onClick={() => setActiveTab('profile')} className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}>Details</span>
              <span onClick={() => setActiveTab('contacts')} className={`tab-item ${activeTab === 'contacts' ? 'active' : ''}`}>Contacts</span>
              <span onClick={() => setActiveTab('followups')} className={`tab-item ${activeTab === 'followups' ? 'active' : ''}`}>Outreach</span>
              <span onClick={() => setActiveTab('meetings')} className={`tab-item ${activeTab === 'meetings' ? 'active' : ''}`}>Meetings</span>
              {!isTelecaller && (
                <span onClick={() => setActiveTab('financials')} className={`tab-item ${activeTab === 'financials' ? 'active' : ''}`}>Proposal & NDA</span>
              )}
              <span onClick={() => setActiveTab('documents')} className={`tab-item ${activeTab === 'documents' ? 'active' : ''}`}>Documents</span>
              <span onClick={() => setActiveTab('timeline')} className={`tab-item ${activeTab === 'timeline' ? 'active' : ''}`}>Activity Timeline</span>
            </div>

            <div className="modal-body" style={{ backgroundColor: 'var(--background)' }}>
              {/* Tab 1: Profile Details */}
              {activeTab === 'profile' && (
                <div className="grid grid-2 gap-4">
                  <div className="card">
                    <h4 className="font-semibold text-sm mb-4">Business Information</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Company Name:</td>
                          <td className="p-2 text-right font-bold">{selectedCompany.company_name || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Contact Person:</td>
                          <td className="p-2 text-right font-bold">{selectedCompany.contact_person || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Designation:</td>
                          <td className="p-2 text-right">{selectedCompany.contact_designation || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Mobile No:</td>
                          <td className="p-2 text-right font-bold">{selectedCompany.contact_no || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Landline No:</td>
                          <td className="p-2 text-right">{selectedCompany.contact_landline || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Email:</td>
                          <td className="p-2 text-right">
                            {selectedCompany.contact_email
                              ? <a href={`mailto:${selectedCompany.contact_email}`} className="text-primary">{selectedCompany.contact_email}</a>
                              : '—'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Website:</td>
                          <td className="p-2 text-right text-primary">
                            {selectedCompany.website ? <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 justify-end">{selectedCompany.website} <ExternalLink size={12} /></a> : '—'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">LinkedIn:</td>
                          <td className="p-2 text-right text-primary">
                            {selectedCompany.linkedin ? <a href={selectedCompany.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 justify-end">LinkedIn Profile <ExternalLink size={12} /></a> : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <h4 className="font-semibold text-sm mb-4">Location & Logistics</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">HQ Location:</td>
                          <td className="p-2 text-right">{selectedCompany.city ? `${selectedCompany.city}, ${selectedCompany.state}, ${selectedCompany.country}` : '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Area:</td>
                          <td className="p-2 text-right">{selectedCompany.area || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">PIN Code:</td>
                          <td className="p-2 text-right">{selectedCompany.pin_code || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Address:</td>
                          <td className="p-2 text-right">{selectedCompany.address || '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="p-2 text-muted font-medium">Assigned Executive:</td>
                          <td className="p-2 text-right font-bold">{selectedCompany.assigned_executive_name || 'Unassigned'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Contacts */}
              {activeTab === 'contacts' && (
                <div>
                  <div className="grid grid-3 gap-4 mb-4">
                    {selectedCompany.contacts?.map(contact => (
                      <div key={contact.contact_id} className="card relative" style={{ marginBottom: 0 }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">{contact.name}</span>
                          {contact.is_primary && <span className="badge badge-success" style={{ fontSize: '10px' }}>Primary</span>}
                        </div>
                        <p className="text-xs text-muted font-medium mb-2">{contact.designation} — {contact.department}</p>
                        
                        <div className="flex flex-col gap-1 text-xs mt-2">
                          <div className="flex items-center gap-2"><Phone size={12} className="text-muted" /> <span>{contact.mobile}</span></div>
                          <div className="flex items-center gap-2"><Mail size={12} className="text-muted" /> <span>{contact.email}</span></div>
                        </div>

                        <div className="flex gap-1 mt-3 flex-wrap">
                          {contact.is_decision_maker && <span className="badge badge-info" style={{ fontSize: '9px' }}>Decision Maker</span>}
                          {contact.is_legal && <span className="badge badge-secondary" style={{ fontSize: '9px' }}>Legal Contact</span>}
                          {contact.is_finance && <span className="badge badge-warning" style={{ fontSize: '9px' }}>Finance Contact</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Contact Form */}
                  <form onSubmit={handleAddContact} className="card">
                    <h4 className="font-semibold text-sm mb-4">Add Contact Person</h4>
                    <div className="grid grid-3 gap-4">
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input type="text" required className="form-input" value={contactName} onChange={e => setContactName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Designation</label>
                        <input type="text" className="form-input" value={contactDesignation} onChange={e => setContactDesignation(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mobile Phone</label>
                        <input type="text" className="form-input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                        <input type="checkbox" id="chkDM" checked={contactIsDM} onChange={e => setContactIsDM(e.target.checked)} />
                        <label htmlFor="chkDM" className="form-label mb-0 cursor-pointer">Decision Maker</label>
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                        <input type="checkbox" id="chkPrimary" checked={contactIsPrimary} onChange={e => setContactIsPrimary(e.target.checked)} />
                        <label htmlFor="chkPrimary" className="form-label mb-0 cursor-pointer">Primary Contact</label>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-2">
                      <PlusCircle size={16} />
                      <span>Add Contact</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Timeline - Professional Pipeline Journey */}
              {activeTab === 'timeline' && (() => {
                const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                // All pipeline stages
                const pipelineStages = [
                  { id: 1, name: 'Lead Discovery' },
                  { id: 2, name: 'Lead Outreach' },
                  { id: 3, name: 'Meetings' },
                  { id: 4, name: 'Qualification' },
                  { id: 5, name: 'Proposal' },
                  { id: 6, name: 'Won' },
                  { id: 7, name: 'Closed Lost' },
                ];

                // Get all timeline entries (both old and new formats)
                const allEntries = (selectedCompany.timeline || [])
                  .filter(t => t.action_type === 'Stage Move' || t.action_type === 'Status Changed' || t.action_type === 'Lead Created')
                  .slice()
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                // Extract status from description
                const extractStatus = (desc: string) => {
                  const m1 = desc.match(/—\s*(.+)$/);
                  if (m1) return m1[1].trim();
                  const m2 = desc.match(/Status updated to '(.+?)'/);
                  if (m2) return m2[1].trim();
                  const m3 = desc.match(/Status changed from .+? to '(.+?)'/);
                  if (m3) return m3[1].trim();
                  const m4 = desc.match(/to '([^']+)'(?:\s*$|,)/);
                  if (m4) return m4[1].trim();
                  return '';
                };

                // Extract stage number from old description
                const extractStageId = (desc: string) => {
                  const m = desc.match(/Stage changed from \d+ to (\d+)/);
                  if (m) return parseInt(m[1]);
                  const m2 = desc.match(/Moved to (.+?)(?:\s*—|$)/);
                  if (m2) {
                    const name = m2[1].trim();
                    const found = pipelineStages.find(s => s.name === name);
                    if (found) return found.id;
                  }
                  const m3 = desc.match(/in (.+)$/);
                  if (m3) {
                    const name = m3[1].trim();
                    const found = pipelineStages.find(s => s.name === name);
                    if (found) return found.id;
                  }
                  return null;
                };

                // Build stage history: map stageId -> {date, status, entries[]}
                const stageHistory: Record<number, { date: string; status: string; entries: { date: string; status: string }[] }> = {};

                // Stage 1 = Upload date (always)
                stageHistory[1] = {
                  date: selectedCompany.created_at,
                  status: 'New Lead',
                  entries: [{ date: selectedCompany.created_at, status: 'New Lead' }]
                };

                // Parse timeline entries to build history
                allEntries.forEach(entry => {
                  const status = extractStatus(entry.description);
                  if (!status) return;

                  const stageId = extractStageId(entry.description);
                  if (stageId) {
                    if (!stageHistory[stageId]) {
                      stageHistory[stageId] = { date: entry.created_at, status, entries: [] };
                    }
                    stageHistory[stageId].entries.push({ date: entry.created_at, status });
                    stageHistory[stageId].status = status; // latest status
                  } else {
                    // Status-only change within current stage
                    const currentStageId = selectedCompany.stage_id;
                    if (!stageHistory[currentStageId]) {
                      stageHistory[currentStageId] = { date: entry.created_at, status, entries: [] };
                    }
                    stageHistory[currentStageId].entries.push({ date: entry.created_at, status });
                    stageHistory[currentStageId].status = status;
                  }
                });

                const currentStageId = selectedCompany.stage_id;

                // Determine which stages to show (up to current stage, or all if stage 7)
                const stagesToShow = currentStageId === 7
                  ? pipelineStages
                  : pipelineStages.filter(s => s.id <= currentStageId && s.id !== 7);

                return (
                  <div className="card">
                    <h4 className="font-semibold text-sm mb-2">Lead Activity Logs</h4>
                    <p style={{ color: '#888', fontSize: '12px', marginBottom: '20px' }}>Complete pipeline journey from upload to current stage</p>

                    <div style={{ position: 'relative', paddingLeft: '32px' }}>
                      {stagesToShow.map((stage, idx) => {
                        const history = stageHistory[stage.id];
                        const isCompleted = stage.id < currentStageId;
                        const isCurrent = stage.id === currentStageId;
                        const isPending = stage.id > currentStageId;
                        const isLast = idx === stagesToShow.length - 1;

                        // Circle colors
                        const circleColor = isCompleted ? '#22c55e' : isCurrent ? '#3b82f6' : '#d1d5db';
                        const circleIcon = isCompleted ? '✓' : isCurrent ? '●' : '';

                        return (
                          <div key={stage.id} style={{ position: 'relative', paddingBottom: isLast ? '0' : '24px' }}>
                            {/* Vertical line */}
                            {!isLast && (
                              <div style={{
                                position: 'absolute', left: '-20px', top: '24px', bottom: '0',
                                width: '2px', background: isCompleted ? '#22c55e' : '#e5e7eb'
                              }} />
                            )}
                            {/* Circle */}
                            <div style={{
                              position: 'absolute', left: '-28px', top: '2px',
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: circleColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '10px', fontWeight: 700,
                              boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none'
                            }}>
                              {circleIcon}
                            </div>

                            {/* Content */}
                            <div style={{
                              background: isCurrent ? '#f0f7ff' : 'transparent',
                              border: isCurrent ? '1px solid #bfdbfe' : '1px solid transparent',
                              borderRadius: '8px', padding: '10px 14px',
                              marginLeft: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: isPending ? '#aaa' : '#222', fontSize: '14px' }}>
                                  {stage.name}
                                </span>
                                {isCurrent && (
                                  <span style={{
                                    background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 600,
                                    padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px'
                                  }}>
                                    Current
                                  </span>
                                )}
                                {isCompleted && (
                                  <span style={{
                                    background: '#dcfce7', color: '#16a34a', fontSize: '10px', fontWeight: 600,
                                    padding: '2px 8px', borderRadius: '10px'
                                  }}>
                                    Completed
                                  </span>
                                )}
                              </div>

                              {history ? (
                                <div style={{ marginTop: '6px' }}>
                                  {/* First entry = when they entered this stage */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#444' }}>
                                    <span style={{ fontWeight: 600 }}>{fmt(history.date)}</span>
                                    <span style={{ color: '#888' }}>at {fmtTime(history.date)}</span>
                                  </div>
                                  {/* Show all status changes within this stage */}
                                  {history.entries.length > 0 && (
                                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      {history.entries.map((e, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                          <span style={{ color: '#999', width: '6px', height: '6px', borderRadius: '50%', background: '#ccc', display: 'inline-block', flexShrink: 0 }} />
                                          <span style={{ color: '#555' }}>{fmt(e.date)}</span>
                                          <span style={{ color: '#222', fontWeight: 600 }}>— {e.status}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>Not reached yet</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Tab 4: Outreach & Follow-ups */}
              {activeTab === 'followups' && (
                <div>
                  {/* Schedule Followup Call */}
                  <form onSubmit={handleScheduleFollowup} className="card">
                    <h4 className="font-semibold text-sm mb-4">Log Call Outreach & Schedule Follow-up</h4>
                    <div className="grid grid-3 gap-4">
                      <div className="form-group">
                        <label className="form-label">Follow-up Date *</label>
                        <input type="date" required className="form-input" value={fuDate} onChange={e => setFuDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Follow-up Time</label>
                        <input type="time" className="form-input" value={fuTime} onChange={e => setFuTime(e.target.value)} />
                      </div>
                      <div className="form-group span-2">
                        <label className="form-label">Outreach Notes / Comments</label>
                        <textarea rows={2} className="form-textarea" placeholder="e.g. Called, spoke to director. Interested, requested proposal..." value={fuComments} onChange={e => setFuComments(e.target.value)} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-2">Log Call & Save Follow-up</button>
                  </form>
                </div>
              )}

              {/* Tab 5: Meetings */}
              {activeTab === 'meetings' && (
                <div>
                  <div className="card">
                    <h4 className="font-semibold text-sm mb-4">Scheduled & Completed Meetings</h4>
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Meeting Date</th>
                            <th>Time</th>
                            <th>Meeting Type</th>
                            <th>Platform</th>
                            <th>Agenda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCompany.meetings?.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-muted">No meetings scheduled.</td></tr>
                          ) : (
                            selectedCompany.meetings?.map((m, idx) => (
                              <tr key={idx}>
                                <td className="font-bold">{m.meeting_date}</td>
                                <td>{m.meeting_time}</td>
                                <td>{m.meeting_type}</td>
                                <td>{m.platform} {m.platform_link && <a href={m.platform_link} target="_blank" rel="noreferrer" title="Join Link"><ExternalLink size={12} /></a>}</td>
                                <td>{m.agenda}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Meeting Form */}
                  <form onSubmit={handleScheduleMeeting} className="card">
                    <h4 className="font-semibold text-sm mb-4">Schedule Next Meeting</h4>
                    <div className="grid grid-3 gap-4">
                      <div className="form-group">
                        <label className="form-label">Meeting Date *</label>
                        <input type="date" required className="form-input" value={meetDate} onChange={e => setMeetDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meeting Time *</label>
                        <input type="time" required className="form-input" value={meetTime} onChange={e => setMeetTime(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Duration (minutes)</label>
                        <select className="form-select" value={meetDuration} onChange={e => setMeetDuration(e.target.value)}>
                          <option value="15">15 mins</option>
                          <option value="30">30 mins</option>
                          <option value="45">45 mins</option>
                          <option value="60">60 mins</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meeting Type</label>
                        <select className="form-select" value={meetType} onChange={e => setMeetType(e.target.value)}>
                          <option value="Online">Online</option>
                          <option value="Offline">Offline</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Platform</label>
                        <select className="form-select" value={meetPlatform} onChange={e => setMeetPlatform(e.target.value)}>
                          <option value="Google Meet">Google Meet</option>
                          <option value="Zoom">Zoom</option>
                          <option value="Microsoft Teams">Microsoft Teams</option>
                          <option value="In Person">In Person (Office)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Link</label>
                        <input type="url" className="form-input" placeholder="https://meet.google.com/..." value={meetLink} onChange={e => setMeetLink(e.target.value)} />
                      </div>
                      <div className="form-group span-3">
                        <label className="form-label">Agenda</label>
                        <textarea rows={2} className="form-textarea" placeholder="What is the objective of this meeting?" value={meetAgenda} onChange={e => setMeetAgenda(e.target.value)} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-2">Schedule Meeting</button>
                  </form>
                </div>
              )}

              {/* Tab 6: Financials (Proposals & NDA) */}
              {activeTab === 'financials' && !isTelecaller && (
                <div className="grid grid-2 gap-4">
                  {/* Proposal Section */}
                  <div className="card">
                    <h4 className="font-semibold text-sm mb-4">Proposals shared</h4>
                    <div className="table-container mb-4">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Number</th>
                            <th>Date</th>
                            <th className="text-right font-medium">Final Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCompany.proposals?.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted">No proposal shared.</td></tr>
                          ) : (
                            selectedCompany.proposals?.map((p, idx) => (
                              <tr key={idx}>
                                <td>{p.proposal_number}</td>
                                <td>{p.proposal_date}</td>
                                <td className="text-right font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.final_value)}</td>
                                <td><span className="badge badge-info">{p.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* New Proposal Form */}
                    <form onSubmit={handleCreateProposal} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <h5 className="font-semibold text-xs mb-2">Create Retainer Proposal</h5>
                      <div className="grid grid-2 gap-2">
                        <div className="form-group">
                          <label className="form-label text-xs">Proposal Number *</label>
                          <input type="text" placeholder="e.g. ABI-2026-001" required className="form-input text-xs p-1" value={propNumber} onChange={e => setPropNumber(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs">Service Category</label>
                          <input type="text" placeholder="e.g. Corporate Retainer" className="form-input text-xs p-1" value={propCategory} onChange={e => setPropCategory(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs">Est Value (INR) *</label>
                          <input type="number" required className="form-input text-xs p-1" value={propEstValue} onChange={e => {
                            setPropEstValue(e.target.value);
                            setPropFinalValue(e.target.value);
                          }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs">Final Value (INR) *</label>
                          <input type="number" required className="form-input text-xs p-1" value={propFinalValue} onChange={e => setPropFinalValue(e.target.value)} />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm mt-2">Generate Draft Proposal</button>
                    </form>
                  </div>

                  {/* NDA Section */}
                  <div className="card">
                    <h4 className="font-semibold text-sm mb-4">NDA Agreement Status</h4>
                    <div className="table-container mb-4">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Version</th>
                            <th>Sent Date</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCompany.ndas?.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted">No NDA initialized.</td></tr>
                          ) : (
                            selectedCompany.ndas?.map((n, idx) => (
                              <tr key={idx}>
                                <td>v{n.nda_version}</td>
                                <td>{n.sent_date || '—'}</td>
                                <td><span className={`badge ${n.status === 'Signed' ? 'badge-success' : 'badge-warning'}`}>{n.status}</span></td>
                                <td>
                                  {n.status !== 'Signed' && (
                                    <button type="button" onClick={() => handleSignNDA(n.nda_id)} className="btn btn-primary btn-sm flex items-center gap-1">
                                      <FileSignature size={12} />
                                      <span>Mark Signed</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* New NDA Form */}
                    <form onSubmit={handleCreateNDA} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <h5 className="font-semibold text-xs mb-2">Initialize Non-Disclosure Agreement (NDA)</h5>
                      <div className="grid grid-2 gap-2">
                        <div className="form-group">
                          <label className="form-label text-xs">NDA Version</label>
                          <input type="text" className="form-input text-xs p-1" value={ndaVersion} onChange={e => setNdaVersion(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs">Sent Date *</label>
                          <input type="date" required className="form-input text-xs p-1" value={ndaSentDate} onChange={e => setNdaSentDate(e.target.value)} />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm mt-2">Send Mutual NDA</button>
                    </form>
                  </div>
                </div>
              )}

              {/* Tab 7: Documents */}
              {activeTab === 'documents' && (
                <div>
                  <div className="grid grid-4 gap-4 mb-4">
                    {selectedCompany.documents?.map(doc => (
                      <div key={doc.document_id} className="card flex items-center justify-between p-4" style={{ marginBottom: 0 }}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="text-muted" />
                          <div>
                            <span className="font-bold text-xs block">{doc.name}</span>
                            <span className="text-xs text-muted">{doc.type}</span>
                          </div>
                        </div>
                        <a href="#" className="btn btn-secondary btn-sm" onClick={(e) => {
                          e.preventDefault();
                          alert('Downloading file: ' + doc.name);
                        }}>Download</a>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleUploadDocument} className="card">
                    <h4 className="font-semibold text-sm mb-4">Upload Document (Mock)</h4>
                    <div className="grid grid-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">Document Display Name *</label>
                        <input type="text" required placeholder="e.g. GST Registration Certificate" className="form-input" value={docName} onChange={e => setDocName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Document Type</label>
                        <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                          <option value="Company Profile">Company Profile</option>
                          <option value="NDA">NDA</option>
                          <option value="Proposal">Proposal</option>
                          <option value="Meeting Minutes">Meeting Minutes</option>
                          <option value="Visiting Card">Visiting Card</option>
                          <option value="GST">GST Certificate</option>
                          <option value="PAN">PAN Copy</option>
                          <option value="Agreement">Signed Agreement</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-2">
                      <FileUp size={16} />
                      <span>Upload Document</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Profile Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">Edit Company Details</h3>
              <button className="theme-switch" onClick={() => setShowEditProfileModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCompanyEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body grid grid-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input type="text" required className="form-input" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input type="text" className="form-input" value={formContactPerson} onChange={e => setFormContactPerson(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select className="form-select" value={formDesignation} onChange={e => setFormDesignation(e.target.value)}>
                    <option value="">Select Designation</option>
                    <option>CEO</option>
                    <option>Founder</option>
                    <option>Managing Director</option>
                    <option>General Manager</option>
                    <option>HR Manager</option>
                    <option>Marketing Manager</option>
                    <option>Sales Manager</option>
                    <option>Software Engineer</option>
                    <option>Team Lead</option>
                    <option>Executive</option>
                    <option>Consultant</option>
                    <option>Owner</option>
                    <option>Freelancer</option>
                    <option>Student</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile No(s)</label>
                  {formMobileNos.map((no, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" className="form-input" placeholder="e.g. 9876543210" value={no} onChange={e => {
                        const newNos = [...formMobileNos];
                        newNos[idx] = e.target.value;
                        setFormMobileNos(newNos);
                      }} />
                      {idx === formMobileNos.length - 1 ? (
                        <button type="button" className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={() => setFormMobileNos([...formMobileNos, ''])}>+</button>
                      ) : (
                        <button type="button" className="btn btn-danger" style={{ padding: '0 12px' }} onClick={() => setFormMobileNos(formMobileNos.filter((_, i) => i !== idx))}>-</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Landline No(s)</label>
                  {formLandlineNos.map((no, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input type="text" className="form-input" placeholder="e.g. 044-12345678" value={no} onChange={e => {
                        const newNos = [...formLandlineNos];
                        newNos[idx] = e.target.value;
                        setFormLandlineNos(newNos);
                      }} />
                      {idx === formLandlineNos.length - 1 ? (
                        <button type="button" className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={() => setFormLandlineNos([...formLandlineNos, ''])}>+</button>
                      ) : (
                        <button type="button" className="btn btn-danger" style={{ padding: '0 12px' }} onClick={() => setFormLandlineNos(formLandlineNos.filter((_, i) => i !== idx))}>-</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input type="text" className="form-input" value={formIndustry} onChange={e => setFormIndustry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Source</label>
                  <input type="text" className="form-input" value={formSource} onChange={e => setFormSource(e.target.value)} />
                </div>
                {!isTelecaller && (
                  <div className="form-group">
                    <label className="form-label">Annual Turnover</label>
                    <input type="number" className="form-input" value={formTurnover} onChange={e => setFormTurnover(e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Business Size</label>
                  <select className="form-select" value={formSize} onChange={e => setFormSize(e.target.value)}>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" value={formCity} onChange={e => setFormCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area</label>
                  <input type="text" className="form-input" placeholder="e.g. Anna Nagar, T.Nagar" value={formArea} onChange={e => setFormArea(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" value={formState} onChange={e => setFormState(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={formPinCode} onChange={e => setFormPinCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={formPriority} onChange={e => setFormPriority(e.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                {['Admin', 'CEO', 'BD Manager'].includes(user?.role || '') && (
                  <div className="form-group">
                    <label className="form-label">Assign Executive</label>
                    <select className="form-select" value={formExecutive} onChange={e => setFormExecutive(e.target.value)}>
                      <option value="">Unassigned</option>
                      {executives.map(ex => (
                        <option key={ex.user_id} value={ex.user_id}>{ex.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Pipeline Stage</label>
                  <select className="form-select" value={formStage} onChange={e => {
                    const newStage = e.target.value;
                    setFormStage(newStage);
                    const validOptions = pipelineOptions.filter(p => p.stageId.toString() === newStage);
                    if (validOptions.length > 0) setFormStatus(validOptions[0].status);
                  }}>
                    <option value="1">Lead Discovery</option>
                    <option value="2">Lead Outreach</option>
                    <option value="3">Meetings</option>
                    <option value="4">Qualification</option>
                    <option value="5">Proposal</option>
                    <option value="6">Won (Onboarded)</option>
                    <option value="7">Closed Lost</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status Details</label>
                  <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                    {pipelineOptions.filter(p => p.stageId.toString() === formStage).map(p => (
                      <option key={p.status} value={p.status}>{p.status}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group span-2">
                  <label className="form-label">Address</label>
                  <textarea rows={2} className="form-textarea" value={formAddress} onChange={e => setFormAddress(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditProfileModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title text-danger">Confirm Delete</h3>
            </div>
            <div className="modal-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p className="text-sm" style={{ margin: 0, fontSize: '15px' }}>Are you sure you want to delete this company lead?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => {
                handleDeleteCompany(confirmDeleteId);
                setConfirmDeleteId(null);
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
