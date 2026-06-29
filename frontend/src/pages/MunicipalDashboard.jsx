import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import StatsSummary from '../components/StatsSummary';
import MapComponent from '../components/MapComponent';
import IssueCard from '../components/IssueCard';
import { Search, RotateCw, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle, Sparkles, LayoutGrid, MapPin, ChevronRightCircle, ChevronLeftCircle, User, Activity, Lightbulb, CheckSquare, Brain, FileText, AlertTriangle, TrendingUp, Users, Zap, Clock, Shield, ChevronDown, ChevronUp, Server, Check } from 'lucide-react';

export function MunicipalDashboard() {
  const navigate = useNavigate();

  // Stats and list states
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [aiDataSource, setAiDataSource] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [issues, setIssues] = useState([]);
  const [allSprintIssues, setAllSprintIssues] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);
  
  // View states
  const [dashboardView, setDashboardView] = useState('kanban'); // 'kanban' or 'map'
  const [sprintSummary, setSprintSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // AI Insights sidebar states
  const [showInsightsSidebar, setShowInsightsSidebar] = useState(true);
  const [insightsTab, setInsightsTab] = useState('copilot'); // 'copilot', 'activity', 'decisions'

  // Loading and error states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter parameters for Map/List view
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState(12);

  // Current logged in user RBAC state
  const [currentUser, setCurrentUser] = useState(() => {
    const session = sessionStorage.getItem('civicmind_user');
    return session ? JSON.parse(session) : { role: 'citizen' };
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const departments = [
    'Road Maintenance',
    'Sanitation',
    'Water & Power',
    'Code Enforcement',
    'Parks & Recreation',
  ];

  const workflowStatuses = ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection', 'Resolved', 'Closed'];

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    try {
      const response = await apiService.getDashboardAiInsights();
      if (response.success) {
        setAiInsights(response.data.aiInsights || []);
        setRiskZones(response.data.riskZones || []);
        setAiDataSource(response.data.dataSource || response.data.aiMode);
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleRecalculatePriorities = async () => {
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const response = await apiService.recalculatePriorities();
      if (response.success) {
        setRecalcResult(response.data);
        fetchAllIssues();
        fetchStats();
      }
    } catch (err) {
      console.error('Priority recalculation failed:', err);
      alert('Could not recalculate priorities.');
    } finally {
      setRecalculating(false);
    }
  };
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await apiService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchHealthAndFeed = async () => {
    try {
      const [healthRes, feedRes] = await Promise.all([
        apiService.getSystemHealth(),
        apiService.getLiveFeed()
      ]);
      if (healthRes.success) setSystemHealth(healthRes.data);
      if (feedRes.success) setLiveFeed(feedRes.data);
    } catch (e) {
      console.error('Failed to fetch health and feed:', e);
    }
  };

  // Fetch all issues for Kanban Board (non-paginated)
  const fetchAllIssues = async () => {
    try {
      const response = await apiService.getIssues({ limit: 200 });
      if (response.success) {
        setAllSprintIssues(response.issues);
      }
    } catch (err) {
      console.error('Failed to fetch all sprint issues:', err);
    }
  };

  // Fetch paginated issues list for Map view
  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 6,
        search: search.trim() || undefined,
        status: status || undefined,
        department: department || undefined,
      };

      const response = await apiService.getIssues(params);
      if (response.success) {
        setIssues(response.issues);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalIssues);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError('Could not connect to the database. Ensure the backend server is running.');
    } finally {
      setLoadingIssues(false);
    }
  }, [page, search, status, department]);

  // Daily AI Report Generator
  const generateSprintReport = async () => {
    setLoadingSummary(true);
    setSprintSummary(null);
    try {
      const response = await apiService.getSprintSummary();
      if (response.success) {
        setSprintSummary(response.data);
      }
    } catch (err) {
      console.error('Failed to compile sprint summary:', err);
      alert('Could not compile Daily AI Sprint summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Advance or Revert ticket status in Kanban Column
  const handleAdvanceStatus = async (ticketId, currentStatus, direction) => {
    const idx = workflowStatuses.indexOf(currentStatus);
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= workflowStatuses.length) return;
    const targetStatus = workflowStatuses[nextIdx];

    if (targetStatus === 'Inspection') {
      alert('Inspection requires an after-photo. Open the ticket detail page or use the worker portal to upload a completion photo.');
      navigate(`/issues/${ticketId}`);
      return;
    }
    
    try {
      const response = await apiService.updateIssueStatus(ticketId, targetStatus, `Advanced manually via Agile Board.`);
      if (response.success) {
        handleRefresh();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket status');
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchAllIssues();
    fetchAiInsights();
    fetchHealthAndFeed();
  }, []);

  // Sync list queries
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await apiService.getAuditLogs();
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (dashboardView === 'audit') {
      fetchAuditLogs();
    }
  }, [dashboardView]);

  // Refresh helper
  const handleRefresh = () => {
    fetchStats();
    fetchIssues();
    fetchAllIssues();
    fetchAiInsights();
    fetchHealthAndFeed();
    if (dashboardView === 'audit') {
      fetchAuditLogs();
    }
  };

  // Reset pagination when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Critical Alert Banner */}
      {stats && (stats.criticalIssues > 0 || stats.breachedSlaCount > 0) && (
        <div className="flex items-center gap-3 rounded-[24px] border border-red-500/20 bg-gradient-to-r from-red-500/10 to-amber-500/10 p-3 shadow-[0_8px_25px_rgba(248,113,113,0.08)] animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
          <div className="flex-1 text-xs">
            {stats.criticalIssues > 0 && (
              <span className="text-red-400 font-bold mr-4">⚠ {stats.criticalIssues} Critical Incident{stats.criticalIssues > 1 ? 's' : ''}</span>
            )}
            {stats.breachedSlaCount > 0 && (
              <span className="text-amber-400 font-bold mr-4">🕐 {stats.breachedSlaCount} SLA Breach{stats.breachedSlaCount > 1 ? 'es' : ''}</span>
            )}
            {stats.pendingReviewCount > 0 && (
              <span className="text-purple-400 font-bold mr-4">🔍 {stats.pendingReviewCount} Pending Review</span>
            )}
            {stats?.delayedCount > 0 && (
              <span className="text-orange-400 font-bold">📋 {stats.delayedCount} Overdue Ticket{stats.delayedCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <span className="text-[9px] text-red-500/60 font-mono uppercase tracking-wider">Live Alerts</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 rounded-[32px] border border-slate-800 glass-panel bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
            Municipal Operations Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time Sprint Ticket dispatching, AI insights, and visual repair audits.
          </p>
        </div>

        <div className="flex shrink-0 items-center space-x-3">
          {/* Switch Views */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-slate-400">
            <button
              onClick={() => setDashboardView('kanban')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dashboardView === 'kanban'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Sprint Board</span>
            </button>
            <button
              onClick={() => setDashboardView('map')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dashboardView === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Spatial Map</span>
            </button>
            {['admin'].includes(currentUser?.role) && (
              <button
                onClick={() => setDashboardView('audit')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dashboardView === 'audit'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            )}
          </div>

          {/* AI Sidebar Toggle */}
          <button
            onClick={() => setShowInsightsSidebar(!showInsightsSidebar)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              showInsightsSidebar
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                : 'glass-panel border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI</span>
          </button>

          {/* Executive Briefing Link */}
          <Link
            to="/executive-briefing"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-xs font-bold text-slate-300 transition-all active:scale-95 shadow"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics widgets */}
      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel h-28 rounded-2xl animate-pulse border border-slate-900"></div>
          ))}
        </div>
      ) : (
        <>
          <StatsSummary stats={stats} />

          {/* System Health Panel */}
          {['supervisor', 'manager', 'admin'].includes(currentUser?.role) && systemHealth && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="glass-panel rounded-2xl p-4 border border-slate-900 bg-slate-900/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Database</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${systemHealth.mongoDB?.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className={`text-sm font-bold ${systemHealth.mongoDB?.status === 'Connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {systemHealth.mongoDB?.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Source of truth for operations</p>
              </div>

              <div className="glass-panel rounded-2xl p-4 border border-slate-900 bg-slate-900/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Gemini Cloud</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${systemHealth.gemini?.status === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className={`text-sm font-bold ${systemHealth.gemini?.status === 'Available' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {systemHealth.gemini?.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Primary Vision/LLM Agent</p>
              </div>

              <div className="glass-panel rounded-2xl p-4 border border-slate-900 bg-slate-900/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ollama Local</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${systemHealth.ollama?.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className={`text-sm font-bold ${systemHealth.ollama?.status === 'Online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {systemHealth.ollama?.status || 'Unknown'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Fallback LLM for reliability</p>
              </div>
              
              <div className="glass-panel rounded-2xl p-4 border border-slate-900 bg-slate-900/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">AI Cache DB</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-purple-400">{systemHealth.aiCache?.entries || 0} Entries</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Saves redundant API calls</p>
              </div>
            </div>
          )}

          {/* Sprint Health + Capacity Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {/* Sprint Velocity */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Sprint Velocity</span>
              </div>
              <p className="text-lg font-extrabold text-emerald-400">
                {stats?.completedStoryPoints || 0}<span className="text-xs text-slate-500 font-medium">/{stats?.totalStoryPoints || 0} SPs</span>
              </p>
              <div className="mt-2 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${stats?.totalStoryPoints ? Math.min((stats.completedStoryPoints / stats.totalStoryPoints) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Priority Updated Badge */}
            {/* Pending Review / Priority Recalc */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Review Queue</span>
              </div>
              <p className="text-lg font-extrabold text-amber-400">
                {stats?.pendingReviewCount || 0}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">Fraud-flagged tickets</p>
              <button
                onClick={handleRecalculatePriorities}
                disabled={recalculating}
                className="mt-2 w-full text-[9px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
              >
                {recalculating ? 'Recalculating…' : 'Recalc Priorities'}
              </button>
              {recalcResult && (
                <p className="text-[8px] text-emerald-400 mt-1">{recalcResult.priorityUpdated} updated</p>
              )}
            </div>

            {/* Worker Capacity Mini */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Active Workers</span>
              </div>
              <p className="text-lg font-extrabold text-blue-400">
                {stats?.workerCapacity?.filter(w => w.worker !== 'Unassigned').length || 0}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {stats?.workerCapacity?.reduce((s, w) => s + w.activeTickets, 0) || 0} assigned tickets
              </p>
            </div>

            {/* Department Load */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Departments</span>
              </div>
              <p className="text-lg font-extrabold text-purple-400">
                {stats?.departmentCapacity?.length || 0}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Heaviest: {stats?.departmentCapacity?.sort((a, b) => b.active - a.active)?.[0]?.department || 'N/A'}
              </p>
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-800 glass-panel bg-slate-900/60 p-5 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-4.5 h-4.5 text-violet-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Department Load</h3>
              </div>
              <div className="mt-4 space-y-3">
                {(stats?.byDepartment || []).slice(0, 5).map((department) => (
                  <div key={department.department}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{department.department}</span>
                      <span className="font-semibold text-slate-200">{department.activeCount || 0} active</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.min(((department.activeCount || 0) / Math.max(stats?.totalIssues || 1, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800 glass-panel bg-slate-900/60 p-5 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Zap className="w-4.5 h-4.5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Workflow Distribution</h3>
              </div>
              <div className="mt-4 space-y-3">
                {Object.entries(stats?.byStatus || {}).slice(0, 6).map(([status, count]) => (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{status}</span>
                      <span className="font-semibold text-slate-200">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min((count / Math.max(stats?.totalIssues || 1, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily AI Brief Generator Trigger Card */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-900 bg-slate-950/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-bold border border-brand-500/20 uppercase tracking-wide">
                Agent 6 Summary Generator
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Generate Daily AI Sprint Report</h3>
              <p className="text-slate-450 text-[11px] leading-relaxed max-w-xl">
                Compiles active municipal tickets, calculates team velocity progress, and provides generative crew optimization recommendations.
              </p>
            </div>
            
            <button
              onClick={generateSprintReport}
              disabled={loadingSummary}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-500 hover:from-emerald-600 hover:to-brand-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all shrink-0 flex items-center space-x-1.5"
            >
              {loadingSummary ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-200" />
              )}
              <span>Compile Executive Sprint Briefing</span>
            </button>
          </div>

          {/* Daily Sprint summary block */}
          {sprintSummary && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-900 shadow-2xl space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Activity className="w-4.5 h-4.5 text-brand-400" />
                  <span>Executive Sprint Performance Briefing ({sprintSummary.currentSprint || stats?.currentSprint || 'Current Sprint'})</span>
                </span>
                <button
                  onClick={() => setSprintSummary(null)}
                  className="text-xs text-slate-500 hover:text-slate-350"
                >
                  Close Report
                </button>
              </div>

              {/* Team Performance grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sprintSummary.teams && sprintSummary.teams.map((t, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-xs">
                    <span className="block font-bold text-slate-200 border-b border-slate-900 pb-1.5 mb-2">{t.name}</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-450 font-semibold">
                      <span className="text-emerald-400">Completed: {t.completed}</span>
                      <span className="text-blue-400">Pending: {t.pending}</span>
                      <span className="text-purple-400">Blocked: {t.blocked}</span>
                      <span className="text-red-400">Delayed: {t.delayed}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Recommendations */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wide flex items-center space-x-1.5">
                  <Lightbulb className="w-4.5 h-4.5 text-amber-400" />
                  <span>AI Crew Optimization Recommendations</span>
                </span>
                <ul className="space-y-1.5">
                  {sprintSummary.recommendations && sprintSummary.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start space-x-2">
                      <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sprint Executive Summary text */}
              <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-4 prose prose-invert max-w-none">
                <span className="block text-slate-300 font-bold mb-2 uppercase tracking-wide">AI Narrative Briefing</span>
                <p className="whitespace-pre-line">{sprintSummary.sprintSummary}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Layout with optional AI Sidebar */}
      <div className="flex gap-6">
        {/* Primary Content Area */}
        <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${showInsightsSidebar ? '' : ''}`}>
          {/* Primary views */}
          {dashboardView === 'kanban' ? (
            /* Kanban Board View */
            <div className="space-y-4">
              <div className="glass-panel rounded-2xl p-4 border border-slate-900 flex items-center space-x-2">
                <CheckSquare className="w-4.5 h-4.5 text-brand-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jira Sprint Workflow Board</h2>
              </div>

              <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-900">
                {workflowStatuses.map((colStatus) => {
                  const colIssues = allSprintIssues.filter(i => i.status === colStatus);
                  
                  const topColors = 
                    colStatus === 'Backlog' ? 'border-t-2 border-t-slate-500' :
                    colStatus === 'Ready' ? 'border-t-2 border-t-blue-500' :
                    colStatus === 'Assigned' ? 'border-t-2 border-t-indigo-500' :
                    colStatus === 'In Progress' ? 'border-t-2 border-t-amber-500' :
                    colStatus === 'Inspection' ? 'border-t-2 border-t-purple-500' :
                    'border-t-2 border-t-emerald-500';

                  return (
                    <div
                      key={colStatus}
                      className={`w-72 shrink-0 bg-slate-950/40 rounded-2xl border border-slate-900/60 p-4 flex flex-col min-h-[480px] ${topColors}`}
                    >
                      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-900">
                        <span className="text-xs font-extrabold text-slate-200">{colStatus}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] text-slate-500 font-bold border border-slate-850">
                          {colIssues.length}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-0.5">
                        {colIssues.length > 0 ? (
                          colIssues.map((issue) => (
                            <div
                              key={issue._id}
                              className="bg-slate-900 border border-slate-850 hover:border-slate-700/60 hover:shadow-lg rounded-xl p-3.5 space-y-2 cursor-pointer transition-all active:scale-98 flex flex-col justify-between min-h-28"
                            >
                              <div onClick={() => navigate(`/issues/${issue._id}`)} className="space-y-2 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">
                                    {issue.ticketId || 'ROAD-TBD'}
                                  </span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                    issue.urgency === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    issue.urgency === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {issue.urgency}
                                  </span>
                                </div>

                                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{issue.title}</h4>
                                
                                {/* Priority Score Badge */}
                                {issue.priorityScore !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          issue.priorityScore >= 75 ? 'bg-red-500' :
                                          issue.priorityScore >= 55 ? 'bg-amber-500' :
                                          issue.priorityScore >= 35 ? 'bg-blue-500' : 'bg-slate-600'
                                        }`}
                                        style={{ width: `${issue.priorityScore}%` }}
                                      />
                                    </div>
                                    <span className="text-[8px] font-mono text-slate-500">{issue.priorityScore}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 pt-1.5 border-t border-slate-900/60">
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <User className="w-3 h-3 text-brand-400" />
                                    <span>{issue.assignedWorker || 'Unassigned'}</span>
                                  </span>
                                  <span className="text-slate-350">{issue.storyPoints} SPs</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-slate-900/40">
                                {colStatus !== 'Backlog' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdvanceStatus(issue._id, colStatus, 'prev');
                                    }}
                                    title="Revert Status"
                                    className="text-slate-500 hover:text-slate-350 transition-colors"
                                  >
                                    <ChevronLeftCircle className="w-5 h-5" />
                                  </button>
                                )}
                                {colStatus !== 'Closed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdvanceStatus(issue._id, colStatus, 'next');
                                    }}
                                    title="Advance Status"
                                    className="text-brand-500 hover:text-brand-400 transition-colors"
                                  >
                                    <ChevronRightCircle className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-[10px] text-slate-650 italic">
                            Empty Column
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : dashboardView === 'map' ? (
            /* Spatial Map & Feed View */
            <>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 flex flex-col space-y-6">
                  <div className="glass-panel rounded-2xl p-5 border border-slate-900 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                      <Filter className="w-4.5 h-4.5 text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Search & Filters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="relative rounded-xl shadow-sm sm:col-span-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search issues..."
                          value={search}
                          onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                          className="block w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl text-xs placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                        />
                      </div>
                      <select
                        value={status}
                        onChange={(e) => handleFilterChange(setStatus, e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      >
                        <option value="">All Statuses</option>
                        {workflowStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <select
                        value={department}
                        onChange={(e) => handleFilterChange(setDepartment, e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loadingIssues ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
                      <p className="text-slate-400 text-xs">Loading incident feed...</p>
                    </div>
                  ) : issues.length > 0 ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {issues.map((issue) => (
                          <IssueCard key={issue._id} issue={issue} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-900 pt-4">
                        <span className="text-xs text-slate-500">
                          Showing <strong className="text-slate-400">{issues.length}</strong> of{' '}
                          <strong className="text-slate-400">{totalCount}</strong> reports
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-semibold text-slate-400 px-3">
                            Page {page} of {totalPages}
                          </span>
                          <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-center py-20 border border-dashed border-slate-900 rounded-3xl bg-slate-950/40">
                      <p className="text-slate-400 text-sm font-semibold">No issues matched the filters.</p>
                      <p className="text-slate-600 text-xs mt-1">Try clearing filters or search queries.</p>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 flex flex-col space-y-6 sticky top-24">
                  <div className="h-[380px] lg:h-[420px]">
                    <MapComponent issues={issues} riskZones={riskZones} center={mapCenter} zoom={mapZoom} />
                  </div>

                  <div className="glass-panel rounded-2xl p-5 border border-slate-900 flex flex-col">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Predictive Civic Intelligence</span>
                    </div>

                    {riskZones && riskZones.length > 0 ? (
                      <div className="space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {riskZones.map((zone, idx) => (
                          <div key={idx} className="p-3 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 hover:border-purple-500/30 rounded-xl transition-all">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-xs font-extrabold text-slate-200">{zone.zoneName}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                zone.riskLevel === 'Critical' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                                zone.riskLevel === 'High' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                                'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                              }`}>
                                {zone.failureProbability}% Risk
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-450 leading-normal mb-2">
                              {zone.narrativeSummary}
                            </p>
                            <div className="text-[10px] text-purple-300 bg-purple-500/10 rounded-lg p-2 font-mono">
                              <strong>Preventative Action:</strong> {zone.recommendedPreventativeAction}
                            </div>
                            <div className="mt-2 text-[9px] text-slate-500 font-bold uppercase flex justify-between">
                              <span>Affected issues: {zone.affectedIssuesCount}</span>
                              <button
                                onClick={() => {
                                  const [lng, lat] = zone.coordinates;
                                  setMapCenter([lat, lng]);
                                  setMapZoom(15);
                                }}
                                className="text-purple-400 hover:text-purple-350 transition-colors uppercase font-bold"
                              >
                                Locate on Map &rarr;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                        <span className="text-[11px]">No high-risk geospatial issue clusters detected currently.</span>
                        <span className="text-[10px] text-slate-650">AI monitors and generates failure zone maps when multiple nearby issues overlap.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Audit Logs View */
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">Administrative Audit Trail Logs</h2>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingAudit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all active:scale-95"
                >
                  {loadingAudit ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>

              {loadingAudit ? (
                <div className="py-20 text-center text-slate-450 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs">Fetching system audit trail logs...</span>
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 pr-4">Timestamp</th>
                        <th className="pb-3 px-4">User</th>
                        <th className="pb-3 px-4">Role</th>
                        <th className="pb-3 px-4 font-semibold text-center">Action</th>
                        <th className="pb-3 px-4">Ticket</th>
                        <th className="pb-3 px-4">Old Value</th>
                        <th className="pb-3 pl-4">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{log.user}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-slate-100 text-slate-700 uppercase tracking-wide">
                              {log.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE_TICKET' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              log.action === 'AI_OVERRIDE' ? 'bg-purple-50 text-purple-700 border border-purple-100 animate-pulse' :
                              log.action === 'ESCALATE_TICKET' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{log.targetTicket}</td>
                          <td className="py-3.5 px-4 max-w-[120px] truncate text-slate-400 font-mono text-[10px]" title={log.oldValue}>{log.oldValue || '—'}</td>
                          <td className="py-3.5 pl-4 max-w-[120px] truncate text-slate-700 font-mono text-[10px]" title={log.newValue}>{log.newValue || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-slate-205 bg-slate-50/50 rounded-3xl">
                  <FileText className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-500">No Audit Logs Recorded</p>
                  <p className="text-[10px] text-slate-400 mt-1">Actions performed on the dashboard will appear here in real-time.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ AI INSIGHTS SIDEBAR ═══ */}
        {showInsightsSidebar && stats && (
          <div className="hidden lg:flex flex-col w-80 shrink-0 space-y-4 animate-fadeIn">
            {/* Sidebar Tab Navigation */}
            <div className="glass-panel rounded-2xl border border-slate-900 p-1 flex">
              {[
                { key: 'copilot', label: 'Copilot', icon: Brain },
                { key: 'activity', label: 'Activity', icon: Activity },
                { key: 'decisions', label: 'AI Log', icon: Zap },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setInsightsTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    insightsTab === key
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="glass-panel rounded-2xl border border-slate-900 p-4 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
              {insightsTab === 'copilot' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                    <Brain className="w-4 h-4 text-brand-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agent 8: Operations Copilot</span>
                    {aiDataSource && (
                      <span className="ml-auto text-[8px] font-mono uppercase text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{aiDataSource}</span>
                    )}
                  </div>
                  {loadingAi ? (
                    <div className="text-center py-8 text-slate-500 text-[10px]">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-400" />
                      Loading AI insights…
                    </div>
                  ) : aiInsights && aiInsights.length > 0 ? (
                    aiInsights.map((ins, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          ins.severity === 'critical'
                            ? 'bg-red-500/5 border-red-500/20'
                            : ins.severity === 'warning'
                            ? 'bg-amber-500/5 border-amber-500/20'
                            : 'bg-blue-500/5 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                            ins.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                            ins.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                          <p className="text-slate-300 font-medium leading-relaxed">{ins.insight}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed pl-3.5">{ins.explanation}</p>
                        <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          ins.severity === 'critical' ? 'text-red-400 bg-red-500/10' :
                          ins.severity === 'warning' ? 'text-amber-400 bg-amber-500/10' :
                          'text-blue-400 bg-blue-500/10'
                        }`}>
                          {ins.category}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-[10px]">
                      <Brain className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                      No insights yet.
                      <button
                        onClick={fetchAiInsights}
                        className="block mx-auto mt-3 text-brand-400 hover:text-brand-300 text-[10px] font-bold"
                      >
                        Load AI Insights
                      </button>
                    </div>
                  )}
                </div>
              )}

              {insightsTab === 'activity' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Operations Feed</span>
                  </div>
                  {liveFeed && liveFeed.length > 0 ? (
                    liveFeed.map((event, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900/60 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={() => navigate(`/issues/${event.ticketId}`)}
                            className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            {event.ticketId}
                          </button>
                          <span className="text-slate-600">{event.createdAt ? new Date(event.createdAt).toLocaleTimeString() : ''}</span>
                        </div>
                        <p className="text-slate-400">{event.description?.substring(0, 80)}{event.description?.length > 80 ? '...' : ''}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[8px] font-bold text-brand-400 uppercase tracking-wide">{event.eventType}</span>
                          <span className="text-[8px] text-slate-600">{event.actor}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-[10px]">No operations events yet.</div>
                  )}
                </div>
              )}

              {insightsTab === 'decisions' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent AI Decisions</span>
                  </div>
                  {stats.recentAiDecisions && stats.recentAiDecisions.length > 0 ? (
                    stats.recentAiDecisions.map((dec, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900/60 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={() => navigate(`/issues/${dec.ticketId}`)}
                            className="font-mono font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            {dec.ticketId}
                          </button>
                          <span className="text-brand-400 font-bold text-[8px]">{dec.agent?.split(':')[0]}</span>
                        </div>
                        <p className="text-slate-300 font-medium">{dec.action}</p>
                        <p className="text-[9px] text-slate-500 leading-relaxed">{dec.explanation?.substring(0, 120)}{dec.explanation?.length > 120 ? '...' : ''}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-[10px]">No AI decisions logged yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Worker Capacity Panel */}
            <div className="glass-panel rounded-2xl border border-slate-900 p-4">
              <div className="flex items-center gap-1.5 pb-2 mb-3 border-b border-slate-900">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worker Capacity</span>
              </div>
              <div className="space-y-2">
                {stats.workerCapacity && stats.workerCapacity
                  .filter(w => w.worker && w.worker !== 'Unassigned')
                  .slice(0, 6)
                  .map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium w-24 truncate">{w.worker}</span>
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            w.activeTickets >= 4 ? 'bg-red-500' :
                            w.activeTickets >= 2 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(w.activeTickets * 20, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 w-4 text-right">{w.activeTickets}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MunicipalDashboard;
