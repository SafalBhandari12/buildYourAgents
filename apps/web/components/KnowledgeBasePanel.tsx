'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ApiError,
  deleteDocument,
  ingestFile,
  ingestUrl,
  listDocuments,
  type DocumentItem,
} from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Web';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceIcon(doc: DocumentItem): string {
  if (doc.type === 'url') return 'link';
  if (doc.name.toLowerCase().endsWith('.pdf')) return 'picture_as_pdf';
  return 'description';
}

export function KnowledgeBasePanel({
  isAuthenticated,
  onIngested,
}: {
  isAuthenticated: boolean;
  onIngested: () => void;
}) {
  const { open } = useAuthModal();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDocuments = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs.sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      setError('Failed to load your sources. Refresh to try again.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setDocuments([]);
      setIsLoadingList(false);
      return;
    }
    refreshDocuments();
  }, [isAuthenticated, refreshDocuments]);

  async function handleFile(file: File) {
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setError(null);
    setIsIngesting(true);
    try {
      await ingestFile(file);
      await refreshDocuments();
      onIngested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.');
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleAddUrl() {
    if (!urlValue.trim()) return;
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setError(null);
    setIsIngesting(true);
    try {
      await ingestUrl(urlValue.trim());
      setUrlValue('');
      await refreshDocuments();
      onIngested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not crawl that URL. Try again.');
    } finally {
      setIsIngesting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove document.');
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <>
      <div className="px-4 py-4 flex-grow overflow-y-auto flex flex-col gap-3">
        {error && (
          <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">{error}</div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => (isAuthenticated ? fileInputRef.current?.click() : open('signin'))}
          className={`border border-dashed rounded-md p-4 flex items-center gap-3 text-left bg-background-100 transition-colors cursor-pointer group ${
            isDragging ? 'border-gray-600' : 'border-gray-alpha-400 hover:border-gray-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <span className="material-symbols-outlined text-gray-1000 group-hover:text-gray-1000 text-xl">
            {isIngesting ? 'hourglass_top' : 'upload_file'}
          </span>
          <div>
            <p className="text-label-14 text-gray-1000">
              {isIngesting ? 'Indexing…' : 'Drag & drop, or click to browse'}
            </p>
            <p className="text-copy-13 text-gray-1000">PDF, TXT, DOCX up to 50MB</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="input-field flex-grow"
            placeholder="Or paste a URL to crawl…"
            type="text"
            value={urlValue}
            disabled={isIngesting}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
          />
          <button
            className="btn-secondary px-3 disabled:opacity-50"
            disabled={isIngesting || !urlValue.trim()}
            onClick={handleAddUrl}
          >
            Add
          </button>
        </div>

        <div className="flex flex-col mt-1">
          <h3 className="text-label-12 uppercase tracking-wider text-gray-1000 mb-1">
            Sources ({documents.length})
          </h3>

          {isLoadingList && <p className="text-copy-13 text-gray-1000 py-2">Loading…</p>}

          {!isLoadingList && documents.length === 0 && (
            <p className="text-copy-13 text-gray-1000 py-2">
              {isAuthenticated
                ? 'No sources yet. Upload a file or paste a URL to get started.'
                : 'Sign in to upload files and see your sources here.'}
            </p>
          )}

          <div className="flex flex-col divide-y divide-gray-alpha-200">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2.5 group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-gray-1000 text-sm">
                    {sourceIcon(doc)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-label-14 text-gray-1000 truncate">{doc.name}</span>
                    <span className="text-copy-13 text-gray-1000">
                      {formatBytes(doc.sizeBytes)} • Indexed • {doc.chunkCount} chunks
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="material-symbols-outlined text-gray-1000 hover:text-red-700 cursor-pointer text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
