import { useState } from 'react';

interface UseNotesDownloadOptions {
  courseName?: string;
  lessonName?: string;
}

export const useNotesDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsText = (content: string, filename: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAsMarkdown = (content: string, filename: string, options?: UseNotesDownloadOptions) => {
    const timestamp = new Date().toLocaleString();
    const header = `# Notes
    
${options?.courseName ? `**Course:** ${options.courseName}\n` : ''}
${options?.lessonName ? `**Lesson:** ${options.lessonName}\n` : ''}
**Downloaded:** ${timestamp}

---

## Content

`;
    
    const fullContent = header + content;
    downloadAsText(fullContent, filename);
  };

  const downloadAsPDF = async (content: string, filename: string, options?: UseNotesDownloadOptions) => {
    setIsDownloading(true);
    try {
      // For now, use a simple approach: create HTML and print to PDF
      // In production, use jsPDF or similar library
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to download PDF');
        setIsDownloading(false);
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
              h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
              .metadata { background: #f3f4f6; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
              .metadata p { margin: 5px 0; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Notes</h1>
            <div class="metadata">
              ${options?.courseName ? `<p><strong>Course:</strong> ${options.courseName}</p>` : ''}
              ${options?.lessonName ? `<p><strong>Lesson:</strong> ${options.lessonName}</p>` : ''}
              <p><strong>Downloaded:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <script>
              window.print();
              window.close();
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadAsText,
    downloadAsMarkdown,
    downloadAsPDF,
    isDownloading
  };
};
