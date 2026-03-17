import { useState, useRef, useCallback, useEffect } from 'react';
import type { CustomAudioFile, CustomAudioMapping } from '../domain/types';
import {
  CUSTOMIZABLE_ANNOUNCEMENTS,
  MAX_AUDIO_FILE_SIZE,
  MAX_CUSTOM_AUDIO_FILES,
  ACCEPTED_AUDIO_TYPES,
  loadCustomAudioFiles,
  saveCustomAudioFile,
  deleteCustomAudioFile,
  loadAudioMappings,
  setAudioMapping,
  removeAudioMapping,
  formatFileSize,
  generateId,
} from '../domain/logic';
import { useTranslation } from '../i18n';
import { BottomSheet } from './BottomSheet';

interface Props {
  onClose: () => void;
}

export function CustomAudioEditor({ onClose }: Props) {
  const { t, language } = useTranslation();
  const [files, setFiles] = useState<CustomAudioFile[]>(() => loadCustomAudioFiles());
  const [mappings, setMappings] = useState<CustomAudioMapping[]>(() => loadAudioMappings());
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview audio and blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    if (error) setTimeout(() => setError(null), 3000);
  }, [error]);

  useEffect(clearError, [clearError]);

  const handleFileUpload = useCallback(async (fileList: FileList) => {
    const currentFiles = loadCustomAudioFiles();
    if (currentFiles.length >= MAX_CUSTOM_AUDIO_FILES) {
      setError('customAudio.errorMaxFiles');
      return;
    }
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_AUDIO_FILE_SIZE) {
        setError('customAudio.errorTooLarge');
        continue;
      }
      if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
        setError('customAudio.errorUnsupported');
        continue;
      }
      const arrayBuffer = await file.arrayBuffer();
      const audioFile: CustomAudioFile = {
        id: generateId(),
        name: file.name.slice(0, 100),
        data: arrayBuffer,
        mimeType: file.type,
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
      };
      await saveCustomAudioFile(audioFile);
    }
    const updated = await loadCustomAudioFiles();
    setFiles(updated);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handlePreview = useCallback((file: CustomAudioFile) => {
    // Stop existing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    // If clicking the same file, just stop
    if (playingFileId === file.id) {
      setPlayingFileId(null);
      return;
    }

    const blob = new Blob([file.data], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingFileId(null);
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    };
    audio.play().catch(() => setPlayingFileId(null));
    previewAudioRef.current = audio;
    setPlayingFileId(file.id);
  }, [playingFileId]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    // Stop preview if playing this file
    if (playingFileId === fileId && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingFileId(null);
    }
    await deleteCustomAudioFile(fileId);
    const updated = await loadCustomAudioFiles();
    setFiles(updated);
    setMappings(loadAudioMappings()); // Mappings may have been cleaned up
  }, [playingFileId]);

  const handleSetMapping = useCallback((announcementKey: string, audioFileId: string, lang: 'de' | 'en' | 'all') => {
    if (!audioFileId) return;
    setAudioMapping(announcementKey, audioFileId, lang);
    setMappings(loadAudioMappings());
  }, []);

  const handleRemoveMapping = useCallback((mappingId: string) => {
    removeAudioMapping(mappingId);
    setMappings(loadAudioMappings());
  }, []);

  const formatDate = useCallback((isoDate: string) => {
    return new Date(isoDate).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }, [language]);

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="custom-audio-title">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/40">
        <h2 id="custom-audio-title" className="text-lg font-bold text-gray-900 dark:text-white">
          {t('customAudio.title' as Parameters<typeof t>[0])}
        </h2>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700/40"
          aria-label={t('history.close')}
        >
          {t('history.close')}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700/40 rounded-lg text-red-700 dark:text-red-300 text-xs">
          {t(error as Parameters<typeof t>[0])}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Section 1: Audio Files */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('customAudio.filesSection' as Parameters<typeof t>[0])}
          </h3>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-[var(--accent-500)] bg-[color-mix(in_srgb,var(--accent-500)_8%,transparent)]'
                : 'border-gray-300 dark:border-gray-700/60 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,.m4a"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dragOver
                ? t('customAudio.dropActive' as Parameters<typeof t>[0])
                : t('customAudio.dropHint' as Parameters<typeof t>[0])}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">MP3, WAV, OGG, M4A (max 5 MB)</p>
          </div>

          {/* File list */}
          {files.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
              {t('customAudio.noFiles' as Parameters<typeof t>[0])}
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded-lg"
                >
                  {/* Audio icon */}
                  <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 dark:text-white truncate block">{file.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatFileSize(file.sizeBytes)} &middot; {formatDate(file.createdAt)}
                    </span>
                  </div>
                  {/* Preview button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
                    className="px-2 py-1 text-xs font-medium rounded-md transition-colors bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    aria-label={playingFileId === file.id
                      ? t('customAudio.stop' as Parameters<typeof t>[0])
                      : t('customAudio.preview' as Parameters<typeof t>[0])}
                  >
                    {playingFileId === file.id
                      ? t('customAudio.stop' as Parameters<typeof t>[0])
                      : t('customAudio.preview' as Parameters<typeof t>[0])}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDeleteFile(file.id); }}
                    className="px-2 py-1 text-xs font-medium rounded-md transition-colors bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                    aria-label={t('customAudio.delete' as Parameters<typeof t>[0])}
                  >
                    {t('customAudio.delete' as Parameters<typeof t>[0])}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Announcement Mappings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('customAudio.mappingsSection' as Parameters<typeof t>[0])}
          </h3>

          {files.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
              {t('customAudio.noFiles' as Parameters<typeof t>[0])}
            </p>
          ) : (
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_1fr_40px] gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                <span>{t('customAudio.announcement' as Parameters<typeof t>[0])}</span>
                <span>{t('customAudio.language' as Parameters<typeof t>[0])}</span>
                <span>{t('customAudio.file' as Parameters<typeof t>[0])}</span>
                <span />
              </div>

              {CUSTOMIZABLE_ANNOUNCEMENTS.map((key) => {
                const mapping = mappings.find((m) => m.announcementKey === key);
                return (
                  <MappingRow
                    key={key}
                    announcementKey={key}
                    mapping={mapping}
                    files={files}
                    onSetMapping={handleSetMapping}
                    onRemoveMapping={handleRemoveMapping}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

// --- Mapping Row ---
function MappingRow({
  announcementKey,
  mapping,
  files,
  onSetMapping,
  onRemoveMapping,
}: {
  announcementKey: string;
  mapping: CustomAudioMapping | undefined;
  files: CustomAudioFile[];
  onSetMapping: (key: string, fileId: string, lang: 'de' | 'en' | 'all') => void;
  onRemoveMapping: (mappingId: string) => void;
}) {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<'de' | 'en' | 'all'>(mapping?.language ?? 'all');

  const label = t(`customAudio.announce.${announcementKey}` as Parameters<typeof t>[0]);

  return (
    <div className="grid grid-cols-[1fr_80px_1fr_40px] gap-2 px-3 py-1.5 items-center bg-gray-50/50 dark:bg-gray-800/20 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors">
      {/* Announcement label */}
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>

      {/* Language selector */}
      <select
        value={selectedLang}
        onChange={(e) => {
          const lang = e.target.value as 'de' | 'en' | 'all';
          setSelectedLang(lang);
          if (mapping) {
            // Update existing mapping language
            onRemoveMapping(mapping.id);
            onSetMapping(announcementKey, mapping.audioFileId, lang);
          }
        }}
        className="text-xs bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-md px-1.5 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
      >
        <option value="all">{t('customAudio.languageAll' as Parameters<typeof t>[0])}</option>
        <option value="de">DE</option>
        <option value="en">EN</option>
      </select>

      {/* File dropdown */}
      <select
        value={mapping?.audioFileId ?? ''}
        onChange={(e) => {
          const fileId = e.target.value;
          if (fileId) {
            onSetMapping(announcementKey, fileId, selectedLang);
          } else if (mapping) {
            onRemoveMapping(mapping.id);
          }
        }}
        className="text-xs bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-md px-1.5 py-1 text-gray-700 dark:text-gray-300 truncate focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
      >
        <option value="">{t('customAudio.noFile' as Parameters<typeof t>[0])}</option>
        {files.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      {/* Remove button */}
      {mapping ? (
        <button
          onClick={() => onRemoveMapping(mapping.id)}
          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors text-center"
          aria-label={t('customAudio.delete' as Parameters<typeof t>[0])}
        >
          &times;
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
