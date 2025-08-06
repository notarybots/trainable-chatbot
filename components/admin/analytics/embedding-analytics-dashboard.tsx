
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  TrendingUp, 
  RefreshCw, 
  Activity,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react'

interface ProcessingStats {
  total_entries: number
  entries_with_embeddings: number
  entries_without_embeddings: number
  models_used: Record<string, number>
  last_processed: string | null
  completion_rate: number
}

interface EmbeddingJob {
  id: string
  model_id: string
  status: string
  progress: number
  total_items: number
  processed_items: number
  created_at: string
  updated_at: string
  metadata?: any
}

export function EmbeddingAnalyticsDashboard() {
  const [stats, setStats] = useState<ProcessingStats | null>(null)
  const [jobs, setJobs] = useState<EmbeddingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tenantId] = useState<string | null>(null) // Could be dynamic based on context

  useEffect(() => {
    loadAnalytics()
    const interval = setInterval(loadAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [tenantId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Load processing stats
      const statsResponse = await fetch('/api/admin/batch-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stats',
          tenantId
        })
      })
      
      if (statsResponse.ok) {
        const { stats } = await statsResponse.json()
        setStats(stats)
      }

      // Load recent jobs
      const params = new URLSearchParams()
      if (tenantId) params.append('tenantId', tenantId)
      params.append('limit', '10')
      
      const jobsResponse = await fetch(`/api/admin/embedding-jobs?${params.toString()}`)
      if (jobsResponse.ok) {
        const { jobs } = await jobsResponse.json()
        setJobs(jobs)
      }

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadAnalytics()
  }

  const handleProcessAll = async () => {
    try {
      const response = await fetch('/api/admin/batch-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_all',
          tenantId
        })
      })

      if (response.ok) {
        const { jobId } = await response.json()
        alert(`Processing job started: ${jobId}`)
        setTimeout(loadAnalytics, 2000) // Refresh after starting job
      } else {
        throw new Error('Failed to start processing job')
      }
    } catch (error) {
      console.error('Error starting processing:', error)
      alert('Failed to start processing job')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Embedding Analytics</h2>
          <p className="text-gray-600">Monitor embedding processing and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleProcessAll}>
            <Zap className="h-4 w-4 mr-2" />
            Process All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.total_entries}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">With Embeddings</p>
                <p className="text-2xl font-bold">{stats.entries_with_embeddings}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Without Embeddings</p>
                <p className="text-2xl font-bold">{stats.entries_without_embeddings}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{stats.completion_rate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Overview */}
      {stats && stats.completion_rate < 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Processing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Completion</span>
                <span>{stats.completion_rate}%</span>
              </div>
              <Progress value={stats.completion_rate} className="h-2" />
              <p className="text-xs text-gray-600">
                {stats.entries_with_embeddings} of {stats.total_entries} entries processed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Distribution */}
      {stats && Object.keys(stats.models_used).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Model Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.models_used).map(([modelId, count]) => {
                const percentage = Math.round((count / stats.entries_with_embeddings) * 100)
                return (
                  <div key={modelId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{modelId}</span>
                      <span>{count} entries ({percentage}%)</span>
                    </div>
                    <Progress value={percentage} className="h-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{job.model_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{job.processed_items} / {job.total_items} items</span>
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{job.progress}%</div>
                    <Progress value={job.progress} className="h-1 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
