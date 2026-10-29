/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const templatesCol = app.findCollectionByNameOrId('document_dispatch_templates')

      // Verificar se já existe o modelo padrão dedicado para Averbação de Seguro Concluída
      const existing = app.findRecordsByFilter(
        'document_dispatch_templates',
        "document_type = 'insurance' && is_default = true",
        '',
        1,
        0,
      )

      if (existing.length === 0) {
        const rec = new Record(templatesCol)
        rec.set('name', 'Modelo Padrão - Averbação de Seguro Concluída')
        rec.set('document_type', 'insurance')
        rec.set('is_default', true)
        rec.set('is_active', true)
        rec.set(
          'description',
          'Enviado aos embarcadores, tomadores e parceiros com o comprovante oficial de averbação da carga (RCTR-C / RC-DC conforme Lei 14.599/2023)',
        )
        rec.set(
          'subject_template',
          '{{empresa_emissora}} - Comprovante de Averbação de Seguro nº {{numero_documento}} (Viagem {{viagem}})',
        )
        rec.set(
          'body_template',
          `Prezado(a) {{nome_cliente}},

Informamos que a averbação de seguro da operação referente à Viagem {{viagem}} foi devidamente confirmada e concluída sob o protocolo {{protocolo_autorizacao}}.

Dados da Cobertura e Averbação:
- Protocolo da Averbação: {{numero_documento}}
- Seguradora: {{seguradora}}
- Nº da Apólice: {{numero_apolice}}
- Ramo / Cobertura: {{ramo_seguro}}
- Valor Declarado da Carga: {{valor_carga}}
- Chave Fiscal Vinculada: {{chave_documento}}
- Data da Averbação: {{data_documento}}

O comprovante digital retornado pela seguradora/AT&M (arquivo {{comprovante_arquivo}}) encontra-se anexado a esta mensagem em estrito cumprimento à Lei nº 14.599/2023.

Atenciosamente,
Departamento de Gestão de Riscos & Seguros • {{empresa_emissora}}`,
        )
        app.save(rec)
      }
    } catch (e) {
      console.warn('Erro ao criar seed de modelo padrão de averbação:', e)
    }
  },
  (app) => {
    try {
      const existing = app.findRecordsByFilter(
        'document_dispatch_templates',
        "name = 'Modelo Padrão - Averbação de Seguro Concluída'",
        '',
        1,
        0,
      )
      if (existing.length > 0) {
        app.delete(existing[0])
      }
    } catch (_) {}
  },
)
