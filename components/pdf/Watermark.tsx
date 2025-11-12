'use client';

interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  image?: string;
  opacity?: number;
  fontSize?: number;
}

interface WatermarkProps {
  viewerEmail: string;
  timestamp: string;
  config?: WatermarkConfig;
}

export default function Watermark({ viewerEmail, timestamp, config }: WatermarkProps) {
  const watermarkText = config?.text || `${viewerEmail} - ${timestamp}`;
  const opacity = config?.opacity || 0.3;
  const fontSize = config?.fontSize || 16;

  // Image watermark
  if (config?.type === 'image' && config.image) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${config.image})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px 200px',
            opacity: opacity,
            transform: 'rotate(-45deg) scale(1.5)',
            transformOrigin: 'center',
          }}
        />
      </div>
    );
  }

  // Text watermark (default)
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Create a repeating pattern of watermarks */}
        <defs>
          <pattern
            id="watermark-pattern"
            x="0"
            y="0"
            width="400"
            height="400"
            patternUnits="userSpaceOnUse"
          >
            <text
              x="200"
              y="200"
              textAnchor="middle"
              dominantBaseline="middle"
              transform="rotate(-45 200 200)"
              fill={`rgba(0, 0, 0, ${opacity})`}
              fontSize={fontSize}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {watermarkText}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
      </svg>
    </div>
  );
}
