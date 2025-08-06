
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'
import { 
  Settings, 
  Home
} from 'lucide-react'

export function AdminNavigation() {
  const pathname = usePathname()
  
  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home
    },
    {
      href: '/admin/settings',
      label: 'AI Settings',
      icon: Settings
    }
  ]

  return (
    <nav className="flex items-center gap-4">
      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-2">
        {navItems.map(({ href, label, icon: Icon }) => (
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
