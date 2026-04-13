import { Shield, CheckCircle, AlertTriangle, BookOpen, Users, Bot } from 'lucide-react';

const communityRules = [
  {
    id: 1,
    title: 'Be Respectful and Supportive',
    description: 'Treat all members with respect. We\'re all learning together. No harassment, hate speech, or personal attacks. Remember, everyone was a beginner once.',
    icon: Shield,
  },
  {
    id: 2,
    title: 'No Financial Advice',
    description: 'Share information and opinions, but do not provide personalized financial advice. Always recommend consulting with licensed professionals for individual investment decisions.',
    icon: AlertTriangle,
  },
  {
    id: 3,
    title: 'Cite Your Sources',
    description: 'When sharing information, provide links to original sources (WSJ, SEC filings, company reports). Help maintain credibility and allow others to verify information.',
    icon: BookOpen,
  },
  {
    id: 4,
    title: 'No Spam or Self-Promotion',
    description: 'Do not spam the forum with promotional content, referral links, or advertisements. Our moderation system actively monitors and removes spam content.',
    icon: CheckCircle,
  },
  {
    id: 5,
    title: 'Stay On Topic',
    description: 'Keep discussions relevant to investing, financial literacy, market analysis, and EOD report discussions. Help maintain focus for first-time investors.',
    icon: CheckCircle,
  },
  {
    id: 6,
    title: 'No Market Manipulation',
    description: 'Do not coordinate pump-and-dump schemes or attempt to manipulate stock prices. This violates both our rules and federal law.',
    icon: AlertTriangle,
  },
];

const investingGuidelines = [
  {
    title: 'Do Your Own Research (DYOR)',
    points: [
      'Never invest based solely on forum discussions',
      'Verify information from multiple credible sources',
      'Understand the risks before investing',
    ],
  },
  {
    title: 'Risk Management',
    points: [
      'Only invest what you can afford to lose',
      'Diversify your portfolio',
      'Have an emergency fund before investing',
    ],
  },
  {
    title: 'Information Quality',
    points: [
      'Prioritize official sources (SEC filings, company reports)',
      'Be skeptical of too-good-to-be-true opportunities',
      'Cross-reference information before making decisions',
    ],
  },
];

export function Rules() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Community Guidelines & Investment Rules
        </h1>
        <p className="text-lg text-gray-600">
          Our commitment to creating a safe, informative environment for first-time investors
        </p>
      </div>

      {/* Mission Statement */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-start space-x-3">
          <Users className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Our Mission</h3>
            <p className="text-blue-100 text-sm">
              TSM Forum Feed was created to address the challenge faced by first-time investors who feel overwhelmed by financial information. 
              We provide digestible daily market summaries from The Wall Street Journal and foster a supportive community where beginners 
              can learn, ask questions, and build confidence in their investment journey.
            </p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Important Disclaimer</h3>
            <p className="text-sm text-yellow-800">
              TSM Forum is an educational platform for sharing information about investing. Nothing on this platform constitutes professional financial advice. All users should consult with licensed financial advisors before making investment decisions. Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </div>

      {/* Community Rules */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Community Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityRules.map((rule) => {
            const Icon = rule.icon;
            return (
              <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{rule.title}</h3>
                    <p className="text-gray-600">{rule.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment Guidelines */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Investment Best Practices</h2>
        <div className="space-y-6">
          {investingGuidelines.map((guideline, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{guideline.title}</h3>
              <ul className="space-y-3">
                {guideline.points.map((point, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Moderation System */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Moderation & Safety</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automated Content Moderation</h3>
              <p className="text-gray-700 mb-4">
                Our platform uses advanced machine learning to automatically detect and filter spam, inappropriate content, 
                and potential rule violations. This helps maintain a high-quality discussion environment for all users.
              </p>
            </div>
          </div>
          <div className="space-y-3 ml-16">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Real-time spam detection and removal</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Role-based access control (Admin and User roles)</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Blacklist system for repeat violators</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">Human moderator review for reported content</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reporting Issues */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Report Violations</h2>
        <p className="text-gray-700 mb-4">
          If you see content that violates our community guidelines, please report it immediately. We're committed to maintaining a safe and helpful environment for all users, especially those new to investing.
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Report an Issue
        </button>
      </div>
    </div>
  );
}
