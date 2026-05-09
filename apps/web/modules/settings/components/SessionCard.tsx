'use client';

import { ShieldAlert, ShieldCheck, Monitor, Smartphone, Globe, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  createdAt: string;
  metadata: {
    ip: string;
    country: string | null;
    userAgent: string;
    timestamp: string;
  };
  anomaly: {
    score: number;
    reasons: string[];
    highRisk: boolean;
  };
}

interface SessionCardProps {
  session: Session;
  isCurrent: boolean;
  onRevoke: (id: string) => void;
  revoking: boolean;
}

export function SessionCard({ session, isCurrent, onRevoke, revoking }: SessionCardProps) {
  const isMobile = /mobile/i.test(session.metadata.userAgent);
  const Icon = isMobile ? Smartphone : Monitor;

  return (
    <div className={`p-6 bg-white rounded-2xl border ${session.anomaly.highRisk ? 'border-red-100 shadow-red-50' : 'border-gray-100'} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${session.anomaly.highRisk ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">
              {isMobile ? 'Mobile Device' : 'Desktop Browser'}
              {isCurrent && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] rounded-full uppercase tracking-widest font-black">Current</span>}
            </h3>
            {session.anomaly.highRisk ? (
              <ShieldAlert className="w-4 h-4 text-red-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-400">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {session.metadata.country || 'Unknown Location'} ({session.metadata.ip})
            </span>
            <span>Started {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
          </div>

          {session.anomaly.reasons.length > 0 && !isCurrent && (
            <div className="flex flex-wrap gap-1 mt-2">
              {session.anomaly.reasons.map(reason => (
                <span key={reason} className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[9px] rounded-md border border-gray-100 uppercase tracking-widest font-bold">
                  {reason.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isCurrent && (
        <button
          onClick={() => onRevoke(session.id)}
          disabled={revoking}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {revoking ? (
            'Revoking...'
          ) : (
            <>
              <LogOut className="w-3 h-3" />
              Revoke Access
            </>
          )}
        </button>
      )}
    </div>
  );
}
