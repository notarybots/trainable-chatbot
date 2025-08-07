
/**
 * Utilities for cleaning up Vercel toolbar and other unwanted URL parameters
 */

'use client'

/**
 * List of URL parameters that should be removed to prevent interference
 */
const UNWANTED_PARAMS = [
  '__vercel_toolbar_code',
  '__vercel_toolbar',
  'vercel_toolbar_code', 
  'vercel_toolbar',
  '__vt',
  'vt',
  '__vercel_live_edit',
  'vercel_live_edit'
]

/**
 * Clean unwanted parameters from the current URL
 */
export function cleanCurrentUrl(): boolean {
  if (typeof window === 'undefined') return false
  
  const url = new URL(window.location.href)
  let hasUnwantedParams = false
  
  // Remove unwanted parameters
  UNWANTED_PARAMS.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param)
      hasUnwantedParams = true
    }
  })
  
  // If we removed parameters, update the URL without page reload
  if (hasUnwantedParams) {
    console.log('🧹 Cleaning unwanted parameters from client URL')
    window.history.replaceState({}, '', url.toString())
    return true
  }
  
  return false
}

/**
 * Clean unwanted parameters from a URL string
 */
export function cleanUrl(urlString: string): string {
  try {
    const url = new URL(urlString)
    
    UNWANTED_PARAMS.forEach(param => {
      url.searchParams.delete(param)
    })
    
    return url.toString()
  } catch (error) {
    console.warn('Failed to clean URL:', urlString, error)
    return urlString
  }
}

/**
 * Get clean search parameters without unwanted parameters
 */
export function getCleanSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  
  const params = new URLSearchParams(window.location.search)
  
  UNWANTED_PARAMS.forEach(param => {
    params.delete(param)
  })
  
  return params
}

/**
 * Hook to automatically clean URL on component mount
 */
export function useUrlCleanup() {
  if (typeof window !== 'undefined') {
    // Clean immediately
    cleanCurrentUrl()
    
    // Also clean on page load/visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cleanCurrentUrl()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}
