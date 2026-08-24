import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import ReactQueryProvider from "@/components/ReactQueryProvider";


const inter = Inter({subsets: ["latin"]});

export const metadata = {
  title: "Sensai - AI Career Coach",
  description: "AI-powered career coaching platform",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
      <ClerkProvider 
        appearance={{
          baseTheme: dark,
        }}
      >
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className}`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ReactQueryProvider>
              {/* header */}
              <Header />
              <main className="min-h-screen">{children}</main>
              <Toaster richColors />

              {/*footer*/}
              <footer className="bg-muted/50 py-12">
                <div className="container mx-auto px-12 text-center text-gray-200">
                  <p>Made By MJ</p>
                </div>
              </footer>
            </ReactQueryProvider>
          </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
