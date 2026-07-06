import { useState } from 'react'

const DISMISS_KEY = 'gym-tracker:installHintDismissed'

function shouldShow(): boolean {
  if (localStorage.getItem(DISMISS_KEY)) return false
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  return isIos && !isStandalone
}

/**
 * iOS Safari evicts site data after 7 days of inactivity, but installed
 * home-screen apps are exempt — so installing is a data-safety measure here,
 * not just a convenience.
 */
export default function InstallHint() {
  const [visible, setVisible] = useState(shouldShow)
  if (!visible) return null
  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p className="flex-1">
        Install this app: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. This
        keeps your data safe from Safari's automatic cleanup and lets the app work offline.
      </p>
      <button
        className="font-medium underline"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setVisible(false)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
