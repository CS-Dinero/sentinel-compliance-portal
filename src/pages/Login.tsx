import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, Mail, Loader2, ArrowRight, AlertTriangle, Activity, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth'
import { setGatewayToken, api, getGatewayUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithMagicLink, isAuthenticated, loading: authLoading, isSupabaseReady, setGatewayAuthenticated } = useAuth()
  
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingToken, setIsProcessingToken] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const response = await fetch(`${getGatewayUrl()}/auth/health`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (response.ok) {
          setGatewayStatus('online')
        } else {
          console.warn(`Gateway health check returned ${response.status}`)
          setGatewayStatus('offline')
        }
      } catch (error: any) {
        console.warn('Gateway health check failed:', error.message)
        setGatewayStatus('offline')
      }
    }
    checkHealth()
  }, [])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setIsProcessingToken(true)
      setGatewayToken(token)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    }
  }, [searchParams, navigate])

  useEffect(() => {
    if (isAuthenticated && !searchParams.get('token')) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    try {
      await signInWithMagicLink(email)
      toast.success('Magic link sent! Check your email.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send magic link')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Direct Gateway login for admin/staff users
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminEmail) return
    
    setIsAdminSubmitting(true)
    try {
      const res = await api.login(adminEmail)
      setGatewayToken(res.token)
      // Update auth context state to reflect successful gateway login
      setGatewayAuthenticated({ email: res.email, client_name: res.client_name })
      toast.success(`Welcome back, ${res.client_name || 'Administrator'}`)
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error: any) {
      const msg = error.message || 'Gateway authentication failed.'
      // Show a shorter toast but log the full error
      console.error('Admin login error:', msg)
      if (msg.includes('Unable to reach')) {
        toast.error('Cannot reach the Gateway server. Please verify it is running and check CORS settings.')
      } else if (msg.includes('timed out')) {
        toast.error('Gateway request timed out. The server may be down or unreachable.')
      } else {
        toast.error(msg)
      }
    } finally {
      setIsAdminSubmitting(false)
    }
  }

  if (isProcessingToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute inset-0 spotlight opacity-40" style={{ '--x': '50%', '--y': '50%' } as any} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 space-y-8"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto p-5 border border-primary/20 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
             <img 
               src="https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2Fxfd74AsMdZSB0UOLkbkA9ZsLJzU2%2Fsentinallogo__b6449232.png?alt=media&token=78cad279-9a65-4377-a904-96b381aa030e" 
               alt="Sentinel Logo" 
               className="w-full h-full object-contain animate-pulse"
             />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase tracking-[0.2em]">Authenticating</h2>
            <p className="text-slate-500 font-medium">Securing your enterprise session via Gateway API...</p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden spotlight"
      onMouseMove={handleMouseMove}
      style={{ '--x': `${mousePos.x}px`, '--y': `${mousePos.y}px` } as React.CSSProperties}
    >
      {/* Background imagery with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.04] pointer-events-none grayscale brightness-150 mix-blend-overlay"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")' }}
      />
      
      {/* Background decoration */}
      <div className="absolute inset-0 scan-line pointer-events-none opacity-[0.1]" />
      <div className="absolute -top-48 -left-48 w-full max-w-2xl h-full max-h-2xl bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-full max-w-2xl h-full max-h-2xl bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-20 h-20 rounded-[28px] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-white/10 p-4 relative"
          >
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2Fxfd74AsMdZSB0UOLkbkA9ZsLJzU2%2Fsentinallogo__b6449232.png?alt=media&token=78cad279-9a65-4377-a904-96b381aa030e" 
              alt="Sentinel Logo" 
              className="w-full h-full object-contain"
            />
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className={`w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${
                gatewayStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                gatewayStatus === 'offline' ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'
              }`}>
                {gatewayStatus === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-ping" />}
              </div>
            </div>
          </motion.div>
          <h1 className="text-4xl font-black tracking-[0.2em] mb-3 text-white">SENTINEL</h1>
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-slate-700" />
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">Enterprise Intelligence</p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-slate-700" />
          </div>
        </div>

        <Card className="glass-morphism border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-[32px] overflow-hidden p-2">
          <CardHeader className="space-y-2 pt-10 pb-8 text-center px-8">
            <CardTitle className="text-2xl font-black text-white tracking-tight">Access Control</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Securely authenticate to manage your compliance ecosystem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-8 pb-10">
            {!isSupabaseReady && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-400" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-300">Authentication Not Configured</p>
                  <p className="text-amber-200/80 mt-1">
                    Supabase credentials are missing. Please add <code className="bg-amber-500/20 px-1 rounded text-xs">VITE_SUPABASE_URL</code> and <code className="bg-amber-500/20 px-1 rounded text-xs">VITE_SUPABASE_ANON_KEY</code> to your environment.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className="w-full h-14 border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 gap-3 rounded-2xl transition-all duration-300 group"
                onClick={signInWithGoogle}
                disabled={isSubmitting}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="font-bold text-sm tracking-wide">Continue with Google</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/[0.05]"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]">
                <span className="bg-transparent px-4 text-slate-600">Enterprise Email</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="name@company.com" 
                    type="email" 
                    className="pl-12 h-14 bg-white/[0.02] border-white/[0.08] focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300 rounded-2xl font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 bg-primary text-primary-foreground hover:glow-blue transition-all duration-300 font-black uppercase tracking-[0.15em] text-xs rounded-2xl group shadow-[0_10px_30px_rgba(59,130,246,0.15)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    Establish Connection
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </form>

            <div className="pt-4 relative group">
              {!showAdminLogin ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="w-full h-12 border border-white/[0.05] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary hover:bg-primary/5 rounded-2xl gap-3 transition-all duration-300"
                    onClick={() => setShowAdminLogin(true)}
                  >
                    <Shield size={14} className="group-hover:animate-pulse" />
                    Staff Portal Access
                  </Button>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-[9px] text-slate-400 px-3 py-1 rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold uppercase tracking-widest">
                    Internal Sentinel Use Only
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                      <KeyRound size={12} />
                      Admin Direct Access
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-[10px] text-slate-500 hover:text-white h-6 px-2"
                      onClick={() => setShowAdminLogin(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <div className="relative group">
                      <Shield className="absolute left-4 top-3.5 h-4 w-4 text-amber-500/70" />
                      <Input 
                        placeholder="admin@sentinel.compliance" 
                        type="email" 
                        className="pl-11 h-12 bg-amber-500/5 border-amber-500/20 focus:border-amber-500/50 focus:bg-amber-500/10 transition-all duration-300 rounded-xl font-medium text-sm"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 hover:text-amber-200 transition-all duration-300 font-black uppercase tracking-[0.15em] text-xs rounded-xl"
                      disabled={isAdminSubmitting}
                    >
                      {isAdminSubmitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <KeyRound size={14} />
                          Authenticate via Gateway
                        </div>
                      )}
                    </Button>
                  </form>
                  <p className="text-[9px] text-slate-600 text-center">
                    Direct Gateway authentication for authorized personnel only.
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-10 text-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-600 flex items-center justify-center gap-2">
          <Activity size={10} className={gatewayStatus === 'online' ? 'text-emerald-500' : gatewayStatus === 'offline' ? 'text-rose-500' : 'text-slate-600'} />
          Gateway Intelligence: {gatewayStatus === 'online' ? 'Connected' : gatewayStatus === 'offline' ? 'Connection Error' : 'Authenticating Link...'}
        </p>
      </motion.div>
    </div>
  )
}
