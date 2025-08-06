
'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { useTenant } from '@/lib/providers/tenant-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  User,
  Building2,
  Database
} from 'lucide-react'

interface AuthStatusProps {
  compact?: boolean
}

export function AuthStatus({ compact = false }: AuthStatusProps) {
  const { user, loading: authLoading, isAuthenticated } = useSupabase()
  const { tenant, loading: tenantLoading } = useTenant()

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {authLoading || tenantLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Loading...</span>
          </>
        ) : isAuthenticated ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Connected</span>
            {tenant && (
              <Badge variant="outline" className="ml-2">
                {tenant.name}
              </Badge>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-600">Not Connected</span>
          </>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Authentication Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Authentication</span>
            </div>
            {authLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Checking...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Authenticated</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Not Authenticated</span>
              </div>
            )}
          </div>

          {/* User Email */}
          {isAuthenticated && user && (
            <div className="text-xs text-gray-600 ml-6">
              {user.email}
            </div>
          )}

          {/* Tenant Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Tenant</span>
            </div>
            {tenantLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : tenant ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge variant="secondary" className="text-xs">
                  {tenant.name}
                </Badge>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">No Tenant</span>
              </div>
            ) : null}
          </div>

          {/* Database Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
