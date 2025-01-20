import './globals.css'
import { UserProvider } from '@/contexts/UserContext'
import { RoleProvider } from '@/contexts/RoleContext'

export const metadata = {
  title: 'Ocean Breeze Demo',
  description: 'A peaceful, ocean-themed demo app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </UserProvider>
      </body>
    </html>
  )
}
