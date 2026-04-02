import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Clean body tag, no suppressHydrationWarning */}
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}