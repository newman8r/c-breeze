import { useState, useCallback, useEffect } from 'react';
import { FiUpload, FiTrash2, FiSearch, FiSettings, FiRefreshCw, FiFile, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './RagPanel.module.css';
import RagSettings from './RagSettings';

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

interface RagSettings {
  id: string;
  chunk_size: number;
  chunk_overlap: number;
  embedding_model: string;
  last_rebuild_at: string | null;
  total_chunks: number;
  status: 'up_to_date' | 'needs_rebuild' | 'not_built';
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  content: string
  similarity: number
  document: {
    id: string
    name: string
    description: string
  }
}

interface RagQueryResponse {
  answer: string
  error?: string
}

const MultiAgentTest = () => {
  const [inquiry, setInquiry] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('Test Customer') // Default name for testing
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  const handleTest = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get the organization ID
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('organization_id')
        .single()

      if (employeeError || !employeeData?.organization_id) {
        throw new Error('Could not determine organization')
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ticket-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          customerInquiry: inquiry,
          customerEmail,
          customerName,
          organizationId: employeeData.organization_id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze inquiry')
      }

      const data = await response.json()
      setResult(data.state)
    } catch (err) {
      console.error('Error testing multi-agent system:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h3>Multi-Agent System Test</h3>
      <div className={styles.inputGroup}>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="Customer email address..."
          className={styles.input}
        />
        <textarea
          value={inquiry}
          onChange={(e) => setInquiry(e.target.value)}
          placeholder="Enter customer inquiry to test the multi-agent system..."
          className={styles.textarea}
          rows={4}
        />
        <button
          onClick={handleTest}
          disabled={loading || !inquiry.trim() || !customerEmail.trim()}
          className={styles.button}
        >
          {loading ? 'Processing...' : 'Test Multi-Agent System'}
        </button>
      </div>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      {result && (
        <div className={styles.result}>
          <h4>Analysis Result:</h4>
          <pre className={styles.pre}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
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
  const [ragSettings, setRagSettings] = useState<RagSettings | null>(null);
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [queryInput, setQueryInput] = useState('')
  const [queryResult, setQueryResult] = useState<RagQueryResponse | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)

  const supabase = createClientComponentClient();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-rag-settings');
      if (error) throw error;
      setRagSettings(data.settings);
    } catch (error) {
      console.error('Error fetching RAG settings:', error);
    }
  }, [supabase]);

  // Set up real-time subscription for rag_settings
  useEffect(() => {
    // First get the organization ID
    const getOrgAndSubscribe = async () => {
      try {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('organization_id')
          .single();

        if (!employeeData?.organization_id) return;

        // Subscribe to changes in rag_settings for our organization
        const subscription = supabase
          .channel('rag_settings_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'rag_settings',
              filter: `organization_id=eq.${employeeData.organization_id}`,
            },
            (payload) => {
              console.log('RAG settings changed:', payload);
              // Update our local state with the new settings
              if (payload.new) {
                setRagSettings(payload.new as RagSettings);
              }
            }
          )
          .subscribe();

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    getOrgAndSubscribe();
  }, [supabase]);

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

  // Fetch documents and settings on mount and after successful upload
  useEffect(() => {
    fetchDocuments();
    fetchSettings();
  }, [fetchDocuments, fetchSettings]);

  const stats = {
    totalFiles: documents.length,
    totalChunks: ragSettings?.total_chunks ?? documents.reduce((acc, file) => acc + (file.chunks || 0), 0),
    lastRebuild: ragSettings?.last_rebuild_at ?? null,
    dbStatus: ragSettings?.status ?? 'not_built',
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
      case 'needs_rebuild':
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

  const handleDeleteFile = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-rag-document', {
        body: { documentId: id }
      })

      if (error) throw error

      // Refresh documents and settings
      await Promise.all([fetchDocuments(), fetchSettings()])
    } catch (error) {
      console.error('Error deleting document:', error)
      // You might want to show an error toast here
    }
  }

  const handleTestSearch = async () => {
    if (!testQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])

    try {
      // Get organization ID first
      const { data: employeeData } = await supabase
        .from('employees')
        .select('organization_id')
        .single()

      if (!employeeData?.organization_id) {
        throw new Error('Could not determine organization')
      }

      const { data, error } = await supabase.functions.invoke('search-rag-documents', {
        body: { 
          query: testQuery, 
          limit: 5,
          organization_id: employeeData.organization_id
        }
      })

      if (error) throw error
      setSearchResults(data.results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchError(error instanceof Error ? error.message : 'Failed to perform search')
    } finally {
      setIsSearching(false)
    }
  }

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

        // Mark as success
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: 'success' } : f
          )
        );

        // Update RAG settings status to needs_rebuild
        await supabase
          .from('rag_settings')
          .update({ status: 'needs_rebuild' })
          .eq('organization_id', uploadData.document.organization_id)

        // Fetch updated document list and settings
        await Promise.all([fetchDocuments(), fetchSettings()]);

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
      'text/plain': ['.txt']
    },
  });

  const handleQuery = async () => {
    if (!queryInput.trim()) return
    
    setIsQuerying(true)
    setQueryResult(null)
    
    try {
      // Get organization ID first
      const { data: employeeData } = await supabase
        .from('employees')
        .select('organization_id')
        .single()

      if (!employeeData?.organization_id) {
        throw new Error('Could not determine organization')
      }

      const { data, error } = await supabase.functions.invoke<RagQueryResponse>('rag-query', {
        body: { 
          query: queryInput,
          organization_id: employeeData.organization_id 
        }
      })
      
      if (error) throw error
      setQueryResult(data)
    } catch (error) {
      console.error('Query error:', error)
      setQueryResult({ answer: '', error: error instanceof Error ? error.message : 'Failed to query' })
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className={styles.ragPanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>RAG System Management 🧠</h2>
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
              {stats.lastRebuild 
                ? new Date(stats.lastRebuild).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Never'}
            </span>
            <span className={styles.statSubtext}>
              {stats.lastRebuild 
                ? new Date(stats.lastRebuild).toLocaleDateString()
                : 'No rebuilds yet'}
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
        <RagSettings />
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
                Supported formats: TXT
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
                <div className={styles.uploadItemContent}>
                  <div className={styles.uploadItemHeader}>
                    <FiFile className="text-gray-500" />
                    <span className="font-medium">{file.file.name}</span>
                    {file.status === 'success' && (
                      <FiCheckCircle className="text-emerald-500" />
                    )}
                    {file.status === 'error' && (
                      <FiAlertCircle className="text-red-500" />
                    )}
                  </div>
                  
                  {file.status === 'uploading' && (
                    <>
                      <div className={styles.uploadProgress}>
                        <div
                          className={styles.uploadProgressBar}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <div className={styles.uploadItemMessage}>
                        Uploading... {file.progress.toFixed(0)}%
                      </div>
                    </>
                  )}
                  
                  {file.status === 'error' && (
                    <div className={`${styles.uploadItemMessage} ${styles.error}`}>
                      {file.error}
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className={`${styles.uploadItemMessage} ${styles.success}`}>
                      <FiCheckCircle />
                      <span>Successfully uploaded! View the file in the Managed Files section below.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {uploadingFiles.some(f => f.status === 'success') && (
              <div className="mt-4 text-center text-sm text-gray-600">
                ✨ You can upload more files using the drop zone above
              </div>
            )}
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
                  <div className={styles.triangleDecoration} />
                  <div className={styles.squareDecoration} />
                  <div className={styles.fileCardContent}>
                    <div className={styles.fileHeader}>
                      <div>
                        <h4 className={styles.fileName}>{doc.name}</h4>
                        <p className={styles.fileDescription}>{doc.description}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(doc.id)}
                        className={styles.deleteButton}
                        aria-label="Delete document"
                      >
                        <FiTrash2 />
                      </button>
                    </div>

                    <div className={styles.statusIndicator}>
                      <span className={`${styles.statusDot} ${styles[doc.status]}`} />
                      <span className="text-sm capitalize">{doc.status}</span>
                    </div>

                    <div className={styles.fileStats}>
                      <span className={styles.statBadge}>
                        <FiFile className="text-gray-500" />
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </span>
                      {doc.chunks > 0 && (
                        <span className={styles.statBadge}>
                          🧩 {doc.chunks} chunks
                        </span>
                      )}
                      {doc.processedAt && (
                        <span className={styles.statBadge}>
                          ✨ Processed {new Date(doc.processedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {doc.errorMessage && (
                      <p className="text-sm text-red-600 mt-3 bg-red-50/50 p-2 rounded-lg">
                        {doc.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className={styles.settingsSection}>
        <h3 className="text-lg font-semibold mb-4">Test Vector Search 🔍</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter a test query..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className={styles.searchBox}
            onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
          />
          <button
            onClick={handleTestSearch}
            className={`${styles.searchButton} ${isSearching ? styles.searching : ''}`}
            disabled={isSearching || !testQuery.trim()}
          >
            {isSearching ? (
              <div className={styles.searchingSpinner} />
            ) : (
              <FiSearch className="w-5 h-5" />
            )}
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchError ? (
          <div className="bg-red-50/50 text-red-600 p-4 rounded-lg mt-4">
            <p>{searchError}</p>
            <button
              onClick={handleTestSearch}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-4 mt-4">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`${styles.resultCard} bg-gradient-to-br from-blue-50/80 to-blue-100/50 backdrop-blur-sm`}
              >
                <div className={styles.resultHeader}>
                  <div className={styles.resultMeta}>
                    <h4 className={styles.resultTitle}>
                      {result.document.name}
                    </h4>
                    {result.document.description && (
                      <p className={styles.resultDescription}>
                        {result.document.description}
                      </p>
                    )}
                  </div>
                  <div className={styles.resultScore}>
                    {(result.similarity * 100).toFixed(1)}% match
                  </div>
                </div>
                <div className={styles.resultContent}>
                  {result.content}
                </div>
              </div>
            ))}
          </div>
        ) : testQuery && !isSearching && (
          <div className="text-center py-8 text-gray-500">
            <p>No matching results found</p>
            <p className="text-sm">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      <div className={`${styles.section} ${styles.card}`}>
        <h2>Test RAG Query</h2>
        <p className={styles.description}>
          Test the RAG system by asking questions about your uploaded documents.
        </p>
        
        <div className={styles.queryInputWrapper}>
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className={styles.queryInput}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying || !queryInput.trim()}
            className={styles.queryButton}
          >
            {isQuerying ? 'Querying...' : 'Ask'}
          </button>
        </div>

        {queryResult && (
          <div className={styles.queryResult}>
            {queryResult.error ? (
              <div className={styles.queryError}>
                Error: {queryResult.error}
              </div>
            ) : (
              <div className={styles.queryAnswer}>
                <h3>Answer:</h3>
                <p>{queryResult.answer}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <MultiAgentTest />
    </div>
  );
} 
