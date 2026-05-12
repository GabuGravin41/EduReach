import React from 'react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200">
      <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">EduReach Privacy Policy</h1>
      <p className="mb-2 text-sm text-slate-500">Version 1.1 — Last Updated: May 12, 2026</p>
      <p className="mb-10 text-sm text-slate-500">
        Previous version: v1.0 (April 30, 2026) — Changes: Added lawful basis for processing, automated decision-making disclosure, cookie/tracking disclosure, expanded international transfers, data breach notification, Data Protection Officer contact, corrected contact details, clarified children's consent age, corrected passive consent language, expanded data retention specifics.
      </p>

      {/* Table of Contents */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-10 border border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-semibold mb-3 text-slate-700 dark:text-slate-300">Table of Contents</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-600 dark:text-blue-400">
          {[
            'Who We Are and Our Role',
            'Information We Collect',
            'Lawful Basis for Processing',
            'How We Use Your Information',
            'Automated Decision-Making and Profiling',
            'Sharing of Information',
            'International Transfers of Data',
            'Cookies and Tracking Technologies',
            'Data Storage and Security',
            'Data Retention',
            'Your Rights Under the Kenya Data Protection Act 2019',
            'Children\'s Privacy',
            'Third-Party Links and Embedded Content',
            'Data Breach Notification',
            'Changes to This Privacy Policy',
            'Contact Us and How to Exercise Your Rights',
          ].map((title, i) => (
            <li key={i}>
              <a href={`#pp-${i + 1}`} className="hover:underline">{title}</a>
            </li>
          ))}
        </ol>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-2">
        <p>
          EduReach ("we", "us", "our") is committed to protecting your personal data. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use our AI-powered
          learning platform (the "Service"). Please read it carefully.
        </p>
        <p>
          By creating an account or actively using the Service, you acknowledge that you have read and understood
          this Privacy Policy. Where we rely on consent as a lawful basis, we will ask for it explicitly and
          separately — passive use of the platform does not constitute consent for optional data processing
          activities.
        </p>

        {/* 1 */}
        <h2 id="pp-1" className="text-xl font-semibold mt-10 mb-4">1. Who We Are and Our Role</h2>
        <p className="mb-3">
          EduReach is the <strong>data controller</strong> for personal data collected through the Service. This
          means we determine the purposes and means of processing your personal data.
        </p>
        <p className="mb-3">
          <strong>Data Protection Contact:</strong> For all data protection matters, contact us at{' '}
          <strong>edu.reach.co@gmail.com</strong> (subject: "Data Protection").
        </p>
        <p className="mb-3">
          <strong>ODPC Registration:</strong> We are in the process of registering as a data controller with the
          Office of the Data Protection Commissioner (ODPC) of Kenya as required under the Kenya Data Protection
          Act 2019. We will update this section with our registration number upon confirmation.
        </p>
        <p>
          <strong>Address:</strong> Nairobi, Kenya
        </p>

        {/* 2 */}
        <h2 id="pp-2" className="text-xl font-semibold mt-10 mb-4">2. Information We Collect</h2>

        <h3 className="text-base font-semibold mt-6 mb-2">2.1 Account and Identity Information</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Name and email address (required to create an account).</li>
          <li>Phone number (required only for M-Pesa payment processing).</li>
          <li>Password (stored as a one-way hash; we never store your plain-text password).</li>
          <li>Profile information you choose to provide: grade level, institution, subjects of interest, learning goals.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">2.2 Payment Information</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Transaction records (amount, date, subscription tier) processed by M-Pesa and Paystack.</li>
          <li>We do not store full payment card numbers, CVV codes, or M-Pesa PINs. Payment credentials are handled directly by Safaricom and Paystack.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">2.3 Learning and Usage Data</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Videos you watch (YouTube video IDs accessed through the platform — not full watch history).</li>
          <li>Quiz attempts, scores, and feedback submitted.</li>
          <li>XP earned, levels, streaks, and gamification progress.</li>
          <li>Study group participation, messages posted, and assessment completions.</li>
          <li>AI tutor questions, essay submissions, and generated responses.</li>
          <li>Learning session configurations and topic selections.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">2.4 Technical and Device Data</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>IP address and approximate location (country/city level only).</li>
          <li>Device type, operating system, and browser or app version.</li>
          <li>Session timestamps and page/feature interaction logs.</li>
          <li>Cookies and similar tracking technologies (see Section 8).</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">2.5 Third-Party Content Data</h3>
        <p>
          We may temporarily process public YouTube video metadata (title, description) to generate AI-powered
          quizzes and learning aids. We do not store YouTube video files, private metadata, or data from your
          personal YouTube account unless you explicitly grant access.
        </p>

        {/* 3 */}
        <h2 id="pp-3" className="text-xl font-semibold mt-10 mb-4">3. Lawful Basis for Processing</h2>
        <p className="mb-3">
          Under the Kenya Data Protection Act 2019, we process your personal data on the following lawful bases:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Processing Activity</th>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Lawful Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {[
                ['Creating and managing your account', 'Performance of a contract'],
                ['Processing payments and managing subscriptions', 'Performance of a contract'],
                ['Providing core learning features (quizzes, AI tutor, study groups)', 'Performance of a contract'],
                ['Sending transactional emails (receipts, password resets)', 'Performance of a contract'],
                ['Security monitoring and fraud prevention', 'Legitimate interest'],
                ['Analysing platform usage to improve features', 'Legitimate interest'],
                ['Personalised learning recommendations', 'Legitimate interest'],
                ['Sending marketing emails and promotional offers', 'Consent (you may withdraw at any time)'],
                ['Using your inputs to improve AI model performance', 'Consent (you may withdraw at any time)'],
                ['Complying with Kenyan legal obligations', 'Legal obligation'],
                ['Responding to law enforcement requests', 'Legal obligation'],
              ].map(([activity, basis], i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{activity}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Where we rely on <strong>legitimate interest</strong>, you have the right to object to that processing
          (see Section 11). Where we rely on <strong>consent</strong>, you may withdraw it at any time without
          affecting the lawfulness of processing before withdrawal.
        </p>

        {/* 4 */}
        <h2 id="pp-4" className="text-xl font-semibold mt-10 mb-4">4. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Create and manage your account and provide you with the Service.</li>
          <li>Personalise your learning experience (adaptive content recommendations, skill gap identification).</li>
          <li>Generate AI-powered quizzes, explanations, and tutor responses.</li>
          <li>Process payments and manage your subscription tier.</li>
          <li>Send transactional communications (receipts, password resets, account alerts).</li>
          <li>Send marketing communications and product updates (only with your consent; you can opt out at any time).</li>
          <li>Analyse aggregate usage patterns to improve platform features and learning outcomes.</li>
          <li>Detect, investigate, and prevent fraudulent activity, abuse, and security incidents.</li>
          <li>Comply with legal obligations under Kenyan law and respond to lawful requests from authorities.</li>
        </ul>

        {/* 5 */}
        <h2 id="pp-5" className="text-xl font-semibold mt-10 mb-4">5. Automated Decision-Making and Profiling</h2>
        <p className="mb-3">
          EduReach uses automated processing in the following ways that may affect your experience:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Content recommendations:</strong> Our recommendation engine automatically selects videos,
            assessments, and study content based on your learning history, quiz scores, and topic preferences.
          </li>
          <li>
            <strong>AI grading:</strong> Essay answers and open-ended responses may be graded by AI models, which
            assign scores and feedback automatically.
          </li>
          <li>
            <strong>Skill profiling:</strong> We build a profile of your topic mastery and learning progress,
            which influences what content is surfaced to you.
          </li>
          <li>
            <strong>Subscription access control:</strong> Your subscription tier is automatically verified and
            controls your access to features.
          </li>
        </ul>
        <p>
          You have the right to request <strong>human review</strong> of any automated decision that significantly
          affects you (such as an AI grade you believe is incorrect). Contact us at{' '}
          <strong>edu.reach.co@gmail.com</strong> to request a review. You may also contest automated grades
          directly within the platform's feedback interface.
        </p>

        {/* 6 */}
        <h2 id="pp-6" className="text-xl font-semibold mt-10 mb-4">6. Sharing of Information</h2>
        <p className="mb-3 font-medium">We do not sell your personal data. Ever.</p>
        <p className="mb-2">We may share your information only in the following circumstances:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Service providers:</strong> Trusted third-party vendors who help us operate the Service,
            including cloud hosting (Contabo VPS, Germany), AI model access (OpenRouter, USA — which routes to
            providers such as Google, Anthropic, and others), payment processors (Safaricom M-Pesa and Paystack),
            and email delivery services. These providers are contractually bound to use your data only to provide
            services to us.
          </li>
          <li>
            <strong>YouTube / Google:</strong> When you interact with embedded YouTube videos, YouTube's servers
            receive your IP address and interaction data, subject to{' '}
            <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Google's Privacy Policy
            </a>. We do not control this data exchange.
          </li>
          <li>
            <strong>Other users:</strong> Content you post in study groups and community features is visible to
            other members of those groups. Your display name and learning progress may be visible on group
            leaderboards if you opt in.
          </li>
          <li>
            <strong>Legal authorities:</strong> We will disclose data when required to do so by Kenyan law,
            court order, or lawful request from competent authorities. Where permitted, we will notify you before
            complying with such requests.
          </li>
          <li>
            <strong>Business transfers:</strong> If EduReach undergoes a merger, acquisition, or sale of assets,
            your data may be transferred as part of that transaction. We will notify you via email and/or a
            prominent notice on the Service prior to your data being subject to a different privacy policy.
          </li>
        </ul>

        {/* 7 */}
        <h2 id="pp-7" className="text-xl font-semibold mt-10 mb-4">7. International Transfers of Data</h2>
        <p className="mb-3">
          Your data may be processed outside Kenya. Specifically:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Contabo VPS (Germany / European Union):</strong> Our primary server infrastructure is hosted
            in Germany, which benefits from EU GDPR-level data protection standards — considered adequate under
            many international frameworks.
          </li>
          <li>
            <strong>OpenRouter and AI model providers (United States):</strong> Your inputs to AI features are
            processed by OpenRouter and routed to model providers (Google, Anthropic, others) located in the
            United States. We rely on contractual data processing agreements with these providers as our transfer
            safeguard mechanism.
          </li>
          <li>
            <strong>Paystack (Nigeria / United States):</strong> Payment data is processed by Paystack, which
            operates under its own privacy and security standards. See{' '}
            <a href="https://paystack.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Paystack's Privacy Policy
            </a>.
          </li>
        </ul>
        <p>
          We take reasonable steps to ensure that any international transfer of your data is subject to
          appropriate contractual protections consistent with the requirements of the Kenya Data Protection Act
          2019. By using the Service, you acknowledge that your data may be transferred to these locations.
        </p>

        {/* 8 */}
        <h2 id="pp-8" className="text-xl font-semibold mt-10 mb-4">8. Cookies and Tracking Technologies</h2>
        <p className="mb-3">We use the following technologies to operate and improve the Service:</p>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Technology</th>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Purpose</th>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Can You Opt Out?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {[
                ['Authentication tokens (localStorage)', 'Keep you logged in across sessions', 'No — required for the Service to function'],
                ['Session cookies', 'Maintain your session state', 'No — required for the Service to function'],
                ['YouTube iframe cookies', 'Delivered by YouTube when you watch embedded videos', 'Partially — YouTube offers an embed-no-cookie domain for some features'],
                ['Usage analytics (server-side logs)', 'Understand feature usage and improve the platform', 'Contact us to opt out of analytics profiling'],
              ].map(([tech, purpose, optout], i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{tech}</td>
                  <td className="px-4 py-2">{purpose}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{optout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do not currently use third-party advertising cookies or cross-site tracking. If this changes, we
          will update this section and notify you in advance.
        </p>

        {/* 9 */}
        <h2 id="pp-9" className="text-xl font-semibold mt-10 mb-4">9. Data Storage and Security</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Your data is stored on secure servers located in Germany (Contabo VPS), protected by firewalls, access controls, and encrypted connections (TLS/HTTPS).</li>
          <li>Passwords are hashed using industry-standard one-way hashing algorithms and are never stored in plain text.</li>
          <li>Access to your personal data is restricted to authorised personnel who need it to operate the Service.</li>
          <li>We use JWT-based authentication with token expiry to protect account sessions.</li>
          <li>
            <strong>Important limitation:</strong> No security system is 100% impenetrable. We cannot guarantee
            absolute security and are not responsible for unauthorised access resulting from factors outside our
            reasonable control. We encourage you to use a strong, unique password and to log out on shared devices.
          </li>
        </ul>

        {/* 10 */}
        <h2 id="pp-10" className="text-xl font-semibold mt-10 mb-4">10. Data Retention</h2>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Data Category</th>
                <th className="px-4 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-600">Retention Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {[
                ['Account and profile data', 'For the life of your account, plus 30 days after deletion request (to allow recovery)'],
                ['Learning progress and quiz history', 'For the life of your account'],
                ['Payment transaction records', '7 years (required by Kenyan financial regulations)'],
                ['AI interaction logs (inputs/outputs)', '12 months, then anonymised or deleted'],
                ['Server access logs (IP, timestamps)', '90 days'],
                ['Backup copies', 'Up to 30 days after the original data is deleted'],
              ].map(([category, retention], i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{category}</td>
                  <td className="px-4 py-2">{retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          After the applicable retention period, data is securely deleted or anonymised so it can no longer be
          linked to you. You may request early deletion subject to our legal obligations (see Section 11).
        </p>

        {/* 11 */}
        <h2 id="pp-11" className="text-xl font-semibold mt-10 mb-4">11. Your Rights Under the Kenya Data Protection Act 2019</h2>
        <p className="mb-3">As a data subject in Kenya, you have the following rights:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Right to erasure ("right to be forgotten"):</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
          <li><strong>Right to restriction:</strong> Request that we limit how we process your data in certain circumstances.</li>
          <li><strong>Right to object:</strong> Object to processing based on legitimate interest, including profiling for recommendations.</li>
          <li><strong>Right to data portability:</strong> Request your data in a machine-readable format to transfer to another service.</li>
          <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without penalty (withdrawal does not affect past processing).</li>
          <li><strong>Right to human review:</strong> Contest automated decisions that significantly affect you and request human review.</li>
          <li><strong>Right to complain:</strong> Lodge a complaint with the Office of the Data Protection Commissioner (ODPC) at <a href="https://www.odpc.go.ke" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">odpc.go.ke</a> if you believe we have processed your data unlawfully.</li>
        </ul>
        <p>
          To exercise any of these rights, email <strong>edu.reach.co@gmail.com</strong> with the subject line
          "Data Rights Request" and describe your request. We will respond within 30 days. We may need to verify
          your identity before processing your request.
        </p>

        {/* 12 */}
        <h2 id="pp-12" className="text-xl font-semibold mt-10 mb-4">12. Children's Privacy</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Minimum age:</strong> The Service is intended for users aged <strong>13 and above</strong>.
            We do not knowingly collect personal data from children under 13. If we become aware that a user is
            under 13, we will delete their account and data promptly.
          </li>
          <li>
            <strong>Users aged 13–17:</strong> Users under 18 must have verifiable parental or guardian consent
            before creating an account or making any purchase. By registering, a minor's parent or guardian
            confirms they have provided this consent.
          </li>
          <li>
            <strong>Parental rights:</strong> Parents or guardians of users under 18 may contact us at{' '}
            <strong>edu.reach.co@gmail.com</strong> to review, correct, or request deletion of their child's data.
          </li>
          <li>
            <strong>If you believe a child under 13 is using the Service,</strong> please notify us immediately
            at edu.reach.co@gmail.com and we will investigate and act within 72 hours.
          </li>
        </ul>

        {/* 13 */}
        <h2 id="pp-13" className="text-xl font-semibold mt-10 mb-4">13. Third-Party Links and Embedded Content</h2>
        <p>
          Our Service contains embedded YouTube videos and may include links to third-party websites and services.
          We are not responsible for the privacy practices or content of these third parties. When you interact
          with a YouTube embed, YouTube's privacy policy applies to data collected by YouTube. We encourage you to
          review the privacy policies of any third-party services you interact with through our platform,
          including{' '}
          <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Google/YouTube's Privacy Policy
          </a>{' '}
          and{' '}
          <a href="https://paystack.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Paystack's Privacy Policy
          </a>.
        </p>

        {/* 14 */}
        <h2 id="pp-14" className="text-xl font-semibold mt-10 mb-4">14. Data Breach Notification</h2>
        <p>
          In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Notify the Office of the Data Protection Commissioner (ODPC) within <strong>72 hours</strong> of becoming aware of the breach, as required by the Kenya Data Protection Act 2019.</li>
          <li>Notify affected users without undue delay via email and/or in-app notice, describing the nature of the breach, the data affected, the likely consequences, and the steps we are taking to address it.</li>
          <li>Take immediate remedial action to contain the breach and prevent further unauthorised access.</li>
        </ul>
        <p>
          If you believe your account has been compromised, contact us immediately at{' '}
          <strong>edu.reach.co@gmail.com</strong>.
        </p>

        {/* 15 */}
        <h2 id="pp-15" className="text-xl font-semibold mt-10 mb-4">15. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will update the version number and
          "Last Updated" date at the top of this page. For material changes — those that significantly affect
          your rights or how we use your data — we will notify you via email and/or a prominent in-app notice
          at least 14 days before the changes take effect. Where the changes require your consent, we will ask
          for it explicitly.
        </p>

        {/* 16 */}
        <h2 id="pp-16" className="text-xl font-semibold mt-10 mb-4">16. Contact Us and How to Exercise Your Rights</h2>
        <p className="mb-3">For any privacy questions, concerns, or data rights requests:</p>
        <p><strong>Email:</strong> edu.reach.co@gmail.com</p>
        <p><strong>Subject line guidance:</strong></p>
        <ul className="list-disc pl-6 space-y-1 mb-4 text-sm">
          <li>"Data Rights Request" — to access, correct, delete, or export your data</li>
          <li>"Data Protection" — for general privacy questions</li>
          <li>"Data Breach Report" — if you believe your account is compromised</li>
          <li>"Parental Consent / Child Account" — for matters relating to users under 18</li>
        </ul>
        <p><strong>Address:</strong> Nairobi, Kenya</p>
        <p className="mt-4">
          If you are not satisfied with our response, you have the right to lodge a complaint with the{' '}
          <a href="https://www.odpc.go.ke" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Office of the Data Protection Commissioner (ODPC)
          </a>.
        </p>
        <p className="mt-6">
          <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
};
