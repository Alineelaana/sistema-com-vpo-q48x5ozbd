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
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '@/services/logisticsService'
import type { Vehicle, VehicleType } from '@/types/logistics'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { VEHICLES_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import { Truck, Plus, Pencil, Trash2, Search, SlidersHorizontal, ShieldCheck } from 'lucide-react'

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  truck: 'Truck (6x2 / 6x4)',
  semi_trailer: 'Carreta / Cavalo Mecânico',
  bitrem: 'Bitrem (7 eixos)',
  rodotrem: 'Rodotrem (9 eixos)',
  vuc: 'VUC (Veículo Urbano de Carga)',
  toco: 'Toco (4x2)',
}

export const VehiclesPage: React.FC = () => {
  const plateId = useId()
  const modelId = useId()
  const brandId = useId()
  const tareWeightId = useId()
  const capacityId = useId()
  const renavamId = useId()

  const { toast } = useToast()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    brand: '',
    axles: 6,
    vehicle_type: 'truck' as VehicleType,
    tare_weight_kg: 8500,
    capacity_kg: 32000,
    renavam: '',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
  })

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    setLoading(true)
    const list = await getVehicles()
    setVehicles(list)
    setLoading(false)
  }

  const handleOpenCreate = () => {
    setEditingVehicle(null)
    setFormData({
      plate: '',
      model: '',
      brand: '',
      axles: 6,
      vehicle_type: 'truck',
      tare_weight_kg: 8500,
      capacity_kg: 32000,
      renavam: '',
      status: 'active',
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v)
    setFormData({
      plate: v.plate,
      model: v.model,
      brand: v.brand || '',
      axles: v.axles,
      vehicle_type: v.vehicle_type,
      tare_weight_kg: v.tare_weight_kg || 0,
      capacity_kg: v.capacity_kg || 0,
      renavam: v.renavam || '',
      status: v.status || 'active',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plate || !formData.model) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Placa e Modelo são indispensáveis.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData)
        toast({ title: 'Veículo atualizado com sucesso!' })
      } else {
        await createVehicle(formData)
        toast({ title: 'Veículo cadastrado com sucesso!' })
      }
      setModalOpen(false)
      loadVehicles()
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao salvar veículo',
        description:
          (err as { message?: string })?.message || 'Verifique se a placa já não existe.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string, plate: string) => {
    if (confirm(`Deseja realmente excluir o veículo de placa ${plate}?`)) {
      try {
        await deleteVehicle(id)
        toast({ title: 'Veículo removido com sucesso' })
        loadVehicles()
      } catch (err) {
        toast({ title: 'Erro ao remover veículo', variant: 'destructive' })
      }
    }
  }

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.brand && v.brand.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            Frota e Veículos Cadastrados
          </h1>
          <p className="text-sm text-slate-500">
            Cadastre os caminhões e carretas com o número exato de eixos para o cálculo automático
            do VPO.
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
            Novo Veículo
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por placa, modelo ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela de Veículos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo / Marca</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Eixos (VPO)</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Carregando veículos...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum veículo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {v.plate}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{v.model}</div>
                      <div className="text-xs text-slate-500">{v.brand || 'Não informado'}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="font-semibold bg-indigo-50 text-indigo-700 border-indigo-200"
                      >
                        {v.axles} eixos
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {v.capacity_kg
                        ? `${(v.capacity_kg / 1000).toLocaleString('pt-BR')} ton`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {v.status === 'active' && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Ativo
                        </Badge>
                      )}
                      {v.status === 'maintenance' && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Manutenção
                        </Badge>
                      )}
                      {v.status === 'inactive' && <Badge variant="secondary">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(v)}>
                        <Pencil className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id, v.plate)}>
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
            <DialogTitle>
              {editingVehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
            </DialogTitle>
            <DialogDescription>
              Informe a placa Mercosul e o número de eixos que serve de multiplicador do Vale
              Pedágio Obrigatório.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={plateId}>Placa (Mercosul/Padrão) *</Label>
                <Input
                  id={plateId}
                  value={formData.plate}
                  onChange={(e) =>
                    setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                  }
                  placeholder="ABC1D23"
                  required
                  maxLength={8}
                  className="font-mono uppercase font-bold mt-1"
                />
              </div>
              <div>
                <Label htmlFor={brandId}>Marca Fabricante</Label>
                <Input
                  id={brandId}
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ex: Scania, Volvo"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={modelId}>Modelo do Veículo *</Label>
              <Input
                id={modelId}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: R 450 6x2"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº de Eixos (Tarifa VPO) *</Label>
                <Select
                  value={formData.axles.toString()}
                  onValueChange={(val) => setFormData({ ...formData, axles: parseInt(val, 10) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((axle) => (
                      <SelectItem key={axle} value={axle.toString()}>
                        {axle} eixos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Composição</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(val: VehicleType) =>
                    setFormData({ ...formData, vehicle_type: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={capacityId}>Capacidade Carga (kg)</Label>
                <Input
                  id={capacityId}
                  type="number"
                  value={formData.capacity_kg || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_kg: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="32000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={renavamId}>Renavam</Label>
                <Input
                  id={renavamId}
                  value={formData.renavam}
                  onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                  placeholder="00000000000"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Status Operacional</Label>
              <Select
                value={formData.status}
                onValueChange={(val: 'active' | 'maintenance' | 'inactive') =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo / Em Operação</SelectItem>
                  <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Veículo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={VEHICLES_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
