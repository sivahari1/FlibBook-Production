import Link from 'next/link';

function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500"></div>
            <Link href="/">
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                jStudyRoom
              </p>
            </Link>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-500"></div>
          </div>
          
          <p className="text-sm text-gray-400">
            Digital Collaboration and Personal Learning Space
          </p>
          
          <div className="pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-2">
              Designed and Developed by
            </p>
            <p className="text-base font-semibold text-white mb-1">
              JYOSRIK & WIKWIL
            </p>
            <p className="text-sm text-gray-400 flex items-center justify-center space-x-2">
              <span>Licensed to</span>
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DeepTurn
              </span>
            </p>
          </div>
          
          <p className="text-xs text-gray-500 pt-4">
            &copy; {new Date().getFullYear()} jStudyRoom. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

Footer.displayName = 'Footer';

export default Footer;
