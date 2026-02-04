'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const unlockPdf = async (file: File, pwd?: string) => {
    setIsProcessing(true);
    setError('');
    setSuccess(false);
    setFileName(file.name);
    setStatus('Reading file...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      setStatus('Processing PDF...');
      
      // Try with pdf-lib first (handles restriction-only PDFs)
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { 
          ignoreEncryption: true 
        });
        
        setStatus('Creating unlocked copy...');
        const unlockedPdf = await PDFDocument.create();
        const pageIndices = pdfDoc.getPageIndices();
        
        if (pageIndices.length === 0) {
          throw new Error('PDF has no pages or could not be read');
        }
        
        const pages = await unlockedPdf.copyPages(pdfDoc, pageIndices);
        pages.forEach((page) => unlockedPdf.addPage(page));

        setStatus('Saving...');
        const pdfBytes = await unlockedPdf.save();
        downloadPdf(pdfBytes, file.name);
        setSuccess(true);
        resetState();
        setStatus('');
        return;
      } catch (pdfLibError: unknown) {
        const errMsg = pdfLibError instanceof Error ? pdfLibError.message : String(pdfLibError);
        console.log('pdf-lib error:', errMsg);
        
        // Check if it's encryption-related
        if (errMsg.toLowerCase().includes('password') || 
            errMsg.toLowerCase().includes('encrypt') ||
            errMsg.toLowerCase().includes('decrypt') ||
            errMsg.toLowerCase().includes('expected instance') ||
            errMsg.toLowerCase().includes('undefined')) {
          setError('This PDF is encrypted with a method that cannot be processed in the browser. Please use ilovepdf.com/unlock_pdf instead.');
          setIsProcessing(false);
          setStatus('');
          return;
        }
        
        // For other errors, show them
        setError(`Failed to process PDF: ${errMsg}. Try ilovepdf.com/unlock_pdf instead.`);
      }
      
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  const downloadPdf = (pdfBytes: Uint8Array, originalName: string) => {
    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName.replace('.pdf', '_unlocked.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setShowPasswordInput(false);
    setPendingFile(null);
    setPassword('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    resetState();
    setError('');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      unlockPdf(file);
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    setError('');
    const file = e.target.files?.[0];
    if (file) {
      unlockPdf(file);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFile && password) {
      unlockPdf(pendingFile, password);
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
            Remove editing/printing restrictions from PDFs
          </p>
          <p className="text-gray-500 text-sm mt-1">
            (For password-protected PDFs, use ilovepdf.com)
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
          onClick={() => !showPasswordInput && !isProcessing && document.getElementById('fileInput')?.click()}
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
              <p className="text-gray-300">{status || 'Processing...'}</p>
              <p className="text-gray-500 text-sm">{fileName}</p>
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

        {showPasswordInput && (
          <form onSubmit={handlePasswordSubmit} className="mt-4 p-4 bg-white/5 border border-gray-600 rounded-xl">
            <label className="block text-gray-300 mb-2">
              🔑 Enter PDF Password:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!password || isProcessing}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                Unlock
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300">
            ✅ PDF unlocked successfully! Check your downloads.
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>🔒 Files are processed locally in your browser</p>
          <p className="mt-1">Nothing is uploaded to any server</p>
        </div>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
          <p><strong>Note:</strong> This tool removes editing/copying/printing restrictions.</p>
          <p className="mt-1">For PDFs that require a password to open, use <a href="https://www.ilovepdf.com/unlock_pdf" target="_blank" rel="noopener" className="underline">ilovepdf.com/unlock_pdf</a></p>
        </div>

        <footer className="mt-8 text-center text-gray-600 text-sm">
          Built with 🦞 by <a href="https://github.com/sageships" className="text-purple-400 hover:underline">Sage</a>
        </footer>
      </div>
    </main>
  );
}
