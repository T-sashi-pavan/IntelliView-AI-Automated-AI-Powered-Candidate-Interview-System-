import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Search, Filter, Download, Mail, Users, Briefcase, FileSpreadsheet } from 'lucide-react';

export default function JobSearch() {
  const [candidates, setCandidates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());

  useEffect(() => {
    // Fetch all users who are candidates
    api.get('/users/all').then(res => {
      const allCandidates = (res.data.users || []).filter(u => u.role === 'candidate');
      setCandidates(allCandidates);
      setFiltered(allCandidates);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load candidates');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = [...candidates];
    
    // Apply role filter (Job Title)
    if (selectedRole !== 'All') {
      result = result.filter(c => (c.candidateJobTitle || c.jobTitle || '')?.toLowerCase().includes(selectedRole.toLowerCase()));
    }

    // Apply skills filter
    if (skillsFilter.trim()) {
      const requiredSkills = skillsFilter.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      result = result.filter(c => {
        if (!c.skills || c.skills.length === 0) return false;
        const candidateSkillsStr = c.skills.join(', ').toLowerCase();
        return requiredSkills.every(req => candidateSkillsStr.includes(req));
      });
    }

    // Apply general search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.bio && c.bio.toLowerCase().includes(q)) ||
        (c.candidateBio && c.candidateBio.toLowerCase().includes(q)) ||
        (c.candidateJobTitle && c.candidateJobTitle.toLowerCase().includes(q)) ||
        (c.jobTitle && c.jobTitle.toLowerCase().includes(q))
      );
    }

    setFiltered(result);
  }, [search, selectedRole, skillsFilter, candidates]);

  const uniqueRoles = ['All', ...new Set(candidates.map(c => c.candidateJobTitle || c.jobTitle).filter(Boolean))];

  const handleSelect = (id) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedCandidates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === filtered.length && filtered.length > 0) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filtered.map(c => c._id)));
    }
  };

  const downloadExcel = () => {
    if (selectedCandidates.size === 0) {
      toast.error('Select at least one candidate to export.');
      return;
    }

    // Grab the full objects of selected candidates
    const toExport = candidates.filter(c => selectedCandidates.has(c._id));

    // Construct CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Job Title,Skills,Resume URL\r\n";

    // Add rows
    toExport.forEach(c => {
      const name = `"${(c.name || '').replace(/"/g, '""')}"`;
      const email = `"${(c.email || '').replace(/"/g, '""')}"`;
      const jobTitle = `"${(c.candidateJobTitle || c.jobTitle || '').replace(/"/g, '""')}"`;
      const skills = `"${(c.skills || []).join(', ').replace(/"/g, '""')}"`;
      const resume = `"${(c.resumeUrl || 'Not Uploaded').replace(/"/g, '""')}"`;
      
      csvContent += `${name},${email},${jobTitle},${skills},${resume}\r\n`;
    });

    // Create Download Link natively
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `candidates_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Generated spreadsheet successfully!');
  };

  return (
    <DashboardLayout role="recruiter" title="Candidate Job Search" subtitle="Discover and export candidates based on skills and roles">
      <div className="dashboard-page">
        <div className="glass-card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)' }}>
          <div className="grid-3" style={{ gap: '20px', alignItems: 'end' }}>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label><Search size={14} style={{ display: 'inline', marginRight: 4 }}/> Global Search</label>
              <input 
                type="text" 
                placeholder="Name, Email, or Keywords..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label><Briefcase size={14} style={{ display: 'inline', marginRight: 4 }}/> Filter by Role</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                {uniqueRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label><Filter size={14} style={{ display: 'inline', marginRight: 4 }}/> Required Skills</label>
              <input 
                type="text" 
                placeholder="React, Java, UI/UX (Comma-separated)" 
                value={skillsFilter} 
                onChange={(e) => setSkillsFilter(e.target.value)} 
              />
            </div>
            
          </div>
        </div>

        <div className="table-wrapper">
          <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="chart-title">Matched Candidates</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} total results found</div>
            </div>
            
            <button 
              className="btn btn-primary" 
              onClick={downloadExcel}
              disabled={selectedCandidates.size === 0}
            >
              <FileSpreadsheet size={16} /> Export {selectedCandidates.size} Selected (.csv)
            </button>
          </div>

          {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
             </div>
          ) : filtered.length === 0 ? (
             <div className="empty-state">
               <div className="empty-state-icon"><Users size={36} /></div>
               <p>No candidates match your exact requirements.</p>
             </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>
                    <input 
                      type="checkbox" 
                      checked={selectedCandidates.size === filtered.length && filtered.length > 0} 
                      onChange={handleSelectAll} 
                    />
                  </th>
                  <th>Candidate Info</th>
                  <th>Target Role</th>
                  <th>Core Skills</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedCandidates.has(c._id)} 
                        onChange={() => handleSelect(c._id)} 
                      />
                    </td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div className="avatar">
                           {c.avatar ? <img src={c.avatar} alt="avatar" /> : c.name?.[0]?.toUpperCase()}
                         </div>
                         <div>
                           <div style={{ fontWeight: 600 }}>{c.name}</div>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.email}</div>
                         </div>
                       </div>
                    </td>
                    <td>
                       <span className="badge badge-purple">{c.candidateJobTitle || c.jobTitle || 'Unspecified'}</span>
                    </td>
                    <td style={{ maxWidth: 200, color: 'var(--text-secondary)' }} className="truncate">
                       {c.skills?.length > 0 ? c.skills.join(', ') : 'None'}
                    </td>
                    <td>
                       {c.resumeUrl ? (
                         <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                            <Download size={12} /> View Document
                         </a>
                       ) : (
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Upload</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
