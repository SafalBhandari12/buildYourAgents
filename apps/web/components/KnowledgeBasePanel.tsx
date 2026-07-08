'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  deleteDocument,
  getKnowledgeBaseSettings,
  ingestFile,
  ingestUrl,
  listDocuments,
  updateKnowledgeBaseSettings,
  type ChunkingStrategy,
  type DocumentItem,
} from '@/lib/api';
import { useAuthModal } from '@/components/AuthModalContext';

const FALLBACK_MIN_CHUNK_SIZE = 200;
const FALLBACK_MAX_CHUNK_SIZE = 4000;
const FALLBACK_MIN_CHUNK_OVERLAP = 0;
const FALLBACK_MAX_CHUNK_OVERLAP = 1000;

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

export function KnowledgeBasePanel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { open } = useAuthModal();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>('markdown');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['knowledge-settings'],
    queryFn: getKnowledgeBaseSettings,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!settings) return;
    setChunkSize(settings.chunkSize);
    setChunkOverlap(settings.chunkOverlap);
    setChunkingStrategy(settings.chunkingStrategy);
  }, [settings]);

  const minChunkSize = settings?.minChunkSize ?? FALLBACK_MIN_CHUNK_SIZE;
  const maxChunkSize = settings?.maxChunkSize ?? FALLBACK_MAX_CHUNK_SIZE;
  const minChunkOverlap = settings?.minChunkOverlap ?? FALLBACK_MIN_CHUNK_OVERLAP;
  const maxChunkOverlap = settings?.maxChunkOverlap ?? FALLBACK_MAX_CHUNK_OVERLAP;
  const isFreeTier = settings?.isFreeTier ?? false;

  const chunkSizeOutOfRange = chunkSize < minChunkSize || chunkSize > maxChunkSize;
  const chunkOverlapOutOfRange =
    chunkOverlap < minChunkOverlap || chunkOverlap > maxChunkOverlap || chunkOverlap >= chunkSize;
  const isSettingsDirty = settings
    ? chunkSize !== settings.chunkSize ||
      chunkOverlap !== settings.chunkOverlap ||
      chunkingStrategy !== settings.chunkingStrategy
    : false;
  const canSaveSettings = !chunkSizeOutOfRange && !chunkOverlapOutOfRange && isSettingsDirty;

  const settingsMutation = useMutation({
    mutationFn: updateKnowledgeBaseSettings,
    onSuccess: () => {
      setSettingsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['knowledge-settings'] });
      setTimeout(() => setSettingsSaved(false), 1500);
    },
  });

  function handleSaveSettings() {
    if (!canSaveSettings) return;
    setSettingsSaved(false);
    settingsMutation.mutate({ chunkSize, chunkOverlap, chunkingStrategy });
  }

  const settingsError =
    settingsMutation.error instanceof ApiError
      ? settingsMutation.error.message
      : settingsMutation.isError
        ? 'Failed to save chunking settings.'
        : null;

  const { data: documents = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
    enabled: isAuthenticated,
    select: (docs) => [...docs].sort((a, b) => b.createdAt - a.createdAt),
  });

  function onIngestSuccess() {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  }

  const ingestFileMutation = useMutation({
    mutationFn: ingestFile,
    onSuccess: onIngestSuccess,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.'),
  });

  const ingestUrlMutation = useMutation({
    mutationFn: ingestUrl,
    onSuccess: () => {
      setUrlValue('');
      onIngestSuccess();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not crawl that URL. Try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to remove document.'),
  });

  const isIngesting = ingestFileMutation.isPending || ingestUrlMutation.isPending;

  function handleFile(file: File) {
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setError(null);
    ingestFileMutation.mutate(file);
  }

  function handleAddUrl() {
    if (!urlValue.trim()) return;
    if (!isAuthenticated) {
      open('signin');
      return;
    }
    setError(null);
    ingestUrlMutation.mutate(urlValue.trim());
  }

  function handleDelete(id: string) {
    setError(null);
    deleteMutation.mutate(id);
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

        {isAuthenticated && !isLoadingSettings && (
          <div className="flex flex-col gap-3 border-t border-gray-alpha-400 pt-3 mt-1">
            <h3 className="text-label-12 uppercase tracking-wider text-gray-600">
              Chunking Settings
            </h3>

            {settingsError && (
              <div className="text-copy-13 text-red-900 bg-red-100 rounded-sm px-3 py-2">
                {settingsError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h4 className="text-label-12 text-gray-600">Chunking Strategy</h4>
              <select
                className="input-field"
                value={chunkingStrategy}
                onChange={(e) => setChunkingStrategy(e.target.value as ChunkingStrategy)}
              >
                <option value="markdown">Markdown-aware (splits on headers)</option>
                <option value="recursive">Recursive (plain text, no header parsing)</option>
              </select>
              <span className="text-copy-13 text-gray-600">
                {isFreeTier
                  ? 'Markdown-aware chunking requires a paid plan — your documents are chunked as plain text.'
                  : 'Markdown-aware chunking splits by header sections first, then by size within each section.'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h4 className="text-label-12 text-gray-600">Chunk Size (chars)</h4>
                <input
                  type="number"
                  className="input-field"
                  min={minChunkSize}
                  max={maxChunkSize}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                />
                <span className={`text-copy-13 ${chunkSizeOutOfRange ? 'text-red-700' : 'text-gray-600'}`}>
                  Between {minChunkSize} and {maxChunkSize}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-label-12 text-gray-600">Chunk Overlap (chars)</h4>
                <input
                  type="number"
                  className="input-field"
                  min={minChunkOverlap}
                  max={maxChunkOverlap}
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                />
                <span
                  className={`text-copy-13 ${chunkOverlapOutOfRange ? 'text-red-700' : 'text-gray-600'}`}
                >
                  Must be less than chunk size
                </span>
              </div>
            </div>

            <p className="text-copy-13 text-gray-600 leading-relaxed -mt-1">
              These settings apply to documents ingested after saving — existing sources keep the
              chunk boundaries they were created with.
            </p>

            <button
              onClick={handleSaveSettings}
              disabled={settingsMutation.isPending || !canSaveSettings}
              className="btn-primary px-3 py-1.5 self-start disabled:opacity-50"
            >
              {settingsMutation.isPending ? 'Saving…' : settingsSaved ? 'Saved' : 'Save Chunking Settings'}
            </button>
          </div>
        )}

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
