import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { HardHat, Wrench, ClipboardList, CheckCircle2, AlertTriangle, MessageSquare, Package, Play, Check, Loader2, ArrowRight, Calendar, ListTodo, History, Award, Sparkles } from 'lucide-react';

export function WorkerDashboard() {
  const [workerName, setWorkerName] = useState(() => {
    return sessionStorage.getItem('civicsprint_worker') || '';
  });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Form states for active ticket
  const [commentText, setCommentText] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  
  // Action processing state
  const [processing, setProcessing] = useState(false);
  const [validationMsg, setValidationMsg] = useState(null);

  // Checklist checked state dictionary keyed by ticketId-actionIndex
  const [checklistState, setChecklistState] = useState({});
  const [activeQueueTab, setActiveQueueTab] = useState('schedule');

  const workersList = [
    { name: 'Rahul Sharma', dept: 'Road Maintenance' },
    { name: 'Siddharth Verma', dept: 'Water & Power' },
    { name: 'Priya Nair', dept: 'Sanitation' },
    { name: 'Carlos Gomez', dept: 'Code Enforcement' },
    { name: 'Emily Watson', dept: 'Parks & Recreation' }
  ];

  const fetchWorkerTickets = async (name) => {
    setLoading(true);
    try {
      const response = await apiService.getIssues({ limit: 100 });
      if (response.success) {
        // Filter tickets assigned to this worker (all statuses)
        const workerTickets = response.issues.filter(
          t => t.assignedWorker === name
        );
        setTickets(workerTickets);
      }
    } catch (err) {
      console.error('Error fetching worker tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workerName) {
      fetchWorkerTickets(workerName);
    }
  }, [workerName]);

  const handleLogin = (name) => {
    sessionStorage.setItem('civicsprint_worker', name);
    setWorkerName(name);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('civicsprint_worker');
    setWorkerName('');
    setTickets([]);
    setActiveTicket(null);
  };

  const handleStartWork = async (ticketId) => {
    setProcessing(true);
    try {
      const response = await apiService.updateIssueStatus(ticketId, 'In Progress', 'Worker started physical repair operations.', workerName);
      if (response.success) {
        fetchWorkerTickets(workerName);
        if (activeTicket && activeTicket._id === ticketId) {
          setActiveTicket(response.issue);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start work');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTicket) return;
    setProcessing(true);
    try {
      const response = await apiService.addComment(activeTicket._id, workerName, commentText.trim());
      if (response.success) {
        setActiveTicket(response.issue);
        setCommentText('');
        fetchWorkerTickets(workerName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestMaterials = async (e) => {
    e.preventDefault();
    if (!materialText.trim() || !activeTicket) return;
    setProcessing(true);
    const materials = materialText.split(',').map(m => m.trim()).filter(Boolean);
    try {
      const response = await apiService.requestMaterials(activeTicket._id, materials);
      if (response.success) {
        setActiveTicket(response.issue);
        setMaterialText('');
        fetchWorkerTickets(workerName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteWork = async (e) => {
    e.preventDefault();
    if (!uploadFile || !activeTicket) {
      alert('Completion verification photo is required.');
      return;
    }
    setProcessing(true);
    setValidationMsg('AI Agent 5: Conducting Comparative Image Forensics Scan...');
    try {
      // Transition to 'Inspection' which fires validation agent 5 in the backend
      const response = await apiService.updateIssueStatus(
        activeTicket._id,
        'Inspection',
        'Repair completed. Submitted visual confirmation for AI inspection.',
        workerName,
        uploadFile
      );

      if (response.success) {
        const ticket = response.issue;
        const result = ticket.validationResult;
        
        if (result && result.isSuccessful) {
          setValidationMsg(`✅ REPAIR VERIFIED SUCCESSFULLY (${result.confidence}% Confidence)! Ticket Resolved.`);
          setTimeout(() => {
            setValidationMsg(null);
            setUploadFile(null);
            setUploadPreview(null);
            setActiveTicket(null);
            fetchWorkerTickets(workerName);
          }, 3500);
        } else {
          setValidationMsg(`❌ REPAIR INSPECTION FAILED. Remaining damage detected. Ticket reverted for Rework.`);
          setActiveTicket(ticket);
          setTimeout(() => {
            setValidationMsg(null);
            setUploadFile(null);
            setUploadPreview(null);
          }, 4500);
        }
      }
    } catch (err) {
      console.error(err);
      setValidationMsg('❌ Validation server error. Please try again.');
      setTimeout(() => setValidationMsg(null), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const host = apiURL.replace('/api', '');
    return `${host}${path}`;
  };

  // Login view
  if (!workerName) {
    return (
      <div className="max-w-md mx-auto my-16">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-900 shadow-2xl text-center">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mx-auto border border-brand-500/20 mb-6">
            <HardHat className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Field Worker Portal</h2>
          <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
            Select your assigned worker identity below to access your active queue and repair station.
          </p>

          <div className="mt-8 space-y-3.5">
            {workersList.map((worker) => (
              <button
                key={worker.name}
                onClick={() => handleLogin(worker.name)}
                className="w-full flex items-center justify-between p-4 bg-slate-950/60 border border-slate-900 rounded-xl hover:border-brand-500/50 hover:bg-slate-950 hover:shadow-lg hover:shadow-brand-500/5 text-left text-xs font-semibold text-slate-200 transition-all active:scale-98"
              >
                <div>
                  <p className="font-bold text-slate-100">{worker.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{worker.dept}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-4 gap-4">
        <div>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-wide">
            Field Ops Station
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 mt-1">
            Worker: {workerName}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all shrink-0"
        >
          Sign Out
        </button>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Active Queue List & Schedule (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-4 border border-slate-900 flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-4.5 h-4.5 text-brand-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Task Planner</h2>
            </div>
            
            {/* Simple Sub-Tabs */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-900">
              <button
                type="button"
                onClick={() => {
                  // Switch helper or filter locally
                  setActiveQueueTab('schedule');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeQueueTab === 'schedule'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today's Schedule</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[8px]">
                  {tickets.filter(t => ['Assigned', 'In Progress', 'Inspection'].includes(t.status)).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveQueueTab('completed');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeQueueTab === 'completed'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Completed Tasks</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[8px]">
                  {tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length}
                </span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-2" />
              <span className="text-xs">Fetching tasks...</span>
            </div>
          ) : (
            (() => {
              const filteredTickets = tickets.filter(t => {
                if (activeQueueTab === 'schedule') {
                  return ['Assigned', 'In Progress', 'Inspection'].includes(t.status);
                } else {
                  return ['Resolved', 'Closed'].includes(t.status);
                }
              });

              if (filteredTickets.length > 0) {
                return (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTickets.map((ticket) => {
                      const isActive = activeTicket && activeTicket._id === ticket._id;
                      const priorityColor =
                        ticket.urgency === 'Critical' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                        ticket.urgency === 'High' ? 'bg-orange-500/15 text-orange-400 border-orange-500/25' :
                        'bg-amber-500/15 text-amber-400 border-amber-500/25';
                      
                      return (
                        <div
                          key={ticket._id}
                          onClick={() => {
                            setUploadFile(null);
                            setUploadPreview(null);
                            setActiveTicket(ticket);
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-slate-900/60 border-brand-500/40 shadow-lg'
                              : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                              {ticket.ticketId || 'ROAD-TBD'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priorityColor}`}>
                              {ticket.urgency}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{ticket.title}</h4>
                          <p className="text-[11px] text-slate-450 mt-1 line-clamp-2">{ticket.description}</p>

                          <div className="mt-3.5 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              <span>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'No Due Date'}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded ${
                              ticket.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' : 
                              ticket.status === 'Inspection' ? 'bg-purple-500/10 text-purple-400' :
                              ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                return (
                  <div className="py-20 text-center border border-dashed border-slate-900 bg-slate-950/40 rounded-3xl">
                    <HardHat className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-400">
                      {activeQueueTab === 'schedule' ? "All caught up!" : "No completed tasks yet"}
                    </p>
                    <p className="text-[10px] text-slate-650 mt-1">
                      {activeQueueTab === 'schedule' 
                        ? "No active work items on your schedule." 
                        : "Complete work tickets to build your verified field portfolio."}
                    </p>
                  </div>
                );
              }
            })()
          )}
        </div>

        {/* Selected Task Operations (7 columns) */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-900 space-y-6 shadow-2xl relative overflow-hidden">
              {validationMsg && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
                  {validationMsg.includes('REWORK') ? (
                    <AlertTriangle className="w-12 h-12 text-red-500 animate-bounce mb-4" />
                  ) : validationMsg.includes('VERIFIED') ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                  ) : (
                    <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-4" />
                  )}
                  <p className="text-slate-100 font-bold text-sm leading-relaxed max-w-sm">{validationMsg}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500">Ticket Detail</span>
                    <span className="px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[8px] font-bold uppercase tracking-wider">
                      Sprint 12
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 mt-0.5">{activeTicket.ticketId}: {activeTicket.title}</h2>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTicket.status === 'Assigned' && (
                    <button
                      onClick={() => handleStartWork(activeTicket._id)}
                      disabled={processing}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Work</span>
                    </button>
                  )}
                  <span className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    SPs: {activeTicket.storyPoints}
                  </span>
                </div>
              </div>

              {/* Completion/Validation Certificate for Completed Tasks */}
              {['Resolved', 'Closed'].includes(activeTicket.status) && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Award className="w-5 h-5 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Completion Validation Certificate</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-medium">Resolution Time</span>
                      <p className="font-bold text-slate-200">{activeTicket.resolutionTime || 'N/A'} hours</p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-medium">SLA Status</span>
                      <p className={`font-bold ${activeTicket.slaStatus === 'Met' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {activeTicket.slaStatus || 'Active'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-medium">Validator Agent Confidence</span>
                      <p className="font-bold text-slate-200">
                        {activeTicket.validationResult?.confidence || 95}% confidence
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-medium">Verified Cost</span>
                      <p className="font-bold text-slate-200">{activeTicket.estimatedRepairCost || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-300 bg-emerald-500/10 rounded-xl p-2.5 leading-relaxed">
                    <strong>AI Agent 5 Remarks:</strong> {activeTicket.validationResult?.remainingDamage || 'Clean restoration validated successfully.'}
                  </div>
                </div>
              )}

              {/* Photos Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Before (Reported Incident)</span>
                  <img
                    src={getFullImageUrl(activeTicket.imageUrl)}
                    alt="Before repair"
                    className="w-full h-40 object-cover rounded-xl border border-slate-900 bg-slate-950"
                  />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">After (Completion Verification)</span>
                  {activeTicket.afterImageUrl ? (
                    <img
                      src={getFullImageUrl(activeTicket.afterImageUrl)}
                      alt="Completed repair"
                      className="w-full h-40 object-cover rounded-xl border border-slate-900 bg-slate-950"
                    />
                  ) : (
                    <div className="w-full h-40 rounded-xl border-2 border-dashed border-slate-900 bg-slate-950/20 flex flex-col items-center justify-center text-center p-4">
                      <AlertTriangle className="w-5 h-5 text-slate-600 mb-1" />
                      <span className="text-[10px] text-slate-500 font-medium">Verification photo pending. Upload completion photo when finished.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Agile Checklist Panel */}
              {activeTicket.resolutionPlan && activeTicket.resolutionPlan.recommendedActions && activeTicket.resolutionPlan.recommendedActions.length > 0 && (
                <div className="border-t border-slate-900 pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-350 flex items-center space-x-1.5">
                    <ListTodo className="w-4 h-4 text-brand-400" />
                    <span>AI Dispatch Action Checklist</span>
                  </h4>
                  <div className="space-y-2">
                    {activeTicket.resolutionPlan.recommendedActions.map((action, idx) => {
                      const checkboxKey = `${activeTicket._id}-${idx}`;
                      const isChecked = !!checklistState[checkboxKey];
                      return (
                        <label
                          key={idx}
                          className="flex items-start gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-900/60 hover:border-slate-800 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setChecklistState(prev => ({
                                ...prev,
                                [checkboxKey]: e.target.checked
                              }));
                            }}
                            className="mt-0.5 rounded border-slate-800 bg-slate-900 text-brand-500 focus:ring-brand-500"
                          />
                          <span className={`text-[11px] leading-tight transition-all ${
                            isChecked ? 'text-slate-500 line-through' : 'text-slate-300'
                          }`}>
                            {action}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Workflow Timeline Stepper */}
              {activeTicket.statusHistory && activeTicket.statusHistory.length > 0 && (
                <div className="border-t border-slate-900 pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-350 flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-brand-400" />
                    <span>Workflow Timeline Stepper</span>
                  </h4>
                  <div className="relative pl-4 border-l border-slate-850 space-y-3">
                    {activeTicket.statusHistory.map((history, idx) => (
                      <div key={idx} className="relative text-[11px]">
                        {/* Bullet */}
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-slate-950 bg-brand-400" />
                        <div className="flex items-center justify-between font-bold text-slate-300">
                          <span>{history.status}</span>
                          <span className="text-[9px] text-slate-550 font-normal">
                            {new Date(history.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-450 mt-0.5">{history.note}</p>
                        <span className="text-[9px] text-slate-550 block mt-0.5">By {history.updatedBy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rework/Validation logs */}
              {activeTicket.validationResult && activeTicket.validationResult.isSuccessful === false && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>AI INSPECTION FAULT REJECTED</span>
                  </div>
                  <p className="text-slate-350">{activeTicket.validationResult.remainingDamage}</p>
                  <p className="font-semibold mt-1">Rework instructions: <span className="text-red-300">{activeTicket.validationResult.suggestedRework}</span></p>
                </div>
              )}

              {/* Materials Request Panel */}
              <div className="border-t border-slate-900 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-350 flex items-center space-x-1.5">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Materials & Supply requests</span>
                </h4>
                
                {activeTicket.materialsRequested && activeTicket.materialsRequested.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeTicket.materialsRequested.map((mat, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-850">
                        {mat}
                      </span>
                    ))}
                  </div>
                )}

                {activeTicket.status === 'In Progress' && (
                  <form onSubmit={handleRequestMaterials} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 2 replacement LED bulbs, barricade tape (comma separated)"
                      value={materialText}
                      onChange={(e) => setMaterialText(e.target.value)}
                      disabled={processing}
                      className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={processing || !materialText.trim()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-xs text-slate-300 font-bold border border-slate-800"
                    >
                      Request
                    </button>
                  </form>
                )}
              </div>

              {/* Comments Roster */}
              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-350 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Ops Comms Chat Log</span>
                </h4>

                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {activeTicket.comments && activeTicket.comments.length > 0 ? (
                    activeTicket.comments.map((c, i) => (
                      <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-xs">
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                          <span className={c.author.includes('AI') ? 'text-brand-400' : 'text-slate-350'}>{c.author}</span>
                          <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-600 italic">No notes logged for this work ticket.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type dispatch comment or update..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={processing}
                    className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={processing || !commentText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-xs text-slate-300 font-bold border border-slate-800"
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* Complete Repair Photo Upload (Inspection trigger) */}
              {activeTicket.status === 'In Progress' && (
                <div className="border-t border-slate-900 pt-5 space-y-4">
                  <span className="block text-xs font-bold text-slate-350">Resolve Ticket: Verification Photo Upload</span>
                  <form onSubmit={handleCompleteWork} className="space-y-4">
                    <div
                      onClick={() => document.getElementById('worker-upload-file').click()}
                      className="border border-dashed border-slate-800 hover:border-brand-500 bg-slate-950/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-32 text-center"
                    >
                      <input
                        type="file"
                        id="worker-upload-file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={processing}
                      />
                      
                      {uploadPreview ? (
                        <img
                          src={uploadPreview}
                          alt="Progress upload preview"
                          className="max-h-24 object-contain rounded"
                        />
                      ) : (
                        <div className="space-y-1">
                          <Wrench className="w-6 h-6 text-slate-500 mx-auto" />
                          <p className="text-[11px] font-semibold text-slate-350">Tap/Click to select or snap repair verification photo</p>
                          <p className="text-[9px] text-slate-600">Verifies closure via Agent 5 Visual Validator</p>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={processing || !uploadFile}
                      className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit for AI Repair Inspection</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-900 bg-slate-950/20 rounded-3xl py-32">
              <Wrench className="w-10 h-10 text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-400">No Ticket Selected</h3>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1">Select an active ticket from your sprint queue queue on the left to start work, request supplies, or verify repairs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkerDashboard;
