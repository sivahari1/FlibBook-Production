export function FlipBookLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-lg">
      <div className="relative">
        {/* Animated book icon */}
        <div className="w-24 h-32 bg-white rounded-lg shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
               style={{ 
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite'
               }} 
          />
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-200" />
        </div>
        
        {/* Page flip animation */}
        <div className="absolute top-0 right-0 w-12 h-32 bg-white rounded-r-lg shadow-lg origin-left animate-flip"
             style={{
               animation: 'flip 1.5s ease-in-out infinite'
             }}
        />
      </div>
      
      <p className="mt-6 text-gray-600 font-medium">Loading flipbook...</p>
      <p className="mt-2 text-sm text-gray-500">Converting pages for optimal viewing</p>
      
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes flip {
          0%, 100% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(-180deg);
          }
        }
      `}</style>
    </div>
  );
}
