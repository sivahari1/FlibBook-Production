'use client';

type Props = {
  url: string;
  title?: string;
};

export function PdfViewer({ url, title }: Props) {
  if (!url) return null;

  // Better default fit in Chrome’s PDF viewer
  const viewerUrl = `${url}#view=FitH`;

  return (
    <div
      className="w-full rounded-lg overflow-hidden border bg-black"
      style={{ height: 'calc(100vh - 180px)', minHeight: 600 }}
    >
      <iframe
        src={viewerUrl}
        title={title || 'PDF Viewer'}
        className="w-full h-full"
        // ✅ IMPORTANT: Do NOT sandbox the PDF viewer; it often breaks rendering
        loading="lazy"
      />
    </div>
  );
}
