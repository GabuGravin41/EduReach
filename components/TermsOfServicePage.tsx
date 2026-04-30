import React from 'react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">EduReach Terms of Service</h1>
      <p className="mb-8 text-sm text-slate-500">Last Updated: April 30, 2026</p>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Welcome to EduReach ("we", "us", "our"). By accessing or using our platform (the "Service"), you agree to be bound by these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">1. Our Service</h2>
        <p>
          EduReach is an AI-powered learning platform that enhances publicly available YouTube videos by providing quizzes, gamification, study groups, and an AI tutor. All videos are played exclusively through the <strong>official YouTube embed player</strong>. We do not host, download, or reproduce video files.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">2. User Responsibilities</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>You may only use the Service for personal, non-commercial educational purposes unless otherwise agreed in writing.</li>
          <li>You must comply with YouTube's Terms of Service and Community Guidelines when interacting with embedded videos.</li>
          <li>You are responsible for any content you post in study groups or chats.</li>
          <li>You must not attempt to download, scrape, or extract video content or transcripts except as explicitly allowed by YouTube's features.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">3. Third-Party Content (YouTube)</h2>
        <p>
          EduReach relies on third-party content from YouTube. We do not own or control any YouTube videos, captions, or transcripts.
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Videos are displayed via YouTube's official embed player.</li>
          <li>Any AI-generated quizzes, summaries, explanations, or tutor responses are created based on public metadata (title, description) and user-provided input.</li>
          <li>We make no warranties about the accuracy, completeness, or educational value of third-party content.</li>
          <li>YouTube may change or remove videos at any time, which may affect your learning progress.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. AI Features and Content Generation</h2>
        <p>
          Our AI tools (powered by third-party models such as Google Gemini) generate quizzes, explanations, and responses to help your learning.
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>AI output may contain errors or inaccuracies. You should always verify important information.</li>
          <li>You retain ownership of your inputs, but grant us a license to use them to improve the Service.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>All content on EduReach (except embedded YouTube videos) is owned by EduReach or its licensors.</li>
          <li>You may not copy, modify, distribute, or create derivative works from our platform without permission.</li>
          <li>Respect the copyright of all YouTube creators. Unauthorized reproduction of video content or transcripts is prohibited.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">6. Payments and Subscriptions</h2>
        <p>
          Payments are processed via M-Pesa and Paystack. Refunds and cancellations follow our Refund Policy.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">7. Termination</h2>
        <p>
          We may suspend or terminate your account for violations of these Terms, YouTube's rules, or applicable law.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">8. Disclaimers and Limitation of Liability</h2>
        <p>
          The Service is provided "as is". We disclaim all warranties. We are not liable for any indirect, incidental, or consequential damages, including loss of learning progress or data.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">9. Governing Law</h2>
        <p>
          These Terms are governed by the laws of Kenya. Disputes shall be resolved in Kenyan courts.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes acceptance.
        </p>

        <p className="mt-8">
          <strong>Contact us:</strong> edu.reach.co.com | <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};
