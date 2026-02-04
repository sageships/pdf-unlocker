'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const unlockPdf = async (file: File) => {
    setIsProcessing(true);
    setError('');
    setSuccess(false);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF (this will fail if it's password-protected for opening)
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });

      // Create a new PDF without restrictions
      const unlockedPdf = await PDFDocument.create();
      const pages = await unlockedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => unlockedPdf.addPage(page));

      // Save the unlocked PDF
      const pdfBytes = await unlockedPdf.save();
      
      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_unlocked.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Failed to unlock PDF. It might be password-protected for opening (not just editing). Try a different tool for password-protected PDFs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      unlockPdf(file);
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      unlockPdf(file);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔓 PDF Unlocker
          </h1>
          <p className="text-gray-400">
            Remove editing restrictions from your PDFs instantly
          </p>
        </div>

        <div
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
            ${isDragging 
              ? 'border-purple-400 bg-purple-500/20' 
              : 'border-gray-600 bg-white/5 hover:border-gray-500 hover:bg-white/10'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-300">Unlocking {fileName}...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl">📄</div>
              <div>
                <p className="text-xl text-white font-medium">
                  Drop your PDF here
                </p>
                <p className="text-gray-400 mt-2">
                  or click to browse
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300">
            ✅ PDF unlocked successfully! Check your downloads.
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>🔒 Your files are processed locally in your browser</p>
          <p className="mt-1">Nothing is uploaded to any server</p>
        </div>

        <footer className="mt-12 text-center text-gray-600 text-sm">
          Built with 🦞 by <a href="https://github.com/sageships" className="text-purple-400 hover:underline">Sage</a>
        </footer>
      </div>
    </main>
  );
}
