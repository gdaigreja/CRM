import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Falha na autenticação. Verifique suas credenciais.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://zklkmbokwzhbqdoqsnxs.supabase.co/storage/v1/object/public/Imagens/Fachada.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-referrer'
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#93774E]/10 rounded-full blur-[120px] z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#93774E]/5 rounded-full blur-[120px] z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div
          className="relative z-10 w-full"
          style={{
            background: 'rgba(21, 18, 16, 0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(166,98,40,0.08)',
          }}
        >
          <div className="text-center mb-7">
            <img
              src="https://zklkmbokwzhbqdoqsnxs.supabase.co/storage/v1/object/public/Imagens/logo_pequena.png"
              alt="Logo Distrato Justo"
              className="w-11 h-11 object-contain mb-4 mx-auto animate-glow-pulse"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-display text-2xl font-bold text-white mb-1 tracking-tight">Distrato Justo</h1>
            <p className="text-white/40 text-xs">Acesse sua conta para gerenciar leads e documentos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-500 text-sm leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block mb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest ml-0.5">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-white/25 group-focus-within:text-white/60 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/15 focus:outline-none transition-all text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.10)',
                    boxShadow: 'none',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(160,82,45,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block mb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest ml-0.5">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-white/25 group-focus-within:text-white/60 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-xl py-3 pl-11 pr-12 text-white placeholder:text-white/15 focus:outline-none transition-all text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(160,82,45,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              style={{
                background: 'linear-gradient(135deg, #A0522D 0%, #7a3d20 100%)',
                boxShadow: '0 4px 20px rgba(160,82,45,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-white/25 text-[11px]">
              Esqueceu sua senha? <span className="text-white/50 cursor-pointer hover:text-white transition-colors">Recuperar acesso</span>
            </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-white/20 text-xs">
          &copy; 2026 Distrato Justo. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
