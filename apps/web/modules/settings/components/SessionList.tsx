'use client';

import { useState, useEffect } from 'react';
import { createClient } from '~/lib/supabase/client';
import { SessionCard } from './SessionCard';
import { Loader2, RefreshCcw } from 'lucide-react';

export function SessionList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function fetchSessions() {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get current session ID to highlight it
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentSessionId((session as any)?.id || null);

      const { data, error } = await supabase.functions.invoke('get-user-sessions');
      if (error) throw error;
      
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(sessionId: string) {
    try {
      setRevokingId(sessionId);
      const supabase = createClient();
      const { error } = await supabase.functions.invoke('revoke-session', {
        body: { sessionId }
      });

      if (error) throw error;
      
      // Refresh list after successful revocation
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevokingId(null);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest">Loading active sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Active Sessions</h2>
        <button 
          onClick={fetchSessions}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
          title="Refresh"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
          <p className="text-sm font-medium text-gray-400">No active sessions found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isCurrent={session.id === currentSessionId}
              onRevoke={handleRevoke}
              revoking={revokingId === session.id}
            />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 font-medium px-1 leading-relaxed">
        If you see a session you don't recognize, revoke it immediately and change your password.
        Sessions are automatically terminated after 60 days of inactivity.
      </p>
    </div>
  );
}
