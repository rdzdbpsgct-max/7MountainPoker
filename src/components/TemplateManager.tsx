import { useState, useCallback, useMemo } from 'react';
import type { TournamentConfig } from '../domain/types';
import type { TournamentTemplate } from '../domain/logic';
import { loadTemplates, saveTemplate, deleteTemplate, exportTemplateToJSON, parseTemplateFile, exportConfigJSON, importConfigJSON } from '../domain/logic';
import { useTranslation } from '../i18n';
import { ChevronIcon } from './ChevronIcon';
import { BottomSheet } from './BottomSheet';

// Minimal type for File System Access API (Chromium only)
interface FilePickerHandle {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

interface WindowWithFilePicker {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FilePickerHandle>;
}

interface Props {
  config: TournamentConfig;
  onLoad: (config: TournamentConfig) => void;
  onClose: () => void;
}

export function TemplateManager({ config, onLoad, onClose }: Props) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TournamentTemplate[]>(() => loadTemplates());
  const [newName, setNewName] = useState(config.name || '');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Detect native save picker support (Chromium only)
  const hasNativeSavePicker = useMemo(() => {
    const w = window as unknown as WindowWithFilePicker;
    return typeof w.showSaveFilePicker === 'function';
  }, []);

  const handleSave = () => {
    if (!newName.trim()) return;
    saveTemplate(newName.trim(), config);
    setTemplates(loadTemplates());
    setNewName('');
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    setTemplates(loadTemplates());
    setConfirmDeleteId(null);
  };

  const handleLoad = (template: TournamentTemplate) => {
    onLoad(template.config);
    onClose();
  };

  const handleSaveToFile = useCallback(async () => {
    const name = newName.trim() || config.name || 'poker-template';
    const json = exportTemplateToJSON(name, config);
    const fileName = `${name.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '')}.json`;

    // Try File System Access API (Chromium) for native save dialog with directory selection
    const fsWindow = window as unknown as WindowWithFilePicker;
    if (typeof fsWindow.showSaveFilePicker === 'function') {
      try {
        const handle = await fsWindow.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'Poker Template (JSON)', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Fall through to download fallback
      }
    }

    // Fallback: trigger download (Safari, Firefox)
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, [newName, config]);

  const handleLoadFromFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { setFileError(true); return; }
      try {
        const text = await file.text();
        const result = parseTemplateFile(text);
        if (result) {
          onLoad(result.config);
          onClose();
        } else {
          setFileError(true);
          setTimeout(() => setFileError(false), 3000);
        }
      } catch {
        setFileError(true);
        setTimeout(() => setFileError(false), 3000);
      }
    };
    input.click();
  }, [onLoad, onClose]);

  const handleToggleJson = () => {
    if (!showJson) {
      setJsonText(exportConfigJSON(config));
      setJsonError('');
    }
    setShowJson((v) => !v);
  };

  const handleJsonCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportConfigJSON(config));
    } catch {
      // Clipboard API not available (e.g. HTTP, older browser)
    }
  };

  const handleJsonImport = () => {
    const parsed = importConfigJSON(jsonText);
    if (!parsed) {
      setJsonError(t('templates.jsonInvalid'));
      return;
    }
    onLoad(parsed);
    onClose();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <BottomSheet onClose={onClose} ariaLabelledBy="template-title" maxWidth="max-w-md">
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        <h3 id="template-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('templates.title')}</h3>

        {/* Save current config as template */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('templates.saveCurrent')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={t('templates.namePlaceholder')}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700/60 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-ring)] transition-all duration-200"
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-accent-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            >
              {t('templates.save')}
            </button>
          </div>
          <button
            onClick={handleSaveToFile}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>↓</span> {t('templates.saveToFile')}
          </button>
          {!hasNativeSavePicker && (
            <p className="text-gray-300 dark:text-gray-600 text-[10px] leading-tight">
              {t('templates.saveHint')}
            </p>
          )}
        </div>

        {/* Template list header with file load button */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('templates.browserTemplates')}
          </label>
          <button
            onClick={handleLoadFromFile}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded text-xs font-medium transition-colors flex items-center gap-1"
          >
            <span>↑</span> {t('templates.loadFromFile')}
          </button>
        </div>

        {/* File error message */}
        {fileError && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-center">
            <p className="text-red-700 dark:text-red-300 text-xs font-medium">{t('templates.invalidFile')}</p>
          </div>
        )}

        {/* Template list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {templates.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">
              {t('templates.noTemplates')}
            </p>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700/20 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{tmpl.name}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    {formatDate(tmpl.createdAt)}
                    {' · '}
                    {t('templates.players', { n: tmpl.config.players.length })}
                    {' · '}
                    {t('templates.levels', { n: tmpl.config.levels.filter((l) => l.type === 'level').length })}
                  </p>
                </div>
                <button
                  onClick={() => handleLoad(tmpl)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-colors text-white"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  {t('templates.load')}
                </button>
                {confirmDeleteId === tmpl.id ? (
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                  >
                    {t('templates.yes')}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(tmpl.id)}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded text-xs font-medium transition-colors"
                  >
                    {t('templates.delete')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Collapsible JSON Import/Export */}
        <div className="border-t border-gray-200 dark:border-gray-700/40 pt-3">
          <button
            onClick={handleToggleJson}
            aria-expanded={showJson}
            className="w-full flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <span className="uppercase tracking-wider">{t('templates.jsonSection')}</span>
            <ChevronIcon open={showJson} className="text-gray-500 dark:text-gray-400" />
          </button>
          {showJson && (
            <div className="mt-2 space-y-2">
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
                className="w-full h-32 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[var(--accent-500)] resize-none"
                spellCheck={false}
              />
              {jsonError && <p className="text-red-400 text-xs">{jsonError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleJsonCopy}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-xs font-medium transition-colors"
                >
                  {t('templates.jsonCopy')}
                </button>
                <button
                  onClick={handleJsonImport}
                  className="px-3 py-1.5 bg-accent-700 text-white rounded text-xs font-medium transition-colors"
                >
                  {t('templates.jsonImport')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-all duration-200 border border-gray-300 dark:border-gray-600/30"
        >
          {t('templates.close')}
        </button>
      </div>
    </BottomSheet>
  );
}
