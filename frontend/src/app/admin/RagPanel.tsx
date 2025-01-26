import { useState } from 'react';
import { FiUpload, FiTrash2, FiSearch, FiSettings, FiRefreshCw } from 'react-icons/fi';
import styles from './RagPanel.module.css';

interface RagFile {
  id: string;
  name: string;
  description: string;
  status: 'processed' | 'processing' | 'error';
  chunks: number;
  lastUpdated: string;
}

export default function RagPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlapSize, setOverlapSize] = useState(50);
  const [selectedModel, setSelectedModel] = useState('text-embedding-3-small');
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  // Mock data - will be replaced with real data from Supabase
  const mockFiles: RagFile[] = [
    {
      id: '1',
      name: 'documentation.md',
      description: 'Main product documentation',
      status: 'processed',
      chunks: 45,
      lastUpdated: '2024-01-25T12:00:00Z',
    },
    {
      id: '2',
      name: 'api_reference.md',
      description: 'API endpoints and usage guide',
      status: 'processing',
      chunks: 30,
      lastUpdated: '2024-01-25T11:30:00Z',
    },
  ];

  const stats = {
    totalFiles: mockFiles.length,
    totalChunks: mockFiles.reduce((acc, file) => acc + file.chunks, 0),
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

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Managed Files 📚</h3>
          <button
            onClick={handleFileUpload}
            className={styles.uploadButton}
          >
            <FiUpload /> Upload File
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchBox}
        />

        <div className={styles.fileList}>
          {mockFiles.map((file) => (
            <div key={file.id} className={styles.fileCard}>
              <div>
                <h4 className="font-medium">{file.name}</h4>
                <p className="text-sm text-gray-600">{file.description}</p>
                <div className="mt-1">
                  <div className={styles.statusIndicator}>
                    <span className={`${styles.statusDot} ${styles[file.status]}`} />
                    <span className="text-sm capitalize">{file.status}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {file.chunks} chunks
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className={styles.deleteButton}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
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
