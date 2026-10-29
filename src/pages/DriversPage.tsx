import React, { useEffect, useState, useId } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { getDrivers, createDriver, updateDriver, deleteDriver } from '@/services/logisticsService'
import type { Driver } from '@/types/logistics'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { DRIVERS_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import { Users, Plus, Pencil, Trash2, Search, Phone, CreditCard } from 'lucide-react'

export const DriversPage: React.FC = () => {
  const nameId = useId()
  const cpfId = useId()
  const cnhId = useId()
  const phoneId = useId()

  const { toast } = useToast()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cnh: '',
    cnh_category: 'E' as 'C' | 'D' | 'E',
    phone: '',
    status: 'available' as 'available' | 'on_trip' | 'vacation' | 'inactive',
  })

  useEffect(() => {
    loadDrivers()
  }, [])

  const loadDrivers = async () => {
    setLoading(true)
    const list = await getDrivers()
    setDrivers(list)
    setLoading(false)
  }

  const handleOpenCreate = () => {
    setEditingDriver(null)
    setFormData({
      name: '',
      cpf: '',
      cnh: '',
      cnh_category: 'E',
      phone: '',
      status: 'available',
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (d: Driver) => {
    setEditingDriver(d)
    setFormData({
      name: d.name,
      cpf: d.cpf,
      cnh: d.cnh,
      cnh_category: d.cnh_category || 'E',
      phone: d.phone || '',
      status: d.status || 'available',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.cpf || !formData.cnh) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome, CPF e CNH são necessários.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData)
        toast({ title: 'Motorista atualizado com sucesso!' })
      } else {
        await createDriver(formData)
        toast({ title: 'Motorista cadastrado com sucesso!' })
      }
      setModalOpen(false)
      loadDrivers()
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao salvar motorista',
        description:
          (err as { message?: string })?.message || 'Verifique se o CPF já está cadastrado.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja remover o motorista ${name}?`)) {
      try {
        await deleteDriver(id)
        toast({ title: 'Motorista removido com sucesso' })
        loadDrivers()
      } catch (err) {
        toast({ title: 'Erro ao remover motorista', variant: 'destructive' })
      }
    }
  }

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cpf.includes(searchTerm) ||
      d.cnh.includes(searchTerm),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Quadro de Motoristas
          </h1>
          <p className="text-sm text-slate-500">
            Controle de condutores habilitados para emissão e averbação de MDF-e e CT-e rodoviário.
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

          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Motorista
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF ou CNH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Motorista</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>CNH / Cat.</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando motoristas...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum motorista cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-slate-900">{d.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{d.cpf}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-700">{d.cnh}</span>
                        <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">
                          Cat. {d.cnh_category || 'E'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{d.phone || '—'}</TableCell>
                    <TableCell>
                      {d.status === 'available' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Disponível
                        </Badge>
                      )}
                      {d.status === 'on_trip' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Em Viagem
                        </Badge>
                      )}
                      {d.status === 'vacation' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          Férias
                        </Badge>
                      )}
                      {d.status === 'inactive' && <Badge variant="secondary">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(d)}>
                        <Pencil className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id, d.name)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Motorista' : 'Cadastrar Motorista'}</DialogTitle>
            <DialogDescription>
              Dados do motorista conforme registro no Denatran / CNH.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor={nameId}>Nome Completo *</Label>
              <Input
                id={nameId}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Carlos Eduardo Silveira"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={cpfId}>CPF *</Label>
                <Input
                  id={cpfId}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required
                  className="font-mono mt-1"
                />
              </div>
              <div>
                <Label htmlFor={phoneId}>Telefone celular</Label>
                <Input
                  id={phoneId}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={cnhId}>Número CNH *</Label>
                <Input
                  id={cnhId}
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                  placeholder="00000000000"
                  required
                  className="font-mono mt-1"
                />
              </div>
              <div>
                <Label>Categoria CNH</Label>
                <Select
                  value={formData.cnh_category}
                  onValueChange={(val: 'C' | 'D' | 'E') =>
                    setFormData({ ...formData, cnh_category: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Categoria C (Caminhão simples)</SelectItem>
                    <SelectItem value="D">Categoria D (Passageiros / Van)</SelectItem>
                    <SelectItem value="E">Categoria E (Articulados / Carreta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Situação do Motorista</Label>
              <Select
                value={formData.status}
                onValueChange={(val: 'available' | 'on_trip' | 'vacation' | 'inactive') =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível para Viagem</SelectItem>
                  <SelectItem value="on_trip">Em Trânsito / Viagem</SelectItem>
                  <SelectItem value="vacation">Em Férias</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Motorista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={DRIVERS_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
