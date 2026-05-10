import { LegalLayout } from '~/components/legal/LegalLayout';

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="May 7, 2026">
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">1. What are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">2. How We Use Cookies</h2>
        <p>
          StashFlow uses cookies for the following purposes:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Authentication:</strong> We use essential cookies to identify you when you are logged in. These are "HttpOnly" cookies used by Supabase Auth for session management.</li>
          <li><strong>Security:</strong> Cookies help us detect and prevent security risks, such as CSRF attacks.</li>
          <li><strong>Preferences:</strong> We use cookies to remember your settings, such as your preferred currency or theme.</li>
          <li><strong>Analytics:</strong> We use anonymized analytics (via Vercel) to understand how users interact with our platform and improve performance.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">3. Types of Cookies</h2>
        <div className="grid gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-1">Strictly Necessary</h3>
            <p className="text-sm text-gray-500">Required for the website to function. They cannot be switched off.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-1">Functional</h3>
            <p className="text-sm text-gray-500">Allow the platform to remember choices you make (like currency).</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-1">Performance/Analytics</h3>
            <p className="text-sm text-gray-500">Collect information about how visitors use the site.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">4. Managing Cookies</h2>
        <p>
          Most web browsers allow you to control cookies through their settings. You can delete all cookies already on your device and set most browsers to prevent them from being placed. However, if you do this, you will not be able to log into StashFlow.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">5. More Information</h2>
        <p>
          For more information about our use of cookies, please contact us at <strong>privacy@stashflow.com</strong>.
        </p>
      </section>
    </LegalLayout>
  );
}
