/**
 * @module PasswordPrompt
 * Handles the secure collection of passwords for encrypted documents.
 * It re-triggers the document parsing pipeline with the provided credentials.
 */

import { useState } from 'react';
import { createClient } from '~/lib/supabase/client';

/** Properties for the PasswordPrompt component. */
interface PasswordPromptProps {
  /** The unique ID of the document requiring decryption. */
  docId: string;
  /** Callback to notify the parent when re-processing has been successfully triggered. */
  onRetry: () => void;
}

/**
 * UI for inline decryption of protected PDF documents.
 * 
 * @param {PasswordPromptProps} props - Component props.
 * @returns {JSX.Element} The rendered password input form.
 */
export function PasswordPrompt({ docId, onRetry }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submits the password to the backend to restart the extraction process.
   * 
   * @param {React.FormEvent} e - Form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    /*
     * PSEUDOCODE:
     * 1. Initialize loading state and clear previous errors.
     * 2. Call the parse-document edge function via Supabase.
     * 3. Pass the password in a custom 'x-document-password' header.
     *    Note: This keeps the password out of database logs and function bodies.
     * 4. On success, call onRetry() to flip the UI back to a loading/processing state.
     * 5. On failure, catch and display the error message.
     */
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
       const supabase = createClient();
       // We invoke the function manually here to pass the session-only password.
       const { error: invokeError } = await supabase.functions.invoke('parse-document', {
         body: { id: docId },
         headers: { 'x-document-password': password }
       });
       if (invokeError) throw invokeError;
       onRetry();
    } catch (err: any) {
       setError(err.message || 'Failed to trigger re-processing');
       setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 max-w-md mx-auto">
       <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">🔓</div>
       <h2 className="text-lg font-bold text-gray-900 mb-2">Password Required</h2>
       <p className="text-sm text-gray-500 mb-6">This document is protected. Enter the password to continue securely.</p>
       
       <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password"
            placeholder="Document Password"
            required
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="pt-2">
             <button
               type="submit"
               disabled={submitting}
               className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all disabled:opacity-50"
             >
               {submitting ? 'Decrypting...' : 'Continue Processing'}
             </button>
          </div>
          {/* Security reassurance for the user regarding password handling */}
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
            Used only for this session • Never stored
          </p>
       </form>
    </div>
  );
}
