
'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { useTenant } from '@/lib/providers/tenant-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  LogOut, 
  Settings, 
  Building2,
  Loader2 
} from 'lucide-react'
import Link from 'next/link'

export function UserMenu() {
  const { user, loading, signOut, isAuthenticated } = useSupabase()
  const { tenant, loading: tenantLoading } = useTenant()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link href="/login">
          Sign In
        </Link>
      </Button>
    )
  }

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect will be handled by middleware
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Tenant Badge */}
      {tenant && !tenantLoading && (
        <Badge variant="outline" className="hidden sm:inline-flex">
          <Building2 className="h-3 w-3 mr-1" />
          {tenant.name}
        </Badge>
      )}

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
              <AvatarFallback>
                {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              {tenant && (
                <Badge variant="secondary" className="w-fit text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {tenant.name}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
