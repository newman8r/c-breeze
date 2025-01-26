import { useState, useCallback, useEffect } from 'react';
import { FiUpload, FiTrash2, FiSearch, FiSettings, FiRefreshCw, FiFile, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './RagPanel.module.css';

interface RagFile {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  chunks: number;
  lastUpdated: string;
  fileType: string;
  fileSize: number;
  processedAt?: string;
  errorMessage?: string;
  metadata: Record<string, any>;
}

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function RagPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlapSize, setOverlapSize] = useState(50);
  const [selectedModel, setSelectedModel] = useState('text-embedding-3-small');
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<RagFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const { data, error } = await supabase.functions.invoke('list-rag-documents');
      
      if (error) throw error;
      
      setDocuments(data.documents);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Fetch documents on mount and after successful upload
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const stats = {
    totalFiles: documents.length,
    totalChunks: documents.reduce((acc, file) => acc + file.chunks, 0),
    lastRebuild: '2024-01-25 12:00 PM',
    dbStatus: 'up_to_date' as 'up_to_date' | 'needs_update' | 'not_built',
  };

  // Helper function to get DB status display info
  const getDbStatusInfo = (status: typeof stats.dbStatus) => {
    switch (status) {
      case 'up_to_date':
        return {
          label: 'Up to Date',
          icon: '✨',
          className: styles.upToDate,
          description: 'Vector database is current with all documents'
        };
      case 'needs_update':
        return {
          label: 'Needs Update',
          icon: '⚠️',
          className: styles.needsUpdate,
          description: 'Some documents need to be processed'
        };
      case 'not_built':
        return {
          label: 'Not Built',
          icon: '🚫',
          className: styles.notBuilt,
          description: 'Vector database has not been initialized'
        };
    }
  };

  const handleFileUpload = () => {
    // Will implement file upload logic
    console.log('File upload clicked');
  };

  const handleDeleteFile = (id: string) => {
    // Will implement file deletion logic
    console.log('Delete file:', id);
  };

  const handleTestSearch = () => {
    // Will implement vector search test
    setTestResults([
      'Result 1: Matching content from documentation...',
      'Result 2: Another relevant match...',
    ]);
  };

  const handleRebuildIndex = () => {
    // Will implement index rebuild logic
    console.log('Rebuilding index...');
  };

  const handleUpload = async (files: File[]) => {
    const newFiles = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    for (const uploadFile of newFiles) {
      try {
        // Get upload URL from Edge Function
        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-rag-document', {
          body: {
            fileName: uploadFile.file.name,
            fileType: uploadFile.file.type,
            fileSize: uploadFile.file.size,
            description: `Uploaded via RAG Panel`,
          },
        });

        if (uploadError) throw uploadError;

        // Upload file using signed URL
        const { error: storageError } = await supabase.storage
          .from('rag_documents')
          .upload(uploadData.path, uploadFile.file, {
            upsert: true,
            onUploadProgress: (progress: UploadProgress) => {
              const percent = (progress.loaded / progress.total) * 100;
              setUploadingFiles(prev =>
                prev.map(f =>
                  f.id === uploadFile.id ? { ...f, progress: percent } : f
                )
              );
            },
          } as any);

        if (storageError) throw storageError;

        // Mark as success and fetch updated document list
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: 'success' } : f
          )
        );

        // Fetch updated document list
        await fetchDocuments();

        // Clean up successful uploads after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadFile.id));
        }, 3000);

      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
      }
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleUpload(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  return (
    <div className={styles.ragPanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>RAG System Management 🧠</h2>
        <button
          onClick={handleRebuildIndex}
          className={styles.uploadButton}
        >
          <FiRefreshCw /> Rebuild Index
        </button>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>
              📚 Total Files
            </span>
            <span className={styles.statValue}>{stats.totalFiles}</span>
            <span className={styles.statSubtext}>Documents in system</span>
          </div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>
              🧩 Total Chunks
            </span>
            <span className={styles.statValue}>{stats.totalChunks}</span>
            <span className={styles.statSubtext}>Embedded text segments</span>
          </div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>
              🕒 Last Rebuild
            </span>
            <span className={styles.statValue}>
              {new Date(stats.lastRebuild).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={styles.statSubtext}>
              {new Date(stats.lastRebuild).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className={`${styles.statsCard} ${styles.dbStatusCard}`}>
          {/* Status Badge */}
          <div className={`${styles.dbStatusBadge} ${getDbStatusInfo(stats.dbStatus).className}`}>
            <span>{getDbStatusInfo(stats.dbStatus).icon}</span>
            <span>{getDbStatusInfo(stats.dbStatus).label}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>
              🔮 Vector DB Status
            </span>
            <span className={styles.dbStatusIcon}>
              {getDbStatusInfo(stats.dbStatus).icon}
            </span>
            <span className={styles.statSubtext}>
              {getDbStatusInfo(stats.dbStatus).description}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className="text-lg font-semibold mb-4">Configuration ⚙️</h3>
        <div className={styles.configSection}>
          <div className={styles.configCard}>
            <label className="block mb-2">Chunk Size (tokens)</label>
            <input
              type="range"
              min="100"
              max="2000"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.helpText}>Current: {chunkSize} tokens</span>
          </div>
          <div className={styles.configCard}>
            <label className="block mb-2">Chunk Overlap</label>
            <input
              type="range"
              min="0"
              max="200"
              value={overlapSize}
              onChange={(e) => setOverlapSize(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.helpText}>Current: {overlapSize} tokens</span>
          </div>
        </div>
        <div className="mt-4">
          <label className="block mb-2">Embedding Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 rounded-lg bg-white/50 border border-gray-200"
          >
            <option value="text-embedding-3-small">text-embedding-3-small (OpenAI)</option>
            <option value="text-embedding-3-large">text-embedding-3-large (OpenAI)</option>
            <option value="bge-small-en">bge-small-en (BAAI)</option>
            <option value="bge-base-en">bge-base-en (BAAI)</option>
          </select>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className="text-lg font-semibold mb-4">Upload Documents 📄</h3>
        
        <div 
          {...getRootProps()} 
          className={`${styles.uploadZone} ${isDragging ? styles.isDragging : ''}`}
        >
          <input {...getInputProps()} className={styles.uploadInput} />
          <div className={styles.uploadContent}>
            <FiUpload className={styles.uploadIcon} />
            <div className={styles.uploadText}>
              <p className="font-medium">Drop files here or click to upload</p>
              <p className="text-sm text-gray-500">
                Supported formats: TXT, MD, PDF, JSON, CSV, DOCX
              </p>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className={styles.uploadList}>
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className={`${styles.uploadItem} ${styles[file.status]}`}
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <FiFile className="text-gray-500" />
                    <span className="font-medium">{file.file.name}</span>
                    {file.status === 'success' && (
                      <FiCheckCircle className="text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <FiAlertCircle className="text-red-500" />
                    )}
                  </div>
                  {file.status === 'uploading' && (
                    <div className={styles.uploadProgress}>
                      <div
                        className={styles.uploadProgressBar}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === 'error' && (
                    <div className={styles.uploadError}>{file.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.settingsSection}>
        <h3 className="text-lg font-semibold mb-4">Managed Files 📚</h3>
        
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchBox}
        />

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : loadError ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            <p>Error loading documents: {loadError}</p>
            <button
              onClick={fetchDocuments}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents uploaded yet</p>
            <p className="text-sm">Upload your first document to get started</p>
          </div>
        ) : (
          <div className={styles.fileList}>
            {documents
              .filter(doc => 
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((doc) => (
                <div key={doc.id} className={styles.fileCard}>
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                    <div className="mt-1">
                      <div className={styles.statusIndicator}>
                        <span className={`${styles.statusDot} ${styles[doc.status]}`} />
                        <span className="text-sm capitalize">{doc.status}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {doc.chunks} chunks
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      {doc.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">{doc.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(doc.id)}
                    className={styles.deleteButton}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className={styles.settingsSection}>
        <h3 className="text-lg font-semibold mb-4">Test Vector Search 🔍</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter a test query..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className={styles.searchBox}
          />
          <button
            onClick={handleTestSearch}
            className={styles.uploadButton}
          >
            <FiSearch /> Search
          </button>
        </div>
        {testResults.length > 0 && (
          <div className={styles.testResults}>
            {testResults.map((result, index) => (
              <div key={index} className="mb-2 last:mb-0">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
