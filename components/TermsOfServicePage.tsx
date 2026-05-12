import React from 'react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200">
      <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">EduReach Terms of Service</h1>
      <p className="mb-2 text-sm text-slate-500">Version 1.1 — Last Updated: May 12, 2026</p>
      <p className="mb-10 text-sm text-slate-500">
        Previous version: v1.0 (April 30, 2026) — Changes: Added Acceptable Use Policy, User-Generated Content terms, Refund Policy, Indemnification, Force Majeure, Dispute Resolution, Severability, corrected contact details, expanded Payment and AI terms.
      </p>

      {/* Table of Contents */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-10 border border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-semibold mb-3 text-slate-700 dark:text-slate-300">Table of Contents</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-600 dark:text-blue-400">
          {[
            'Our Service',
            'Eligibility and Age Requirements',
            'User Account and Security',
            'Acceptable Use — Prohibited Conduct',
            'User-Generated Content',
            'Third-Party Content (YouTube)',
            'AI Features and Content Generation',
            'Intellectual Property',
            'Payments, Subscriptions, and Refunds',
            'Termination',
            'Disclaimers and Limitation of Liability',
            'Indemnification',
            'Force Majeure',
            'Dispute Resolution',
            'Governing Law',
            'Severability and Entire Agreement',
            'Changes to These Terms',
            'Contact Us',
          ].map((title, i) => (
            <li key={i}>
              <a href={`#tos-${i + 1}`} className="hover:underline">{title}</a>
            </li>
          ))}
        </ol>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-2">
        <p>
          Welcome to EduReach ("we", "us", "our"). By accessing or using our platform (the "Service"), you agree
          to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.
        </p>

        {/* 1 */}
        <h2 id="tos-1" className="text-xl font-semibold mt-10 mb-4">1. Our Service</h2>
        <p>
          EduReach is an AI-powered learning platform that enhances publicly available YouTube videos by providing
          quizzes, gamification, study groups, an AI tutor, and past-paper assessment tools. All videos are played
          exclusively through the <strong>official YouTube embed player</strong>. We do not host, download, store,
          or reproduce video files. AI features are powered by third-party language models accessed via intermediary
          providers such as OpenRouter (which may include models from Google, Anthropic, Mistral, and others).
        </p>

        {/* 2 */}
        <h2 id="tos-2" className="text-xl font-semibold mt-10 mb-4">2. Eligibility and Age Requirements</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            You must be at least <strong>13 years old</strong> to use EduReach. Users aged 13–17 must have
            verifiable parental or guardian consent before creating an account or making any purchase.
          </li>
          <li>
            Users under 13 are not permitted to use the Service. If we become aware that a user is under 13, we
            will delete their account and associated data promptly.
          </li>
          <li>
            By creating an account, you confirm that you meet the age requirements above and that any information
            you provide is accurate.
          </li>
        </ul>

        {/* 3 */}
        <h2 id="tos-3" className="text-xl font-semibold mt-10 mb-4">3. User Account and Security</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>You must notify us immediately at <strong>edu.reach.co@gmail.com</strong> if you suspect unauthorized access to your account.</li>
          <li>You may not share your account with others or create accounts on behalf of others without their knowledge.</li>
          <li>We reserve the right to suspend accounts that show signs of unauthorized access or misuse.</li>
        </ul>

        {/* 4 */}
        <h2 id="tos-4" className="text-xl font-semibold mt-10 mb-4">4. Acceptable Use — Prohibited Conduct</h2>
        <p className="mb-2">You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Post, share, or transmit content that is hateful, defamatory, harassing, sexually explicit, threatening, or discriminatory.</li>
          <li>Facilitate academic dishonesty, including sharing exam answers for commercial gain, impersonating another student during an assessment, or using the platform to cheat in formal examinations.</li>
          <li>Attempt to download, scrape, store, or reproduce YouTube video content, captions, or transcripts beyond what YouTube's own features explicitly permit.</li>
          <li>Reverse-engineer, decompile, or attempt to extract source code from any part of the platform.</li>
          <li>Use automated tools (bots, scrapers, crawlers) to access the Service without our express written permission.</li>
          <li>Upload malware, viruses, or any code intended to disrupt the Service or other users' experience.</li>
          <li>Impersonate EduReach, its staff, or other users.</li>
          <li>Collect or harvest personal data about other users without their consent.</li>
          <li>Engage in any activity that violates Kenyan law, YouTube's Terms of Service, or any applicable third-party terms.</li>
          <li>Use the Service for commercial resale or redistribution without a written agreement with EduReach.</li>
        </ul>
        <p>
          Violations may result in immediate account suspension or termination, and may be reported to relevant
          authorities where required by law.
        </p>

        {/* 5 */}
        <h2 id="tos-5" className="text-xl font-semibold mt-10 mb-4">5. User-Generated Content</h2>
        <p className="mb-2">
          The Service allows you to post, submit, and share content including messages in study groups, community
          posts, quiz questions, and other materials ("User Content").
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Ownership:</strong> You retain ownership of User Content you create. You are solely responsible
            for it and represent that you have all rights necessary to post it.
          </li>
          <li>
            <strong>License to EduReach:</strong> By posting User Content, you grant EduReach a worldwide,
            non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, display,
            distribute, and adapt your User Content solely for the purposes of operating, improving, and promoting
            the Service. This license ends when you delete your content or account, except where content has been
            shared with other users (in which case copies they have seen cannot be retroactively removed).
          </li>
          <li>
            <strong>Moderation:</strong> We reserve the right (but have no obligation) to review, edit, or remove
            User Content that violates these Terms or is otherwise objectionable, without prior notice.
          </li>
          <li>
            <strong>No endorsement:</strong> We do not endorse User Content and make no representations about its
            accuracy or educational value.
          </li>
        </ul>

        {/* 6 */}
        <h2 id="tos-6" className="text-xl font-semibold mt-10 mb-4">6. Third-Party Content (YouTube)</h2>
        <p className="mb-2">EduReach relies on content from YouTube. We do not own or control any YouTube videos, captions, or transcripts.</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Videos are displayed exclusively via YouTube's official embed player in compliance with the <a href="https://www.youtube.com/t/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a> and the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">YouTube API Services Terms of Service</a>.</li>
          <li>AI-generated quizzes, summaries, and tutor responses are created based on publicly available metadata (title, description) and user-provided input — not from unauthorized reproduction of video content.</li>
          <li>We make no warranties about the accuracy, completeness, or educational value of YouTube content or AI-generated interpretations of it.</li>
          <li>YouTube may change, restrict, or remove videos or API access at any time, which may affect your learning experience. We are not liable for such changes.</li>
          <li>You must comply with YouTube's Terms of Service and Community Guidelines when interacting with embedded videos.</li>
        </ul>

        {/* 7 */}
        <h2 id="tos-7" className="text-xl font-semibold mt-10 mb-4">7. AI Features and Content Generation</h2>
        <p className="mb-2">
          Our AI tools are powered by third-party language models accessed via providers such as OpenRouter (which
          routes to models including but not limited to those from Google, Anthropic, Mistral AI, and others). The
          specific models used may change over time as we optimise for quality and cost.
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Accuracy:</strong> AI output — including quizzes, explanations, model solutions, and tutor
            responses — may contain errors, hallucinations, or inaccuracies. You should always verify important
            information against authoritative sources. EduReach is not responsible for decisions made based solely
            on AI-generated content.
          </li>
          <li>
            <strong>Your inputs:</strong> You retain ownership of content you submit to AI features (questions,
            essays, answers). By submitting, you grant EduReach a worldwide, royalty-free, perpetual license to
            use your inputs to operate and improve the Service, including improving AI model performance, subject
            to our Privacy Policy.
          </li>
          <li>
            <strong>AI-generated outputs:</strong> Quizzes, model solutions, and other AI-generated content
            produced by the Service are owned by EduReach. You may use them for your personal, non-commercial
            educational purposes only.
          </li>
          <li>
            <strong>No professional advice:</strong> AI content is not a substitute for professional academic,
            legal, medical, or financial advice.
          </li>
        </ul>

        {/* 8 */}
        <h2 id="tos-8" className="text-xl font-semibold mt-10 mb-4">8. Intellectual Property</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>All content on EduReach (excluding embedded YouTube videos and User Content) — including our UI, branding, original quiz questions, course structures, and software — is owned by EduReach or its licensors and protected by applicable copyright, trademark, and other intellectual property laws.</li>
          <li>You may not copy, modify, distribute, sublicense, or create derivative works from any part of our platform without our prior written permission.</li>
          <li>Respect the copyright of YouTube creators. Unauthorized reproduction, redistribution, or commercial use of YouTube video content or transcripts is strictly prohibited.</li>
          <li>"EduReach" and associated logos are our trademarks. You may not use them without prior written permission.</li>
        </ul>

        {/* 9 */}
        <h2 id="tos-9" className="text-xl font-semibold mt-10 mb-4">9. Payments, Subscriptions, and Refunds</h2>

        <h3 className="text-base font-semibold mt-6 mb-2">9.1 Payment Processing</h3>
        <p className="mb-3">
          Payments are processed by M-Pesa (Safaricom) and Paystack. By making a payment, you also agree to their
          respective terms of service. We do not store full payment card details.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">9.2 Subscriptions and Auto-Renewal</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Paid subscriptions renew automatically at the end of each billing cycle unless you cancel before the renewal date.</li>
          <li>You will receive a notification before any auto-renewal charge is processed.</li>
          <li>You may cancel at any time via your account settings. Cancellation takes effect at the end of the current billing period; you retain access until then.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">9.3 Price Changes</h3>
        <p className="mb-3">
          We will notify you of any price changes at least 14 days before they take effect, via email or in-app
          notice. Continued use of the Service after the effective date constitutes acceptance of the new pricing.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">9.4 Failed Payments</h3>
        <p className="mb-3">
          If a payment fails, your account will be downgraded to the free tier at the end of your current billing
          cycle. We may retry the payment and will notify you of any failure so you can update your payment method.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">9.5 Refund Policy</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>14-day refund window:</strong> If you subscribed to a paid plan for the first time and are
            not satisfied, you may request a full refund within 14 days of your first payment, provided you have
            not used the premium features extensively (defined as completing more than 5 AI-powered sessions or
            generating more than 20 AI quiz questions).
          </li>
          <li>
            <strong>Renewal charges:</strong> Refunds are not available for renewal charges if you failed to
            cancel before the renewal date, except where required by applicable law.
          </li>
          <li>
            <strong>How to request:</strong> Email <strong>edu.reach.co@gmail.com</strong> with the subject line
            "Refund Request", your account email, the date of payment, and the reason for your request. We will
            process eligible refunds within 7 business days.
          </li>
          <li>
            <strong>M-Pesa refunds:</strong> Refunds to M-Pesa are processed via Safaricom's reversal mechanism
            and may take 3–5 business days. Card refunds via Paystack may take 5–10 business days depending on
            your bank.
          </li>
          <li>
            <strong>Chargebacks:</strong> If you initiate a chargeback without first contacting us, we reserve
            the right to suspend your account pending investigation.
          </li>
        </ul>

        {/* 10 */}
        <h2 id="tos-10" className="text-xl font-semibold mt-10 mb-4">10. Termination</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>We may suspend or terminate your account immediately if you violate these Terms, YouTube's rules, or applicable law, or if we reasonably believe your account poses a risk to other users or the platform.</li>
          <li>Where possible, we will warn you before suspension unless the violation is severe (e.g., illegal content, active harassment of other users).</li>
          <li>You may delete your account at any time via account settings. Deletion requests for your personal data are handled under our Privacy Policy.</li>
          <li>Upon termination, your right to use the Service ceases immediately. Sections 5, 8, 11, 12, 14, and 15 of these Terms survive termination.</li>
        </ul>

        {/* 11 */}
        <h2 id="tos-11" className="text-xl font-semibold mt-10 mb-4">11. Disclaimers and Limitation of Liability</h2>
        <p className="mb-3">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF
          HARMFUL COMPONENTS.
        </p>
        <p className="mb-3">
          TO THE MAXIMUM EXTENT PERMITTED BY KENYAN LAW, EDUREACH'S TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING
          FROM OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU
          PAID TO EDUREACH IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) KES 1,000.
        </p>
        <p className="mb-3">
          WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
          LOSS OF LEARNING PROGRESS, DATA, OR PROFITS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES.
        </p>
        <p>
          Nothing in these Terms limits liability for death or personal injury caused by our negligence, fraud, or
          any other liability that cannot be excluded under Kenyan law.
        </p>

        {/* 12 */}
        <h2 id="tos-12" className="text-xl font-semibold mt-10 mb-4">12. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless EduReach and its officers, directors, employees, and
          agents from and against any claims, damages, obligations, losses, liabilities, costs, or expenses
          (including reasonable legal fees) arising from: (a) your use of the Service in violation of these Terms;
          (b) your User Content; (c) your violation of any third party's rights, including intellectual property
          rights; or (d) your violation of any applicable law.
        </p>

        {/* 13 */}
        <h2 id="tos-13" className="text-xl font-semibold mt-10 mb-4">13. Force Majeure</h2>
        <p>
          EduReach will not be liable for any failure or delay in performance resulting from causes beyond our
          reasonable control, including but not limited to: acts of God, natural disasters, war, civil unrest,
          government action, internet or power outages, failure of third-party services (including YouTube API,
          AI model providers, payment processors, or hosting infrastructure), or any other events outside our
          reasonable control. In such events, we will make reasonable efforts to restore the Service as soon as
          practicable and will communicate updates via our official channels.
        </p>

        {/* 14 */}
        <h2 id="tos-14" className="text-xl font-semibold mt-10 mb-4">14. Dispute Resolution</h2>
        <p className="mb-3">
          We want to resolve any concerns you have quickly and fairly. Before initiating formal legal proceedings,
          please follow this process:
        </p>
        <ol className="list-decimal pl-6 space-y-2 mb-4">
          <li>
            <strong>Informal notice:</strong> Email us at <strong>edu.reach.co@gmail.com</strong> describing your
            dispute, the relief you seek, and your contact details. We will acknowledge your notice within 5
            business days.
          </li>
          <li>
            <strong>Good-faith negotiation:</strong> Both parties agree to attempt to resolve the dispute
            informally for at least 30 days from the date of the notice before escalating.
          </li>
          <li>
            <strong>Formal proceedings:</strong> If the dispute is not resolved informally within 30 days, either
            party may pursue formal legal remedies as set out in Section 15.
          </li>
        </ol>

        {/* 15 */}
        <h2 id="tos-15" className="text-xl font-semibold mt-10 mb-4">15. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of Kenya, without regard to its
          conflict of law principles. Subject to Section 14, disputes that cannot be resolved informally shall be
          submitted to the exclusive jurisdiction of the courts of Nairobi, Kenya. If you are a consumer located
          in another jurisdiction, you may also have rights under the laws of that jurisdiction.
        </p>

        {/* 16 */}
        <h2 id="tos-16" className="text-xl font-semibold mt-10 mb-4">16. Severability and Entire Agreement</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>
            <strong>Severability:</strong> If any provision of these Terms is found to be unlawful, void, or
            unenforceable by a court of competent jurisdiction, that provision shall be deemed severed and shall
            not affect the validity and enforceability of the remaining provisions.
          </li>
          <li>
            <strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, constitute the
            entire agreement between you and EduReach with respect to the Service and supersede all prior
            communications, understandings, and agreements.
          </li>
          <li>
            <strong>No waiver:</strong> Our failure to enforce any right or provision of these Terms shall not
            constitute a waiver of that right or provision.
          </li>
          <li>
            <strong>Assignment:</strong> You may not assign your rights or obligations under these Terms without
            our prior written consent. We may assign our rights without restriction.
          </li>
        </ul>

        {/* 17 */}
        <h2 id="tos-17" className="text-xl font-semibold mt-10 mb-4">17. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will update the version number and "Last
          Updated" date at the top of this page and notify you of material changes via email or in-app notice at
          least 14 days before they take effect (or immediately for changes required by law). Continued use of
          the Service after the effective date of changes constitutes your acceptance of the updated Terms.
        </p>

        {/* 18 */}
        <h2 id="tos-18" className="text-xl font-semibold mt-10 mb-4">18. Contact Us</h2>
        <p className="mb-2">For any questions about these Terms:</p>
        <p><strong>Email:</strong> edu.reach.co@gmail.com</p>
        <p><strong>Address:</strong> Nairobi, Kenya</p>
        <p className="mt-4">
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};
