import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../contexts/AuthContext';
import { FileText, Download, Trash2, FolderOpen, Search } from 'lucide-react';

interface Document {
  document_id: number;
  company_id: number;
  company_name: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_by_name: string;
  version: string;
  created_at: string;
}

const DOC_TYPES = ['Company Profile', 'NDA', 'Proposal', 'Meeting Minutes', 'Visiting Card', 'GST', 'PAN', 'Agreement', 'Other'];

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/documents`);
        setDocuments(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this document record?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.document_id !== id));
    } catch (err) {
      alert('Error deleting document');
    }
  };

  const getDocIcon = (type: string) => {
    const icons: Record<string, string> = {
      'NDA': '🔒',
      'Proposal': '📋',
      'Agreement': '✍️',
      'GST': '🧾',
      'PAN': '🪪',
      'Meeting Minutes': '📝',
      'Company Profile': '🏢',
      'Visiting Card': '💼',
    };
    return icons[type] || '📄';
  };

  const filtered = documents.filter(d => {
    const matchesType = !typeFilter || d.type === typeFilter;
    const matchesSearch = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div>
      <div className="card flex items-center justify-between p-4 mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FolderOpen className="text-primary" />
          <span className="font-bold">Document Repository</span>
          <span className="badge badge-secondary">{documents.length} files</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="search-container" style={{ width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search documents..." className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: '180px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-6">Loading documents...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-muted p-12">No documents found.</div>
      ) : (
        <div className="grid grid-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.document_id} className="card" style={{ marginBottom: 0, borderTop: '3px solid var(--primary)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '24px' }}>{getDocIcon(doc.type)}</span>
                  <div>
                    <div className="font-bold text-sm">{doc.name}</div>
                    <div className="text-xs text-muted">{doc.company_name}</div>
                  </div>
                </div>
                <span className="badge badge-secondary text-xs">{doc.type}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted mb-3">
                <span>v{doc.version} · By {doc.uploaded_by_name || 'System'}</span>
                <span>{new Date(doc.created_at).toLocaleDateString('en-IN')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-secondary btn-sm flex-1"
                  onClick={() => alert(`Downloading: ${doc.name}\nPath: ${doc.file_url}`)}
                >
                  <Download size={12} /> Download
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.document_id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
