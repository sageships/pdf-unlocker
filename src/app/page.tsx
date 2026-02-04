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

  const unlockPdf = async (file: File, pwd?: string) => {
    setIsProcessing(true);
    setError('');
    setSuccess(false);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Try to load the PDF with password if provided
      const loadOptions: { password?: string; ignoreEncryption?: boolean } = {};
      if (pwd) {
        loadOptions.password = pwd;
      }
      loadOptions.ignoreEncryption = true;

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, loadOptions);
      } catch (loadError: unknown) {
        // If it fails, might need a password
        const errorMessage = loadError instanceof Error ? loadError.message : String(loadError);
        if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
          setPendingFile(file);
          setShowPasswordInput(true);
          setIsProcessing(false);
          setError('This PDF is password-protected. Please enter the password below.');
          return;
        }
        throw loadError;
      }

      // Create a new PDF without restrictions/password
      const unlockedPdf = await PDFDocument.create();
      const pages = await unlockedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => unlockedPdf.addPage(page));

      // Save the unlocked PDF (without encryption)
      const pdfBytes = await unlockedPdf.save();
      
      // Download
      const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_unlocked.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(true);
      setShowPasswordInput(false);
      setPendingFile(null);
      setPassword('');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('password') || errorMessage.includes('incorrect')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Failed to unlock PDF. The file might be corrupted or use unsupported encryption.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setShowPasswordInput(false);
    setPassword('');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      unlockPdf(file);
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowPasswordInput(false);
    setPassword('');
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
            Remove passwords & restrictions from your PDFs
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
          onClick={() => !showPasswordInput && document.getElementById('fileInput')?.click()}
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
