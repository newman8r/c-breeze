import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/utils/supabase'
import { FiRefreshCw } from 'react-icons/fi'
import styles from './RagSettings.module.css'

interface RagSettings {
  id: string
  chunk_size: number
  chunk_overlap: number
  embedding_model: string
  last_rebuild_at: string | null
  total_chunks: number
  status: 'up_to_date' | 'needs_rebuild' | 'not_built'
  created_at: string
  updated_at: string
}

export default function RagSettings() {
  const [settings, setSettings] = useState<RagSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  // Form state
  const [chunkSize, setChunkSize] = useState<number>(500)
  const [chunkOverlap, setChunkOverlap] = useState<number>(50)
  const [embeddingModel, setEmbeddingModel] = useState<string>('text-embedding-3-small')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-rag-settings')
      if (error) throw error

      setSettings(data.settings)
      // Update form state
      setChunkSize(data.settings.chunk_size)
      setChunkOverlap(data.settings.chunk_overlap)
      setEmbeddingModel(data.settings.embedding_model)
    } catch (err) {
      setError('Failed to load settings')
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRebuildIndex = async () => {
    setError(null)
    setSuccess(null)
    setRebuilding(true)

    try {
      const { error } = await supabase.functions.invoke('process-rag-documents', {
        body: { rebuild: true }
      })
      if (error) throw error

      setSuccess('Vector database rebuilt successfully')
      fetchSettings() // Refresh settings to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rebuild vector database')
      console.error('Error rebuilding index:', err)
    } finally {
      setRebuilding(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const { data, error } = await supabase.functions.invoke('update-rag-settings', {
        body: {
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
          embedding_model: embeddingModel
        }
      })

      if (error) throw error

      setSettings(data.settings)
      setSuccess('Settings updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      console.error('Error updating settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'up_to_date':
        return styles.upToDate
      case 'needs_rebuild':
        return styles.needsRebuild
      case 'not_built':
        return styles.notBuilt
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className={styles.settingsCard}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className={styles.settingsCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={styles.settingsHeader}>
        <h2 className={styles.settingsTitle}>RAG System Settings</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="chunkSize" className={styles.label}>
              Chunk Size
            </label>
            <input
              id="chunkSize"
              type="number"
              min="100"
              max="2000"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value))}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="chunkOverlap" className={styles.label}>
              Chunk Overlap
            </label>
            <input
              id="chunkOverlap"
              type="number"
              min="0"
              max={chunkSize}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="embeddingModel" className={styles.label}>
              Embedding Model
            </label>
            <select
              id="embeddingModel"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              className={styles.select}
              required
            >
              <option value="text-embedding-3-small">text-embedding-3-small</option>
              <option value="text-embedding-3-large">text-embedding-3-large</option>
            </select>
          </div>
        </div>

        {settings && (
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <p>Last rebuilt: {settings.last_rebuild_at ? new Date(settings.last_rebuild_at).toLocaleString() : 'Never'}</p>
            <p>Total chunks: {settings.total_chunks}</p>
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <div className="flex items-center justify-between gap-4 mt-3">
          <div className={styles.infoBox}>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📏</span>
                <span><strong>Chunk Size:</strong> Characters per chunk. Larger = more context, more tokens</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🔄</span>
                <span><strong>Overlap:</strong> Shared characters between chunks for context</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🧠</span>
                <span><strong>Model:</strong> Larger models = better accuracy, slower speed</span>
              </div>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleRebuildIndex}
              disabled={rebuilding}
              className={styles.rebuildButton}
            >
              {rebuilding ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                  </motion.span>
                  {' Processing...'}
                </>
              ) : (
                <>
                  <FiRefreshCw className="w-4 h-4" />
                  {' Rebuild Index'}
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full"
                />
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </form>

      <div className={styles.wavyDecoration} />
    </motion.div>
  )
} 
