

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Settings, 
  Home,
  Shield
} from 'lucide-react'

export function AdminNavigation() {
  const pathname = usePathname()
  const { loading, isAuthenticated, user } = useSupabase()
  
  // Navigation items with role-based access
  const getNavItems = () => {
    const baseItems = [
      {
        href: '/',
        label: 'Home',
        icon: Home,
        requireAuth: true
      }
    ]

    // Add admin items if user has admin role
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'
    
    if (isAdmin) {
      baseItems.push({
        href: '/admin/settings',
        label: 'AI Settings',
        icon: Settings,
        requireAuth: true
      })
    }

    return baseItems
  }

  // Show loading skeleton
  if (loading) {
    return (
      <nav className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </nav>
    )
  }

  // Show login button for unauthenticated users
  if (!isAuthenticated) {
    return (
      <nav className="flex items-center gap-4">
        <Button asChild size="sm">
          <Link href="/login">
            <Shield className="h-4 w-4 mr-2" />
            Sign In
          </Link>
        </Button>
      </nav>
    )
  }

  const navItems = getNavItems()

  return (
    <nav className="flex items-center gap-4">
      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-2">
        {navItems
          .filter(item => !item.requireAuth || isAuthenticated)
          .map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={pathname === href ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            </Button>
          ))}
      </div>

      {/* User Menu */}
      <UserMenu />
    </nav>
  )
}
