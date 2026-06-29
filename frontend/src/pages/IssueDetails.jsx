import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { getAddressFromCoords } from '../services/geocode';
import ResolutionPlanner from '../components/ResolutionPlanner';
import { ArrowLeft, Clock, Calendar, Shield, MapPin, User, ChevronRight, UserCheck, CheckCircle2, AlertTriangle, Loader2, Sparkles, Package, MessageSquare, ListTodo, Sliders, ChevronDown, Brain, Bot, Check, X, Edit2, Zap } from 'lucide-react';

export function IssueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Load state
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // Form states
  const [dispatchNote, setDispatchNote] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('Resolving location...');
  
  // Roster reassignments & escalation inputs
  const [reassignWorker, setReassignWorker] = useState('');
  const [reassignDept, setReassignDept] = useState('');
  const [escalatePriority, setEscalatePriority] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState(5);
  const [newCommentText, setNewCommentText] = useState('');
  const [newMaterialText, setNewMaterialText] = useState('');

  // Current user RBAC session
  const [currentUser, setCurrentUser] = useState(() => {
    const session = sessionStorage.getItem('civicmind_user');
    return session ? JSON.parse(session) : { role: 'citizen' };
  });

  // Admin Overrides States
  const [overrideStoryPoints, setOverrideStoryPoints] = useState(3);
  const [overrideUrgency, setOverrideUrgency] = useState('Medium');
  const [overrideDept, setOverrideDept] = useState('Road Maintenance');
  const [overrideWorker, setOverrideWorker] = useState('');

  const workersList = {
    'Road Maintenance': ['Rahul Sharma', 'Amit Patel', 'Sarah Jenkins'],
    'Water & Power': ['Siddharth Verma', 'David Miller', 'Lisa Wong'],
    'Sanitation': ['Priya Nair', 'John Doe', 'Michael Chang'],
    'Code Enforcement': ['Carlos Gomez', 'Elena Rostova'],
    'Parks & Recreation': ['Emily Watson', 'Marcus Johnson']
  };

  const departments = Object.keys(workersList);
  const workflowStatuses = ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection', 'Resolved', 'Closed'];

  // Fetch issue details by ID
  const fetchIssue = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getIssueById(id);
      if (response.success) {
        setIssue(response.issue);
      } else {
        setError('Issue not found.');
      }
    } catch (err) {
      console.error('Error fetching issue:', err);
      setError('Could not retrieve issue details. Ensure the server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  // Lookup address and sync form states on load
  useEffect(() => {
    if (issue) {
      setReassignWorker(issue.assignedWorker || '');
      setReassignDept(issue.department || '');
      setEscalatePriority(issue.urgency || '');
      setEscalateSeverity(issue.severity || 5);

      setOverrideStoryPoints(issue.storyPoints || 3);
      setOverrideUrgency(issue.urgency || 'Medium');
      setOverrideDept(issue.department || 'Road Maintenance');
      setOverrideWorker(issue.assignedWorker || '');

      if (issue.location && issue.location.coordinates) {
        const [lng, lat] = issue.location.coordinates;
        getAddressFromCoords(lat, lng).then(addr => setResolvedAddress(addr));
      }
    }
  }, [issue]);

  // Handle status changes (Open, In Progress, Resolved)
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const response = await apiService.updateIssueStatus(id, newStatus, dispatchNote, 'Municipal Supervisor');
      if (response.success) {
        setIssue(response.issue);
        setDispatchNote('');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    setUpdatingTicket(true);
    try {
      const response = await apiService.reassignTicket(id, reassignWorker, reassignDept);
      if (response.success) {
        setIssue(response.issue);
        alert('Ticket reassigned and crew log updated.');
      }
    } catch (err) {
      console.error(err);
      alert('Reassignment failed.');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    setUpdatingTicket(true);
    try {
      const response = await apiService.escalateTicket(id, escalatePriority, escalateSeverity);
      if (response.success) {
        setIssue(response.issue);
        alert('Ticket priority escalated.');
      }
    } catch (err) {
      console.error(err);
      alert('Escalation failed.');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleAiOverride = async (e) => {
    e.preventDefault();
    setUpdatingTicket(true);
    try {
      const response = await apiService.adminOverride(id, {
        storyPoints: overrideStoryPoints,
        urgency: overrideUrgency,
        department: overrideDept,
        assignedWorker: overrideWorker
      });
      if (response.success) {
        setIssue(response.issue);
        alert('AI override applied successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Override failed.');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleReviewRecommendation = async (type, action, modifiedValue = null) => {
    setUpdatingTicket(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/issues/${id}/recommendations/${type}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('civicmind_token') || ''}`
        },
        body: JSON.stringify({ action, modifiedValue })
      });
      const data = await response.json();
      if (data.success) {
        setIssue(data.issue);
      } else {
        alert(data.error || 'Failed to apply recommendation');
      }
    } catch (err) {
      console.error(err);
      alert('Error reviewing recommendation');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setUpdatingTicket(true);
    try {
      const response = await apiService.addComment(id, 'Municipal Supervisor', newCommentText.trim());
      if (response.success) {
        setIssue(response.issue);
        setNewCommentText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialText.trim()) return;
    setUpdatingTicket(true);
    const materials = newMaterialText.split(',').map(m => m.trim()).filter(Boolean);
    try {
      const response = await apiService.requestMaterials(id, materials);
      if (response.success) {
        setIssue(response.issue);
        setNewMaterialText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Helper for backend image path resolution
  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const host = apiURL.replace('/api', '');
    return `${host}${path}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading issue files and AI plan...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-xl font-bold text-slate-100">Details Unavailable</h2>
        <p className="text-slate-400 text-xs mt-2">{error || 'The requested issue could not be found.'}</p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const {
    ticketId,
    title,
    category,
    severity,
    urgency,
    summary,
    description,
    department,
    status,
    verificationCount,
    imageUrl,
    afterImageUrl,
    location,
    verifications = [],
    resolutionPlan = {},
    estimatedRepairTime,
    estimatedRepairCost,
    fraudAnalysis = {},
    createdAt,
    storyPoints,
    sprint,
    assignedWorker,
    dueDate,
    slaStatus,
    comments = [],
    materialsRequested = [],
    validationResult,
    statusHistory = [],
  } = issue;

  const [lng, lat] = location?.coordinates || [];

  return (
    <div className="space-y-8">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-4 gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-350 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Command Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
              {ticketId || 'ROAD-TBD'}
            </span>
            <span className="text-slate-550 text-xs">Sprint: {sprint || 'Current Sprint'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight mt-1">{title || summary}</h1>
        </div>
      </div>

      {/* Main split details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photos and Comparative Visual Inspection Panel */}
          {afterImageUrl ? (
            <div className="glass-panel rounded-3xl p-6 border border-slate-950 shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                <Sparkles className="w-4.5 h-4.5 text-brand-400" />
                <span>Comparative Repair Visual Verification (Agent 5)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Before Image</span>
                  <img
                    src={getFullImageUrl(imageUrl)}
                    alt="Before Repair"
                    className="w-full h-44 object-cover rounded-xl border border-slate-900 bg-slate-950"
                  />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">After Image</span>
                  <img
                    src={getFullImageUrl(afterImageUrl)}
                    alt="After Repair"
                    className="w-full h-44 object-cover rounded-xl border border-slate-900 bg-slate-950"
                  />
                </div>
              </div>

              {validationResult && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  validationResult.isSuccessful 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                      {validationResult.isSuccessful ? <CheckCircle2 className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
                      <span>Inspection Status: {validationResult.isSuccessful ? 'SUCCESS' : 'REWORK NEEDED'}</span>
                    </span>
                    <span>AI Confidence: {validationResult.confidence}%</span>
                  </div>
                  <p className="text-slate-350 leading-relaxed">{validationResult.remainingDamage}</p>
                  {!validationResult.isSuccessful && (
                    <p className="font-semibold">Suggested Rework: <span className="text-red-300">{validationResult.suggestedRework}</span></p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-64 sm:h-80 w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-900 shadow-2xl">
              <img
                src={getFullImageUrl(imageUrl)}
                alt={summary}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-sm text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-bold uppercase tracking-wider">
                Original Image Evidence
              </div>
            </div>
          )}

          {/* Details Overview Metadata */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-900 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded border ${
                status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {status}
              </span>

              <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded border ${
                slaStatus === 'Breached' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                SLA: {slaStatus || 'Active'}
              </span>

              <span className="text-xs bg-slate-950 border border-slate-800 text-slate-405 px-2.5 py-1 rounded-lg">
                Severity: <strong className={severity >= 7 ? 'text-red-450' : 'text-amber-450'}>{severity}/10</strong>
              </span>

              <span className="text-xs bg-slate-950 border border-slate-800 text-slate-405 px-2.5 py-1 rounded-lg">
                SPs: <strong>{storyPoints || 3} SPs</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-xs">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-450">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Reported: {new Date(createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-450">
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Worker Assigned: <strong className="text-slate-300 font-bold">{assignedWorker || 'Unassigned'}</strong></span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2 text-slate-450">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="overflow-hidden">
                    <p className="text-slate-300 font-medium leading-normal line-clamp-2">{resolvedAddress}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">GPS: {lat?.toFixed(6)}, {lng?.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Original Citizen details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Citizen Narrative</h4>
              <p className="text-xs text-slate-350 bg-slate-950/40 p-4 rounded-xl border border-slate-900 leading-relaxed">{description}</p>
            </div>
          </div>

          {/* AI Agent 10: Knowledge Base Historical Insights */}
          {issue.knowledgeBase && issue.knowledgeBase.similarTicketCount > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-900 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                <Brain className="w-4.5 h-4.5 text-brand-400" />
                <span>AI Agent 10: Knowledge Base Historical Insights</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Similar Resolved Tickets</span>
                  <p className="font-bold text-slate-200 mt-0.5">{issue.knowledgeBase.similarTicketCount} tickets</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Avg Repair Time</span>
                  <p className="font-bold text-slate-200 mt-0.5">{issue.knowledgeBase.avgRepairTimeHours || 'N/A'} hours</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Avg Repair Cost</span>
                  <p className="font-bold text-slate-200 mt-0.5">${issue.knowledgeBase.avgCostUSD || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 uppercase tracking-wide text-[9px]">Common Root Cause</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-900/60">{issue.knowledgeBase.commonRootCause}</p>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 uppercase tracking-wide text-[9px]">Proven Repair Strategy</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-900/60">{issue.knowledgeBase.successfulStrategy}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Agent 12: Resource & Dispatch Optimizer */}
          {issue.resourceEstimate && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-900 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                <Package className="w-4.5 h-4.5 text-indigo-400" />
                <span>AI Agent 12: Resource & Dispatch Optimizer</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Required Crew Size</span>
                  <p className="font-bold text-slate-200 mt-0.5">{issue.resourceEstimate.workersRequired} workers</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Est. Effort Duration</span>
                  <p className="font-bold text-slate-200 mt-0.5">{issue.resourceEstimate.estimatedDurationHours} hours</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Optimized Budget Est.</span>
                  <p className="font-bold text-slate-200 mt-0.5">${issue.resourceEstimate.estimatedCostUSD}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="block font-bold text-slate-450 uppercase tracking-wide text-[9px]">Staged Equipment</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {issue.resourceEstimate.equipment && issue.resourceEstimate.equipment.length > 0 ? (
                      issue.resourceEstimate.equipment.map((eq, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-[10px] text-slate-400">{eq}</span>
                      ))
                    ) : <span className="text-slate-600 italic">None required</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-slate-450 uppercase tracking-wide text-[9px]">Bill of Materials</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {issue.resourceEstimate.materials && issue.resourceEstimate.materials.length > 0 ? (
                      issue.resourceEstimate.materials.map((mat, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-[10px] text-slate-400">{mat}</span>
                      ))
                    ) : <span className="text-slate-600 italic">None required</span>}
                  </div>
                </div>
              </div>

              {issue.resourceEstimate.nearbyGrouping && (
                <div className="text-[11px] text-brand-400 bg-brand-500/5 border border-brand-500/10 rounded-xl p-3 leading-relaxed">
                  <strong>Dispatch Grouping Advice:</strong> {issue.resourceEstimate.nearbyGrouping}
                </div>
              )}
            </div>
          )}

          {/* Explainable AI Decision Audit Log */}
          {issue.aiDecisions && issue.aiDecisions.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-900 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                <Sparkles className="w-4.5 h-4.5 text-brand-400" />
                <span>Explainable AI Decision Audit Log</span>
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {issue.aiDecisions.map((dec, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs space-y-1.5 text-left">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-brand-400">{dec.agent}</span>
                      <span className="text-slate-500">{new Date(dec.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="font-semibold text-slate-200">{dec.action}</p>
                    <p className="text-slate-450 leading-relaxed text-[11px]">{dec.explanation}</p>
                    {dec.confidence !== undefined && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-slate-600 uppercase font-bold">Agent Confidence:</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">{dec.confidence}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Priority History (Agent 9) */}
          {issue.priorityHistory && issue.priorityHistory.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-900 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b border-slate-900 pb-3">
                <Clock className="w-4.5 h-4.5 text-amber-400" />
                <span>Dynamic Priority History (Agent 9)</span>
              </h3>
              <div className="relative pl-4 border-l border-slate-850 space-y-4 text-left">
                {issue.priorityHistory.map((hist, idx) => (
                  <div key={idx} className="relative text-xs space-y-1">
                    {/* Bullet */}
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-amber-400" />
                    <div className="flex items-center justify-between font-bold text-slate-350 text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <span>Score: {hist.oldScore} &rarr; {hist.newScore}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-850 text-[8px]">
                          {hist.oldUrgency} &rarr; {hist.newUrgency}
                        </span>
                      </span>
                      <span className="text-[9px] text-slate-550 font-normal">
                        {new Date(hist.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-450 leading-relaxed text-[11px]">{hist.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Resolution planner checklist */}
          <ResolutionPlanner plan={resolutionPlan} status={status} />
        </div>

        {/* Right Column (5 Columns) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {currentUser?.role === 'citizen' ? (
            /* ═══ CITIZEN VIEW: PUBLIC TIMELINE TIMELINE TIMELINE ═══ */
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Public Ticket Progress</h3>
              </div>

              {/* Status Stepper Timeline */}
              <div className="relative pl-6 border-l border-slate-200 space-y-6 text-left">
                {[
                  { key: 'Backlog', label: 'Citizen Reported', desc: 'Incident reported and locked into municipal database.' },
                  { key: 'Ready', label: 'AI Classified', desc: 'Gemini Agent triage completed and parameters estimated.' },
                  { key: 'Assigned', label: 'Worker Assigned', desc: 'Auto-dispatched to department technician.' },
                  { key: 'In Progress', label: 'Work Started', desc: 'Repair crew initiated repair operations at location.' },
                  { key: 'Inspection', label: 'AI Visual Inspection', desc: 'Comparative forensics scan initiated on completed work.' },
                  { key: 'Resolved', label: 'Resolved', desc: 'Repair validated successfully. Ticket closed.' },
                  { key: 'Closed', label: 'Closed', desc: 'Archived and logged in Scrum reports.' },
                ].map((step, idx) => {
                  // Find if step was reached in history
                  const histItem = statusHistory.find(h => h.status === step.key);
                  const isCurrent = status === step.key;
                  const isReached = !!histItem || isCurrent;
                  
                  return (
                    <div key={idx} className="relative text-xs">
                      {/* Circle Dot */}
                      <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center font-bold text-[8px] transition-all ${
                        isCurrent ? 'bg-blue-600 border-blue-500 text-white animate-pulse' :
                        isReached ? 'bg-emerald-500 border-emerald-400 text-white' :
                        'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {isReached && !isCurrent ? '✓' : ''}
                      </span>

                      <div className="space-y-0.5">
                        <span className={`font-bold text-xs block ${isCurrent ? 'text-blue-600 font-black' : isReached ? 'text-slate-800' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                        {histItem && (
                          <span className="text-[9px] text-slate-400 block">
                            {new Date(histItem.updatedAt).toLocaleString()}
                          </span>
                        )}
                        <p className={`text-[11px] leading-relaxed ${isCurrent ? 'text-slate-700 font-medium' : isReached ? 'text-slate-500' : 'text-slate-400'}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Citizen Information Card */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-blue-800 uppercase text-[9px] tracking-wider block">Estimated Completion Time</span>
                <p className="text-slate-705 leading-relaxed font-bold">
                  {estimatedRepairTime || '12'} hours effort estimated.
                </p>
                <div className="pt-2 border-t border-blue-100/60">
                  <span className="font-bold text-blue-800 uppercase text-[9px] tracking-wider block">AI Dispatch Summary</span>
                  <p className="text-slate-600 mt-1 italic leading-relaxed">
                    "{summary || 'Pothole restoration checklist generated'}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ═══ STAFF VIEW: COMMAND OPERATIONS & LOGS ═══ */
            <>
              {/* Human-in-the-Loop: Decision Support Panel */}
              {(currentUser?.role === 'supervisor' || currentUser?.role === 'manager' || currentUser?.role === 'admin') && issue.pendingRecommendations && Object.keys(issue.pendingRecommendations).length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5 border-b border-amber-200 pb-3">
                    <Bot className="w-4.5 h-4.5 text-amber-600" />
                    <span>AI Decision Support (Pending Review)</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(issue.pendingRecommendations).map(([key, rec]) => (
                      <div key={key} className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{rec.type} Recommendation</span>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">Suggests: {rec.suggestion}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-amber-100/50 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-amber-700 font-bold">Confidence:</span>
                            <span className="text-[10px] text-amber-800 font-mono font-bold">{rec.confidence}%</span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong>Reasoning:</strong> {rec.reasoning}
                        </p>
                        
                        {rec.alternative && (
                          <p className="text-[11px] text-slate-500 italic">
                            Alternative: {rec.alternative}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            disabled={updatingTicket}
                            onClick={() => handleReviewRecommendation(key, 'Accepted')}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            disabled={updatingTicket}
                            onClick={() => {
                              const mod = prompt('Enter modified value (e.g. correct worker name):', rec.suggestion);
                              if (mod) handleReviewRecommendation(key, 'Modified', mod);
                            }}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Modify
                          </button>
                          <button
                            disabled={updatingTicket}
                            onClick={() => handleReviewRecommendation(key, 'Rejected')}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operations Control Card */}
              <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                  <Sliders className="w-4.5 h-4.5 text-blue-600" />
                  <span>Sprint Operations Command</span>
                </h3>

                {/* Supervisor status transition pills */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Transition Status Workflow</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {workflowStatuses.map((st) => {
                      const isActive = status === st;
                      return (
                        <button
                          key={st}
                          disabled={updating || isActive}
                          onClick={() => handleStatusChange(st)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                            isActive
                              ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reassignments form */}
                <form onSubmit={handleReassign} className="space-y-3 pt-3 border-t border-slate-100">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Reassign Roster Crew</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Department</label>
                      <select
                        value={reassignDept}
                        onChange={(e) => {
                          setReassignDept(e.target.value);
                          const staff = workersList[e.target.value] || [];
                          setReassignWorker(staff[0] || '');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                      >
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Worker</label>
                      <select
                        value={reassignWorker}
                        onChange={(e) => setReassignWorker(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                      >
                        {(workersList[reassignDept] || []).map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingTicket}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
                  >
                    Apply Reassignments
                  </button>
                </form>

                {/* Priority/Severity Escalation board */}
                <form onSubmit={handleEscalate} className="space-y-3 pt-3 border-t border-slate-100">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Escalate Urgency & Severity</label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Urgency Priority</label>
                      <select
                        value={escalatePriority}
                        onChange={(e) => setEscalatePriority(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">Severity: {escalateSeverity}/10</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={escalateSeverity}
                        onChange={(e) => setEscalateSeverity(parseInt(e.target.value))}
                        className="w-full accent-blue-600 mt-2"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingTicket}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
                  >
                    Apply Escalation Adjustments
                  </button>
                </form>

                {/* Super Admin Parameter Overrides (Story Points Override) */}
                {['admin', 'super_admin'].includes(currentUser?.role) && (
                  <form onSubmit={handleAiOverride} className="space-y-3 pt-3 border-t border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>Super Admin AI Parameter Override</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Story Points</label>
                        <select
                          value={overrideStoryPoints}
                          onChange={(e) => setOverrideStoryPoints(parseInt(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                        >
                          {[1, 2, 3, 5, 8, 13].map(sp => (
                            <option key={sp} value={sp}>{sp} SPs</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Urgency</label>
                        <select
                          value={overrideUrgency}
                          onChange={(e) => setOverrideUrgency(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Dept Override</label>
                        <select
                          value={overrideDept}
                          onChange={(e) => {
                            setOverrideDept(e.target.value);
                            const staff = workersList[e.target.value] || [];
                            setOverrideWorker(staff[0] || '');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                        >
                          {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Worker Override</label>
                        <select
                          value={overrideWorker}
                          onChange={(e) => setOverrideWorker(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-700 focus:outline-none"
                        >
                          {(workersList[overrideDept] || []).map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updatingTicket}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-98"
                    >
                      Apply Admin AI Override
                    </button>
                  </form>
                )}
              </div>

              {/* Materials Checkouts */}
              <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                  <Package className="w-4.5 h-4.5 text-indigo-500" />
                  <span>Agile Materials Checkout</span>
                </h3>

                {materialsRequested && materialsRequested.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {materialsRequested.map((mat, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                        {mat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-405 italic">No checkout supplies requested yet.</p>
                )}

                <form onSubmit={handleAddMaterial} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Request materials, e.g. cold patch, signs"
                    value={newMaterialText}
                    onChange={(e) => setNewMaterialText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-750 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={updatingTicket || !newMaterialText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Ops comments */}
              <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                  <MessageSquare className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Operations Communication Logs</span>
                </h3>

                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                  {comments && comments.length > 0 ? (
                    comments.map((c, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-1">
                          <span className={c.author.includes('AI') ? 'text-blue-600' : 'text-slate-505'}>{c.author}</span>
                          <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-750 leading-normal">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-405 italic">No supervisor or worker comments recorded.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log internal crew update..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-750 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={updatingTicket || !newCommentText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Log
                  </button>
                </form>
              </div>

              {/* Status history audit timeline */}
              <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                  <ListTodo className="w-4.5 h-4.5 text-indigo-500" />
                  <span>Sprint History Audit Trail</span>
                </h3>

                <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar pl-1">
                  {statusHistory && statusHistory.length > 0 ? (
                    statusHistory.map((hist, i) => (
                      <div key={i} className="text-xs relative pl-4 border-l border-slate-200 pb-2">
                        <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-105 border border-slate-200"></span>
                        <div className="flex items-center justify-between text-[9px] text-slate-405 font-bold mb-1">
                          <span className="text-slate-600">Status: {hist.status}</span>
                          <span>{new Date(hist.updatedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-500 leading-normal">{hist.note}</p>
                        <span className="block text-[9px] text-slate-400 font-mono mt-1">Updated by: {hist.updatedBy}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No lifecycle updates logged.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueDetails;
