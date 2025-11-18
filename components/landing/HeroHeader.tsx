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
        <span>Your Personal Digital Library</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-slideIn">
        <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
          jstudyroom
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-xl md:text-2xl lg:text-3xl text-gray-700 dark:text-gray-300 mb-6 font-light max-w-4xl mx-auto animate-slideIn" style={{ animationDelay: '0.1s' }}>
        Secure Document Sharing with{' '}
        <span className="font-semibold text-blue-600 dark:text-blue-400">DRM Protection</span>,{' '}
        <span className="font-semibold text-purple-600 dark:text-purple-400">Dynamic Watermarks</span>, and{' '}
        <span className="font-semibold text-pink-600 dark:text-pink-400">Curated Library</span>
      </p>

      {/* Description */}
      <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-slideIn" style={{ animationDelay: '0.2s' }}>
        A premium platform for secure document management, private sharing with enterprise-grade protection, 
        and access to a curated digital library. Built for professionals who value security and privacy.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideIn" style={{ animationDelay: '0.3s' }}>
        <a
          href="#explore"
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            Explore jstudyroom
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </a>

        <a
          href="mailto:sivaramj83@gmail.com"
          className="px-8 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-xl font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
        >
          Contact Admin
        </a>
      </div>
    </div>
  );
}
