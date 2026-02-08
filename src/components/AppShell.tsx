import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Ticket, 
  Files, 
  LogOut, 
  Shield, 
  Menu,
  X,
  User as UserIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/badge'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { signOut, user, gatewayUser } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Audits', icon: ClipboardCheck, path: '/audits' },
    { label: 'Tickets', icon: Ticket, path: '/tickets' },
    { label: 'Deliverables', icon: Files, path: '/deliverables' },
  ]

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  return (
    <div 
      className="flex h-screen bg-background overflow-hidden spotlight" 
      onMouseMove={handleMouseMove}
      style={{ '--x': `${mousePos.x}px`, '--y': `${mousePos.y}px` } as React.CSSProperties}
    >
      {/* Corner Glows */}
      <div className="fixed -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-slate-900/40 backdrop-blur-xl z-20">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2Fxfd74AsMdZSB0UOLkbkA9ZsLJzU2%2Fsentinallogo__b6449232.png?alt=media&token=78cad279-9a65-4377-a904-96b381aa030e" 
                alt="Sentinel Logo" 
                className="w-6 h-6 object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-[0.1em] text-white">SENTINEL</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                pathname.startsWith(item.path) 
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] border border-primary/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              {pathname.startsWith(item.path) && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={18} className={cn("transition-transform duration-300 group-hover:scale-110", pathname.startsWith(item.path) && "text-primary")} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4 px-2 py-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/5 border border-white/10 flex items-center justify-center overflow-hidden">
               <UserIcon size={18} className="text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{gatewayUser?.client_name || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-xl px-4"
            onClick={signOut}
          >
            <LogOut size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Terminate Session</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background texture/image for depth */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-[0.04] pointer-events-none grayscale brightness-125 mix-blend-overlay"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop")' }}
        />
        
        {/* Scan line effect on the background */}
        <div className="absolute inset-0 scan-line pointer-events-none opacity-[0.15]" />
        
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/[0.05] bg-background/40 backdrop-blur-xl z-10">
          <div className="lg:hidden flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl border border-white/5">
                <Menu size={20} />
             </Button>
             <Link to="/dashboard" className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tighter text-white">SENTINEL</span>
             </Link>
          </div>
          
          <div className="hidden lg:flex items-center">
            <h1 className="text-lg font-bold tracking-tight text-slate-100 uppercase tracking-[0.15em] text-xs">
              {navItems.find(item => pathname.startsWith(item.path))?.label || 'Portal Overview'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/60 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
               <span className="text-[10px] font-black text-emerald-500 tracking-[0.2em] uppercase">Gateway Active</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center">
               <Shield size={18} className="text-primary/50" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-transparent scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto p-8 lg:p-14">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[320px] bg-slate-950 border-r border-white/5 flex flex-col shadow-2xl z-50"
            >
              <div className="h-20 flex items-center justify-between px-8 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2Fxfd74AsMdZSB0UOLkbkA9ZsLJzU2%2Fsentinallogo__b6449232.png?alt=media&token=78cad279-9a65-4377-a904-96b381aa030e" 
                      alt="Sentinel Logo" 
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <span className="font-bold text-xl tracking-tighter text-white">SENTINEL</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl">
                  <X size={20} />
                </Button>
              </div>
              
              <nav className="flex-1 px-4 py-8 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300",
                      pathname.startsWith(item.path) 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="tracking-wide">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-8 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-white">{gatewayUser?.client_name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-3 border-white/10 hover:bg-destructive/10 hover:text-destructive rounded-xl h-12"
                  onClick={signOut}
                >
                  <LogOut size={18} />
                  Terminate Session
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
