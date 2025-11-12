'use client';

import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Watermark from './Watermark';

interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  image?: string;
  opacity?: number;
  fontSize?: number;
}

interface PDFPageProps {
  page: pdfjsLib.PDFPageProxy;
  pageNumber: number;
  scale?: number;
  viewerEmail?: string;
  timestamp?: string;
  watermarkConfig?: WatermarkConfig;
}

export default function PDFPage({ 
  page, 
  pageNumber, 
  scale = 1.5,
  viewerEmail,
  timestamp,
  watermarkConfig
}: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const renderPage = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      try {
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (error: any) {
        if (error?.name === 'RenderingCancelledException') {
          // Render was cancelled, this is expected
          return;
        }
        console.error('Error rendering PDF page:', error);
      }
    };

    renderPage();

    // Cleanup function to cancel render on unmount
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [page, scale]);

  return (
    <div className="relative mb-4 shadow-lg">
      <canvas ref={canvasRef} className="w-full h-auto" />
      {watermarkConfig ? (
        <Watermark 
          viewerEmail={watermarkConfig.text || viewerEmail || ''} 
          timestamp={timestamp || ''}
          config={watermarkConfig}
        />
      ) : viewerEmail && timestamp ? (
        <Watermark viewerEmail={viewerEmail} timestamp={timestamp} />
      ) : null}
    </div>
  );
}
