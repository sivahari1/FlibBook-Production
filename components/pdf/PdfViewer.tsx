'use client';

type Props = {
  url: string;
  title?: string;
};

export function PdfViewer({ url, title }: Props) {
  if (!url) return null;

  // Append PDF viewing parameters to the URL
  const pdfUrl = url.includes('#') 
    ? `${url}&view=FitH&toolbar=0&navpanes=0&scrollbar=1`
    : `${url}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Debug link */}
      <div className="mb-2 text-right">
        <a 
          href={pdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Open PDF in new tab
        </a>
      </div>
      
      {/* PDF Viewer */}
      <div 
        className="rounded-lg overflow-hidden border bg-black"
        style={{ 
          height: 'calc(100vh - 220px)', 
          minHeight: '650px' 
        }}
      >
        <iframe
          src={pdfUrl}
          title={title || 'PDF Viewer'}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
