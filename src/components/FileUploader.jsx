import { useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import { DEFAULT_MAX_FILE_SIZE_BYTES, formatFileSize } from '../utils/fileUtils.js';

export function FileUploader({ onFileSelect, fileMeta, documentFormat, onChangeFormat }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer?.files);
        }}
      >
        <div className="dropzone-info">
          <span className="dropzone-icon" aria-hidden="true">
            <UploadCloud size={20} />
          </span>
          <div>
            <div className="dropzone-title">Drag &amp; drop a .txt or .csv file here</div>
            <div className="dropzone-sub">
              Max {formatFileSize(DEFAULT_MAX_FILE_SIZE_BYTES)} · Processed strictly in browser memory
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="sr-only"
            aria-label="Browse text or CSV file"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </button>
        </div>
      </div>

      <div className="file-meta-bar" style={{ marginTop: '0.65rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {fileMeta?.name ? (
            <span className="badge-pill">
              <FileText size={13} aria-hidden="true" />
              <span>
                {fileMeta.name} ({formatFileSize(fileMeta.size)})
              </span>
            </span>
          ) : (
            <span>No file loaded — paste text below or browse a file.</span>
          )}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Parse mode:</span>
          <button
            type="button"
            className={`btn btn-sm ${documentFormat === 'txt' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeFormat('txt')}
            aria-pressed={documentFormat === 'txt'}
          >
            TXT
          </button>
          <button
            type="button"
            className={`btn btn-sm ${documentFormat === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeFormat('csv')}
            aria-pressed={documentFormat === 'csv'}
          >
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
