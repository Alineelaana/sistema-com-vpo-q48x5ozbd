import React, { useState, useId } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Truck, ShieldCheck, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const loginEmailId = useId()
  const loginPasswordId = useId()
  const registerNameId = useId()
  const registerEmailId = useId()
  const registerPasswordId = useId()
  const resetEmailId = useId()

  const { login, signup, requestPasswordReset } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('alineelaana@gmail.com')
  const [loginPassword, setLoginPassword] = useState('Skip@Pass')

  // Signup form
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  // Forgot password
  const [resetEmail, setResetEmail] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(loginIdentifier, loginPassword)
      toast({
        title: 'Login realizado com sucesso',
        description: 'Bem-vindo ao Ed Integração!',
      })
      navigate('/')
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Falha no login',
        description:
          (err as { message?: string })?.message ||
          'Login/E-mail ou senha inválidos. Verifique suas credenciais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (pass: string): boolean => {
    if (pass.length < 8) return false
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return hasLetter && hasNumber
  }

  const [acceptPolicy, setAcceptPolicy] = useState(true)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePassword(signupPassword)) {
      toast({
        title: 'Política de Senha Forte',
        description: 'A senha deve conter no mínimo 8 caracteres, com letras e números.',
        variant: 'destructive',
      })
      return
    }

    if (!acceptPolicy) {
      toast({
        title: 'Aceite Obrigatório',
        description: 'É necessário concordar com a Política de Privacidade (LGPD).',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await signup(signupEmail, signupPassword, signupName)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já está conectado à plataforma com perfil inicial.',
      })
      navigate('/')
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao criar conta',
        description:
          (err as { message?: string })?.message || 'Verifique se o e-mail já não está em uso.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await requestPasswordReset(resetEmail)
      toast({
        title: 'Instruções enviadas!',
        description: 'Verifique seu e-mail para redefinir sua senha.',
      })
      setActiveTab('login')
    } catch (err: unknown) {
      toast({
        title: 'Erro ao solicitar recuperação',
        description: 'Verifique o e-mail digitado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo e Branding Ed Integração */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white mb-1">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Ed <span className="text-indigo-400 font-extrabold">Integração</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Gestão rodoviária de cargas, cálculo automático de Vale Pedágio Obrigatório e emissão de
            CT-e.
          </p>
        </div>

        {/* Card Autenticação */}
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur text-white shadow-2xl">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'login' | 'signup' | 'forgot')}
            className="w-full"
          >
            <div className="p-4 pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-slate-900 text-slate-400">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs"
                >
                  Acessar Conta
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs"
                >
                  Criar Conta
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB LOGIN */}
            <TabsContent value="login" className="p-6 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor={loginEmailId} className="text-xs text-slate-300">
                    Login (Nome de Usuário) ou E-mail
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={loginEmailId}
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Ex: alineelaana ou email@transconnect.com.br"
                      required
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={loginPasswordId} className="text-xs text-slate-300">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={loginPasswordId}
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">
                    Credenciais de Teste / Padrão:
                  </span>
                  <div>
                    Login / E-mail: <strong className="text-indigo-300">alineelaana</strong> ou{' '}
                    <strong className="text-indigo-300">alineelaana@gmail.com</strong>
                  </div>
                  <div>
                    Senha: <strong className="text-indigo-300">Skip@Pass</strong>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB SIGNUP */}
            <TabsContent value="signup" className="p-6 pt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor={registerNameId} className="text-xs text-slate-300">
                    Nome Completo / Responsável
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={registerNameId}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Ex: João Silva"
                      required
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={registerEmailId} className="text-xs text-slate-300">
                    E-mail Corporativo
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={registerEmailId}
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="usuario@transportadora.com.br"
                      required
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={registerPasswordId} className="text-xs text-slate-300">
                    Senha Forte (mín. 8 caracteres com letras e números)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={registerPasswordId}
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptPolicy}
                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    Li e concordo com a <strong>Política de Privacidade (LGPD v1.0)</strong> para
                    tratamento estrito de dados operacionais e de transporte.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {loading ? 'Cadastrando...' : 'Criar Minha Conta'}
                </Button>
              </form>
            </TabsContent>

            {/* TAB FORGOT PASSWORD */}
            <TabsContent value="forgot" className="p-6 pt-4">
              <form onSubmit={handleReset} className="space-y-4">
                <div className="text-xs text-slate-400">
                  Informe o e-mail cadastrado e enviaremos um link de recuperação de acesso.
                </div>

                <div className="space-y-1">
                  <Label htmlFor={resetEmailId} className="text-xs text-slate-300">
                    Seu E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id={resetEmailId}
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu.email@transportadora.com.br"
                      required
                      className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('login')}
                    className="w-1/2 border-slate-800 text-slate-300 hover:bg-slate-900"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loading ? 'Enviando...' : 'Recuperar'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center text-xs text-slate-500">
          Ed Integração • Emissão CT-e, MDF-e e Cálculo VPO ANTT
        </div>
      </div>
    </div>
  )
}
