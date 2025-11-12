export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-500"></div>
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FlipBook DRM
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-500"></div>
          </div>
          
          <p className="text-sm text-gray-400">
            Secure PDF sharing platform with advanced DRM protection
          </p>
          
          <div className="pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-2">
              Designed and Developed by
            </p>
            <p className="text-base font-semibold text-white mb-1">
              J. Siva Ramakrishna & R. Hariharan
            </p>
            <p className="text-sm text-gray-400 flex items-center justify-center space-x-2">
              <span>Powered by</span>
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DeepTech.Inc
              </span>
            </p>
          </div>
          
          <p className="text-xs text-gray-500 pt-4">
            &copy; {new Date().getFullYear()} FlipBook DRM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
