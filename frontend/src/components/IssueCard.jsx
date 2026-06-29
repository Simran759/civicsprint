import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, UserCheck, Clock, MapPin } from 'lucide-react';
import { getAddressFromCoords } from '../services/geocode';

export function IssueCard({ issue }) {
  const [resolvedAddress, setResolvedAddress] = useState('Resolving address...');

  useEffect(() => {
    let isMounted = true;
    const lookupAddress = async () => {
      if (issue.location && issue.location.coordinates) {
        const [lng, lat] = issue.location.coordinates;
        const addr = await getAddressFromCoords(lat, lng);
        if (isMounted) setAddressText(addr);
      }
    };
    
    const setAddressText = (addr) => {
      // Shorten the address if it is too long for the card feed layout
      if (addr && addr.length > 55) {
        setResolvedAddress(addr.slice(0, 52) + '...');
      } else {
        setResolvedAddress(addr);
      }
    };

    lookupAddress();
    return () => {
      isMounted = false;
    };
  }, [issue.location]);
  const {
    _id,
    category,
    severity,
    urgency,
    summary,
    department,
    status,
    verificationCount,
    imageUrl,
    createdAt,
    assignedWorker,
    storyPoints,
    dueDate,
  } = issue;

  // Resolve absolute backend URL for image
  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const host = apiURL.replace('/api', '');
    return `${host}${path}`;
  };

  // Status Badges
  const getStatusBadge = (s) => {
    const classes = {
      'Open': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Resolved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return classes[s] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  // Urgency Badges
  const getUrgencyBadge = (u) => {
    const classes = {
      'Critical': 'bg-red-500/15 text-red-400 border-red-500/30 font-bold uppercase',
      'High': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Medium': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Low': 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return classes[u] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-slate-900 hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
      {/* Issue image header */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950">
        <img
          src={getFullImageUrl(imageUrl)}
          alt={summary}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1599740831664-d710355410e3?w=500&auto=format&fit=crop&q=60';
          }}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-sm text-slate-200 border border-slate-800">
            {category}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border backdrop-blur-sm ${getUrgencyBadge(urgency)}`}>
            {urgency}
          </span>
        </div>
        
        {/* Severity overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm text-white px-2 py-1 rounded border border-slate-800 flex items-center space-x-1">
          <span className="text-[10px] text-slate-400 font-semibold">Severity</span>
          <span className={`text-xs font-bold ${severity >= 7 ? 'text-red-400' : severity >= 4 ? 'text-amber-400' : 'text-green-400'}`}>
            {severity}/10
          </span>
        </div>

        {/* Community Impact Score overlay */}
        <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-sm text-white px-2.5 py-1 rounded border border-slate-800 flex items-center space-x-1">
          <span className="text-[10px] text-slate-400 font-semibold">Impact</span>
          <span className={`text-xs font-extrabold ${
            (severity * 6 + verificationCount * 4) >= 70
              ? 'text-red-400 animate-pulse'
              : (severity * 6 + verificationCount * 4) >= 40
              ? 'text-amber-400'
              : 'text-green-400'
          }`}>
            {Math.min(100, severity * 6 + verificationCount * 4)}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </span>
          <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded border ${getStatusBadge(status)}`}>
            {status}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-1 hover:text-brand-400 transition-colors">
          <Link to={`/issues/${_id}`}>{summary}</Link>
        </h3>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate font-medium text-slate-350">{resolvedAddress}</span>
        </div>
        
        <div className="text-[11px] text-slate-500 mb-4 pl-5">
          Department: <strong className="text-slate-400">{department}</strong>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-2">
            <p className="text-[8px] uppercase tracking-wider text-slate-500">Worker</p>
            <p className="mt-1 font-semibold text-slate-300">{assignedWorker || 'Unassigned'}</p>
          </div>
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-2">
            <p className="text-[8px] uppercase tracking-wider text-slate-500">Story Points</p>
            <p className="mt-1 font-semibold text-slate-300">{storyPoints || 3} SP</p>
          </div>
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-2 col-span-2">
            <p className="text-[8px] uppercase tracking-wider text-slate-500">Due</p>
            <p className="mt-1 font-semibold text-slate-300">{dueDate ? new Date(dueDate).toLocaleDateString() : 'TBD'}</p>
          </div>
        </div>

        {/* Verification count badge if multiple citizens reported it */}
        {verificationCount > 1 && (
          <div className="mt-auto mb-4 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Verified by {verificationCount} community heroes</span>
          </div>
        )}

        {/* Footer Link */}
        <div className={`${verificationCount <= 1 ? 'mt-auto' : ''} pt-3 border-t border-slate-900 flex justify-between items-center`}>
          <span className="text-[11px] text-slate-500 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Active Triage</span>
          </span>
          <Link
            to={`/issues/${_id}`}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center space-x-0.5 hover:underline"
          >
            <span>Resolution Plan</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default IssueCard;
