import { LegalLayout } from '~/components/legal/LegalLayout';
import Link from 'next/link';

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion Instructions" lastUpdated="May 7, 2026">
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">1. Right to Erasure</h2>
        <p>
          In accordance with the General Data Protection Regulation (GDPR) and the Personal Data Protection Act (PDPA), StashFlow provides all users with the right to request the deletion of their personal and financial data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">2. Self-Service Deletion</h2>
        <p>
          The fastest way to delete your data is through your account settings:
        </p>
        <ol className="list-decimal pl-6 space-y-4">
          <li>Log into your StashFlow account.</li>
          <li>Navigate to the <strong>Settings</strong> page via the sidebar.</li>
          <li>Scroll down to the <strong>Danger Zone</strong> section.</li>
          <li>Click the <strong>Delete Account</strong> button.</li>
          <li>Confirm your choice. Your account and all associated data will be queued for immediate permanent removal.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">3. What is Deleted?</h2>
        <p>
          When you delete your account, the following information is permanently erased from our production databases:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your profile and email address.</li>
          <li>All financial records (incomes, expenses, assets, loans).</li>
          <li>All uploaded documents and their extracted metadata.</li>
          <li>All session history and security events.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">4. Manual Requests</h2>
        <p>
          If you are unable to access your account or wish to make a manual deletion request, please email <strong>privacy@stashflow.com</strong> from the email address associated with your account. We will process your request within 30 days.
        </p>
      </section>

      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col items-center text-center">
        <h3 className="font-bold text-gray-900 mb-2">Ready to manage your data?</h3>
        <Link 
          href="/dashboard/settings" 
          className="px-6 h-12 bg-[#0A2540] text-white text-sm font-bold rounded-xl flex items-center justify-center hover:bg-[#0A2540]/90 transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    </LegalLayout>
  );
}
