'use client';

export default function HeroHeader() {
  return (
    <div className="relative z-10 text-center max-w-5xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 px-4 py-2 rounded-full text-sm font-medium mb-8 text-gray-700 dark:text-gray-200 animate-fadeIn">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span>Your Personal Reading Room</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-slideIn">
        <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
          jStudyRoom
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-xl md:text-2xl lg:text-3xl text-green-600 dark:text-green-400 mb-6 font-semibold max-w-4xl mx-auto animate-slideIn" style={{ animationDelay: '0.1s' }}>
        Secure Document Sharing and Personal Learning Space
      </p>

      {/* Description */}
      <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-slideIn" style={{ animationDelay: '0.2s' }}>
        A premium platform for secure document management, private sharing with enterprise-grade protection, 
        and access to a curated digital library. Built for professionals who value security and privacy.
      </p>
    </div>
  );
}
