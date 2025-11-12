'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PlanCardProps {
  name: string;
  price: number;
  duration?: string;
  storage: string;
  maxDocuments: string;
  features: string[];
  isCurrentPlan: boolean;
  popular?: boolean;
  onUpgrade?: () => void;
  loading?: boolean;
}

export default function PlanCard({
  name,
  price,
  duration,
  storage,
  maxDocuments,
  features,
  isCurrentPlan,
  popular = false,
  onUpgrade,
  loading = false,
}: PlanCardProps) {
  return (
    <div className={`relative transform transition-all duration-300 hover:scale-105 ${
      popular ? 'md:-mt-4' : ''
    }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <Card className={`relative h-full ${
        isCurrentPlan 
          ? 'ring-2 ring-blue-500 shadow-xl' 
          : popular 
          ? 'ring-2 ring-orange-500 shadow-xl' 
          : 'shadow-lg hover:shadow-2xl'
      } transition-all duration-300`}>
        {isCurrentPlan && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg rounded-tr-lg">
            ACTIVE
          </div>
        )}
        
        <div className="p-6 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-2 text-gray-900">{name}</h3>
            
            <div className="mb-2">
              {price === 0 ? (
                <div>
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Free
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ₹{(price / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
            
            {duration && (
              <p className="text-sm text-gray-600 font-medium">{duration}</p>
            )}
          </div>

          <div className="space-y-3 mb-6 flex-grow">
            <div className="flex items-center text-gray-700 bg-blue-50 p-2 rounded-lg">
              <svg className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{storage} storage</span>
            </div>
            
            <div className="flex items-center text-gray-700 bg-purple-50 p-2 rounded-lg">
              <svg className="w-5 h-5 mr-2 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{maxDocuments} documents</span>
            </div>

            {features.map((feature, index) => (
              <div key={index} className="flex items-start text-gray-700">
                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            {!isCurrentPlan && onUpgrade && price > 0 && (
              <Button
                onClick={onUpgrade}
                disabled={loading}
                className={`w-full font-semibold transition-all duration-300 ${
                  popular
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Subscribe Now'
                )}
              </Button>
            )}

            {isCurrentPlan && (
              <Button
                disabled
                className="w-full bg-gray-300 cursor-not-allowed text-gray-600 font-semibold"
              >
                Current Plan
              </Button>
            )}

            {price === 0 && !isCurrentPlan && (
              <Button
                disabled
                className="w-full bg-gray-200 cursor-not-allowed text-gray-500 font-semibold"
              >
                Free Plan
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
