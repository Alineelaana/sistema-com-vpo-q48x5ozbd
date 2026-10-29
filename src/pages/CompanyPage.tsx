import React, { useEffect, useState, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getCompanySettings, saveCompanySettings } from '@/services/logisticsService'
import type { CompanySettings } from '@/types/logistics'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { COMPANY_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  Building2,
  ShieldCheck,
  Key,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

export const CompanyPage: React.FC = () => {
  const corporateNameId = useId()
  const tradeNameId = useId()
  const cnpjId = useId()
  const stateRegId = useId()
  const rntrcId = useId()
  const phoneId = useId()
  const emailId = useId()
  const addressId = useId()
  const cityId = useId()
  const stateId = useId()
  const certNameId = useId()
  const certValidityId = useId()
  const certPasswordId = useId()
  const cteSeriesId = useId()
  const cteNumberId = useId()

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)
  const [company, setCompany] = useState<Partial<CompanySettings>>({
    corporate_name: '',
    trade_name: '',
    cnpj: '',
    state_registration: '',
    rntrc: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    certificate_name: '',
    certificate_validity: '',
    certificate_status: 'missing',
    sefaz_environment: 'homologation',
    cte_series: 1,
    cte_current_number: 1,
  })

  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    setLoading(true)
    const data = await getCompanySettings()
    if (data) {
      setCompany(data)
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company.corporate_name || !company.cnpj) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Razão Social e CNPJ são necessários para salvar.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const saved = await saveCompanySettings(company, company.id)
      setCompany(saved)
      toast({
        title: 'Dados da Empresa atualizados',
        description: 'As configurações fiscais e de emissor foram salvas com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar as alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const simulateCertUpload = () => {
    setCompany((prev) => ({
      ...prev,
      certificate_name: 'CERT_A1_EMISSOR_2026.pfx',
      certificate_validity: '31/12/2026',
      certificate_status: 'configured',
    }))
    toast({
      title: 'Certificado A1 carregado (Simulação)',
      description: 'Certificado Digital reconhecido e validado com sucesso.',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Carregando informações da empresa...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Cadastro da Empresa Transportadora
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie os dados cadastrais, CNPJ, RNTRC e credenciais para emissão de CT-e e
            integração ANTT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            Lógica da Tela
          </Button>

          {company.certificate_status === 'configured' ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Certificado A1 Ativo
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 gap-1 px-3 py-1"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Certificado Não Configurado
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados Cadastrais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação da Empresa</CardTitle>
            <CardDescription>
              Dados jurídicos que constarão no cabeçalho dos Conhecimentos de Transporte emitidos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={corporateNameId}>Razão Social *</Label>
                <Input
                  id={corporateNameId}
                  value={company.corporate_name || ''}
                  onChange={(e) => setCompany({ ...company, corporate_name: e.target.value })}
                  placeholder="Ex: TransConnect Logística Rodoviária Ltda"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={tradeNameId}>Nome Fantasia</Label>
                <Input
                  id={tradeNameId}
                  value={company.trade_name || ''}
                  onChange={(e) => setCompany({ ...company, trade_name: e.target.value })}
                  placeholder="Ex: TransConnect"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={cnpjId}>CNPJ *</Label>
                <Input
                  id={cnpjId}
                  value={company.cnpj || ''}
                  onChange={(e) => setCompany({ ...company, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  required
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor={stateRegId}>Inscrição Estadual (IE)</Label>
                <Input
                  id={stateRegId}
                  value={company.state_registration || ''}
                  onChange={(e) => setCompany({ ...company, state_registration: e.target.value })}
                  placeholder="000.000.000.000"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor={rntrcId}>RNTRC (ANTT)</Label>
                <Input
                  id={rntrcId}
                  value={company.rntrc || ''}
                  onChange={(e) => setCompany({ ...company, rntrc: e.target.value })}
                  placeholder="Ex: 48920194"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={phoneId}>Telefone de Contato</Label>
                <Input
                  id={phoneId}
                  value={company.phone || ''}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  placeholder="(11) 4000-0000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={emailId}>E-mail Fiscal</Label>
                <Input
                  id={emailId}
                  type="email"
                  value={company.email || ''}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  placeholder="fiscal@transportadora.com.br"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor={addressId}>Endereço Completo</Label>
                <Input
                  id={addressId}
                  value={company.address || ''}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  placeholder="Av. Brasil, 1500, Galpão 3"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={cityId}>Cidade</Label>
                  <Input
                    id={cityId}
                    value={company.city || ''}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                    placeholder="São Paulo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={stateId}>UF</Label>
                  <Input
                    id={stateId}
                    value={company.state || ''}
                    onChange={(e) => setCompany({ ...company, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                    className="mt-1 uppercase"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificado Digital e Parâmetros SEFAZ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Certificado Digital A1
              </CardTitle>
              <CardDescription>
                Necessário para assinar os XMLs de CT-e e averbar cargas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Arquivo do Certificado (.pfx/.p12)
                  </span>
                  <Badge variant={company.certificate_name ? 'secondary' : 'outline'}>
                    {company.certificate_name ? 'Carregado' : 'Pendente'}
                  </Badge>
                </div>
                <div className="text-sm font-mono bg-white p-2.5 rounded border border-slate-200 text-slate-700 truncate">
                  {company.certificate_name || 'Nenhum certificado A1 importado'}
                </div>
                {company.certificate_validity && (
                  <div className="text-xs text-slate-500">
                    Validade do certificado:{' '}
                    <strong className="text-slate-700">{company.certificate_validity}</strong>
                  </div>
                )}
                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={simulateCertUpload}
                    className="w-full gap-2 border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Key className="h-4 w-4" />
                    Simular Carregamento de Certificado A1 (.pfx)
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor={certPasswordId}>Senha do Certificado Digital</Label>
                <Input
                  id={certPasswordId}
                  type="password"
                  placeholder="••••••••"
                  defaultValue="******"
                  className="mt-1"
                />
                <span className="text-[11px] text-slate-500">
                  A senha é encriptada e usada unicamente para assinatura de XML
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Parâmetros Fiscais SEFAZ / CT-e
              </CardTitle>
              <CardDescription>Ambiente de emissão e numeração sequencial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Ambiente de Emissão SEFAZ</Label>
                <Select
                  value={company.sefaz_environment || 'homologation'}
                  onValueChange={(val: 'homologation' | 'production') =>
                    setCompany({ ...company, sefaz_environment: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologation">
                      Homologação (Ambiente de Testes / Validação)
                    </SelectItem>
                    <SelectItem value="production">
                      Produção (Validade Jurídica e Fiscal Real)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-slate-500">
                  Na v1 operacional, as emissões geram o layout XML homologado para integração.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={cteSeriesId}>Série do CT-e</Label>
                  <Input
                    id={cteSeriesId}
                    type="number"
                    min="1"
                    value={company.cte_series || 1}
                    onChange={(e) =>
                      setCompany({ ...company, cte_series: parseInt(e.target.value, 10) || 1 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={cteNumberId}>Próximo Nº de CT-e</Label>
                  <Input
                    id={cteNumberId}
                    type="number"
                    min="1"
                    value={company.cte_current_number || 1}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        cte_current_number: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
                <strong>Próximos passos (Roadmap):</strong> Conexão direta com webservice SEFAZ
                estadual e provedor de vale pedágio homologado ANTT (Repom/SemParar).
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px]"
          >
            {saving ? 'Gravando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={COMPANY_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
