'use client'

declare global {
  interface Window {
    Paddle?: {
      Initialize: (options: { token: string; environment?: string }) => void
      Checkout: {
        open: (options: { items: { priceId: string; quantity: number }[] }) => void
      }
    }
  }
}

let paddleInitialized = false

export function isPaddleConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
}

export async function initPaddle(): Promise<{ configured: boolean }> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
  if (!token) return { configured: false }
  if (paddleInitialized && window.Paddle) return { configured: true }

  return new Promise((resolve) => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token,
        environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
      })
      paddleInitialized = true
      resolve({ configured: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token,
          environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
        })
        paddleInitialized = true
        resolve({ configured: true })
      } else {
        resolve({ configured: false })
      }
    }
    script.onerror = () => resolve({ configured: false })
    document.head.appendChild(script)
  })
}

export function openCheckout(priceId: string): void {
  if (!window.Paddle) {
    console.warn('Paddle not initialized')
    return
  }
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
  })
}
