import React from 'react';
import { ListTodo, ShieldAlert, CheckCircle2, Award } from 'lucide-react';

export function StatsSummary({ stats = {} }) {
  const {
    totalIssues = 0,
    criticalIssues = 0,
    resolvedIssues = 0,
    avgSeverity = 0,
  } = stats;

  const cards = [
    {
      title: 'Total Issues',
      value: totalIssues,
      icon: ListTodo,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      description: 'Active reported incidents',
    },
    {
      title: 'Critical Triage',
      value: criticalIssues,
      icon: ShieldAlert,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      description: 'Severity ≥ 7 or Critical Urgency',
    },
    {
      title: 'Resolved Items',
      value: resolvedIssues,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      description: 'Issues closed by public crews',
    },
    {
      title: 'Average Severity',
      value: `${avgSeverity}/10`,
      icon: Award,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      description: 'Weighted community index',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`rounded-[24px] border glass-panel bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${card.border}`}
          >
            <div className={`p-3 rounded-xl w-fit ${card.bg}`}>
              <Icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{card.value}</h3>
              <p className="text-slate-500 text-[11px] mt-1.5">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsSummary;
