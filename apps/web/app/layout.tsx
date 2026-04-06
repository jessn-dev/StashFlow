import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Force the custom DaisyUI theme here
    <html lang="en" data-theme="fintrack">
      <body className="antialiased bg-brand-bg text-brand-text">
        {children}
      </body>
    </html>
  )
}