import React from 'react'
import { VpoCalculator } from '@/components/VpoCalculator'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, FileCheck, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const VpoPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <VpoCalculator />

      {/* Orientações legais e integração com CT-e */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                Como o VPO é transferido para o CT-e?
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                No Sistema Connect VPO, ao criar ou despachar uma Viagem, o valor calculado acima é
                inserido automaticamente no grupo de informações de Vale-Pedágio do XML do
                Conhecimento de Transporte (tag <code>vValePed</code>), cumprindo integralmente as
                exigências de fiscalização da ANTT.
              </p>
            </div>
            <Link to="/trips">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shrink-0">
                Criar Viagem com este Pedágio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
