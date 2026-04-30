import React from 'react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">EduReach Privacy Policy</h1>
      <p className="mb-8 text-sm text-slate-500">Last Updated: April 30, 2026</p>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          EduReach ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile-first AI-powered learning platform (the "Service").
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Personal Information</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Account details: Name, email address, phone number (for M-Pesa/Paystack integration), password.</li>
          <li>Profile information: Grade level, subjects of interest, learning goals.</li>
          <li>Payment information: Processed securely by M-Pesa and Paystack — we do not store full payment card details.</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-2">Usage and Learning Data</h3>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Learning activity: Videos watched (via YouTube embeds), quiz scores, progress, XP/levels earned.</li>
          <li>AI interactions: Questions asked to the AI tutor, essay submissions, generated content.</li>
          <li>Device and usage data: IP address, device type, browser/app version, timestamps.</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-2">Third-Party Content Data</h3>
        <p>
          We may temporarily process public YouTube video metadata (title, description) and user-provided text (e.g., pasted transcript portions or questions) to power AI features.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Provide and improve the Service (personalized learning paths, AI tutor, quizzes, gamification).</li>
          <li>Process payments and manage subscriptions/free tier access.</li>
          <li>Communicate with you (updates, support, marketing with consent).</li>
          <li>Analyze usage to enhance learning outcomes and platform features.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">3. Sharing of Information</h2>
        <p className="mb-4">We do not sell your personal data.</p>
        <p>We may share information with:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Service providers (hosting, AI models like Google Gemini via OpenRouter, payment processors, analytics).</li>
          <li>YouTube (when you interact with embedded videos — subject to YouTube's privacy policy).</li>
          <li>Legal authorities when required by Kenyan law.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Storage and Security</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Data is stored on secure servers (PostgreSQL).</li>
          <li>We use industry-standard security measures (encryption, access controls, JWT authentication).</li>
          <li>However, no system is 100% secure. We cannot guarantee absolute security.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Rights (Kenya Data Protection Act 2019)</h2>
        <p className="mb-2">As a data subject in Kenya, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Access, correct, or delete your personal data.</li>
          <li>Object to or restrict processing.</li>
          <li>Withdraw consent where applicable.</li>
          <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC).</li>
        </ul>
        <p>To exercise these rights, contact us at edu.reach.co.com.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">6. Children's Privacy</h2>
        <p>
          The Service is primarily for students (secondary school and above). Users under 18 should use the platform with parental/guardian consent. We do not knowingly collect data from children under 13 without verifiable parental consent.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">7. Third-Party Links and Content</h2>
        <p>
          Our Service contains embedded YouTube videos and links to third-party services. We are not responsible for their privacy practices. Please review YouTube's Privacy Policy and Terms of Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">8. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data (subject to legal obligations).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">9. International Transfers</h2>
        <p>
          Your data may be processed in countries outside Kenya (e.g., where our AI providers or hosting servers are located). We take steps to ensure adequate protection.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
        <p>
          We may update this Policy. We will notify you of material changes via email or in-app notice.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="mb-2">For any privacy questions or requests:</p>
        <p><strong>Email:</strong> edu.reach.co.com</p>
        <p><strong>Address:</strong> Nairobi</p>
        
        <p className="mt-8">
          By using EduReach, you consent to the practices described in this Privacy Policy.
        </p>
      </div>
    </div>
  );
};
