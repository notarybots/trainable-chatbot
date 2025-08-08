
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTenantContext } from '@/lib/providers/tenant-provider'
import { AlertCircle, CheckCircle, GitBranch, Database, Globe } from 'lucide-react'

export function TenantDebugPanel() {
  const tenantContext = useTenantContext()

  if (tenantContext.loading) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Loading tenant context...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusIcon = tenantContext.error ? 
    <AlertCircle className="h-4 w-4 text-red-500" /> : 
    <CheckCircle className="h-4 w-4 text-green-500" />

  const statusColor = tenantContext.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'

  return (
    <Card className={`fixed bottom-4 right-4 w-80 z-50 ${statusColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {statusIcon}
          Tenant Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium">Environment:</span>
          <Badge variant={tenantContext.isPreview ? 'secondary' : 'default'}>
            {tenantContext.isPreview ? 'Preview' : 'Production'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium">Tenant ID:</span>
          <span className="font-mono text-xs break-all">
            {tenantContext.tenantId || 'N/A'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium">Subdomain:</span>
          <span className="font-mono">{tenantContext.tenantSubdomain}</span>
        </div>
        
        {tenantContext.tenantName && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Name:</span>
            <span>{tenantContext.tenantName}</span>
          </div>
        )}
        
        {tenantContext.branchName && (
          <div className="flex items-center gap-2">
            <GitBranch className="h-3 w-3" />
            <span className="font-mono text-xs">{tenantContext.branchName}</span>
          </div>
        )}
        
        {tenantContext.error && (
          <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs font-medium">Error:</span>
            </div>
            <p className="text-xs mt-1">{tenantContext.error}</p>
          </div>
        )}
        
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-gray-600">
            <Database className="h-3 w-3" />
            <span className="text-xs">Tenant isolation active</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 mt-1">
            <Globe className="h-3 w-3" />
            <span className="text-xs">Data separated by branch</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
