import React from 'react';
import { Sparkles, CheckCircle2, PlayCircle, Clock, Construction, ArrowRight, Users, AlertCircle } from 'lucide-react';

export function ResolutionPlanner({ plan = {}, status }) {
  const {
    recommendedDepartment = 'Road Maintenance',
    recommendedActions = [],
    estimatedResolutionTime = '3-5 business days',
    crewRequirement = 'Standard Utility Dispatch Crew',
    priorityRanking = 'Medium',
  } = plan;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-brand-500/20 relative overflow-hidden shadow-2xl">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
      
      {/* Header section with AI Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/30">
            <Sparkles className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">AI Resolution Plan</h3>
            <p className="text-slate-400 text-xs mt-0.5">Gemini Municipal Operations Triage</p>
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30">
          <span>Trained Agent Plan</span>
        </div>
      </div>

      {/* Basic Metrics Fields (Grid layout) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-2.5">
          <Construction className="w-4.5 h-4.5 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Assigned Dept</p>
            <p className="text-slate-200 text-xs font-semibold mt-0.5">{recommendedDepartment}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-2.5">
          <Clock className="w-4.5 h-4.5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Target Resolution</p>
            <p className="text-slate-200 text-xs font-semibold mt-0.5">{estimatedResolutionTime}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-2.5">
          <Users className="w-4.5 h-4.5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Crew Required</p>
            <p className="text-slate-200 text-xs font-semibold mt-0.5 line-clamp-2">{crewRequirement}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start space-x-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Priority Ranking</p>
            <p className="text-slate-200 text-xs font-semibold mt-0.5">{priorityRanking}</p>
          </div>
        </div>
      </div>

      {/* Checklist Actions */}
      <div>
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center space-x-1.5">
          <span>Action Steps Checklist</span>
        </h4>

        {recommendedActions && recommendedActions.length > 0 ? (
          <div className="space-y-3.5">
            {recommendedActions.map((action, index) => {
              // Custom numbering and color-coded status based on overall status
              const stepNumber = index + 1;
              const isResolved = status === 'Resolved';
              const isInProgress = status === 'In Progress' && index === 0;

              return (
                <div
                  key={index}
                  className={`flex items-start space-x-3.5 p-3 rounded-xl border transition-all duration-300 ${
                    isResolved
                      ? 'bg-emerald-500/5 border-emerald-500/10 opacity-75'
                      : isInProgress
                      ? 'bg-brand-500/5 border-brand-500/20 shadow'
                      : 'bg-slate-950/40 border-slate-900'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isResolved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isInProgress ? (
                      <PlayCircle className="w-5 h-5 text-brand-400 animate-pulse" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {stepNumber}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isResolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            No specific resolution steps generated.
          </div>
        )}
      </div>
    </div>
  );
}

export default ResolutionPlanner;
