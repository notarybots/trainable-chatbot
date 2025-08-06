
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Database, 
  Bot, 
  BarChart3,
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
    <nav className="flex items-center gap-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Button
          key={href}
          variant={pathname === href ? 'default' : 'outline'}
          size="sm"
          asChild
        >
          <Link href={href} className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
