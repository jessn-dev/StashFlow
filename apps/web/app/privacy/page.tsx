import { LegalLayout } from '~/components/legal/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 7, 2026">
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">1. Introduction</h2>
        <p>
          At StashFlow, we take your financial privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal and financial information when you use our platform. By using StashFlow, you agree to the terms of this policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">2. Information We Collect</h2>
        <p>
          We collect information that you provide directly to us, including:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Account Information:</strong> Email address, name, and authentication data provided via Google or Apple.</li>
          <li><strong>Financial Data:</strong> Income, expenses, assets, loans, and transaction history that you manually enter or import via CSV/PDF.</li>
          <li><strong>Document Metadata:</strong> Information extracted from uploaded financial documents using our AI processing pipeline.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">3. AI Data Processing</h2>
        <p>
          StashFlow uses advanced Artificial Intelligence (including Groq and Google Gemini) to parse financial documents.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Documents are processed securely in server-side edge functions.</li>
          <li>We do not use your financial data to train third-party AI models.</li>
          <li>Extracted data is stored in your private database and protected by Row-Level Security (RLS).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">4. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Encryption:</strong> All data is encrypted in transit (TLS) and at rest.</li>
          <li><strong>Row-Level Security (RLS):</strong> We use Supabase RLS to ensure that only you can access your financial records.</li>
          <li><strong>Ledger Integrity:</strong> Transactions are cryptographically signed to prevent unauthorized tampering.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">5. Your Rights (GDPR/PDPA)</h2>
        <p>
          Regardless of your location, we provide users with high standards of data control:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Access:</strong> You can view all data we hold about you via the Dashboard.</li>
          <li><strong>Portability:</strong> You can export your data at any time (feature coming soon).</li>
          <li><strong>Erasure:</strong> You can delete your account and all associated data permanently via the Settings page.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">6. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or wish to make a formal data request, please contact us at <strong>privacy@stashflow.com</strong>.
        </p>
      </section>
    </LegalLayout>
  );
}
