export const OPERATIONS_CENTER_SCREEN_LOGIC_DOC = {
  title: 'Central de Operações de Transporte (TMS Passo 1)',
  subtitle:
    'Fluxo operacional unificado e máquina de estados para liberação de viagens rodoviárias',
  purpose:
    'Fornece uma visão ponta a ponta e orquestração centralizada de toda a jornada da carga, desde o recebimento do XML da NF-e até a emissão de CT-e, Contrato/CTRB, CIOT na ANTT/IPEF, Vale-Pedágio Obrigatório (VPO), MDF-e, despacho automatizado de documentos e liberação física da viagem. Elimina a necessidade do operador navegar por dez telas isoladas para aprovar uma única operação.',
  inputsAndButtons: [
    {
      name: 'Seletor de Ordem de Transporte',
      type: 'Dropdown / Busca',
      description:
        'Permite selecionar e filtrar a operação ativa pelo número da OT (ex: OT-2026-0001) ou código da viagem.',
    },
    {
      name: 'Botão "Importar NF-e e Gerar OT"',
      type: 'Ação Principal (Modal)',
      description:
        'Abre a lista de NF-es recebidas e processadas pelo Agente de Cargas para instanciar uma nova Ordem de Transporte sem redigitação.',
    },
    {
      name: 'Esteira Visual de 10 Etapas',
      type: 'Componente Interativo',
      description:
        'Exibe o status sequencial (NF-e ➔ Ordem ➔ Veículo/Motorista ➔ Rota ➔ Piso Mínimo ➔ CT-e ➔ Contrato ➔ CIOT ➔ VPO ➔ MDF-e ➔ Envio ➔ Liberação). Ao clicar em qualquer etapa, abre o painel detalhado de documentos e pendências daquela etapa.',
    },
    {
      name: 'Botão "Processar Automaticamente"',
      type: 'Ação de Orquestração',
      description:
        'Executa a máquina de estados no servidor, avaliando as regras de avanço, calculando piso e disparando validações pendentes.',
    },
    {
      name: 'Botão "Reprocessar Etapa"',
      type: 'Ação de Contingência',
      description:
        'Permite reprocessar uma etapa específica que retornou rejeição ou inconsistência externa (ex: erro de schema no CT-e ou timeout de IPEF).',
    },
    {
      name: 'Etapa 6 "CT-e SEFAZ" e Modal DACTE (Passo 5)',
      type: 'Documento Fiscal / PDF A4',
      description:
        'Preparação do CT-e a partir da Ordem de Transporte e transmissão à SEFAZ via provedor fiscal. Modal DACTE em formato A4, download do XML e tarja de advertência "DOCUMENTO NÃO AUTORIZADO PERANTE A SEFAZ" quando em rascunho, fila ou rejeitado.',
    },
    {
      name: 'Etapa 7 "Contrato / CTRB" & Modal de Impressão PDF',
      type: 'Geração Documental / PDF',
      description:
        'Gera o Contrato de Transporte Rodoviário de Bens (CTRB) a partir da Ordem de Transporte, dados bancários e modelo vigente. Inclui botão de impressão e download em formato padrão A4 operacional (não fiscal).',
    },
    {
      name: 'Etapa 10 "MDF-e SEFAZ" e Modal DAMDFE com IDVPO (Passo 5)',
      type: 'Manifesto Eletrônico / PDF A4',
      description:
        'Preparação do MDF-e agrupando CT-es autorizados, CIOT, seguro e grupo de Vale-Pedágio com IDVPO no campo nCompra do grupo de vale-pedágio. Exige CT-e autorizado prévio. Modal DAMDFE com visualização, impressão e tarja de advertência quando não autorizado.',
    },
    {
      name: 'Aba "Modelos de Contrato CTRB"',
      type: 'Configuração Administrativa',
      description:
        'Permite ao administrador criar e editar modelos contratuais, cláusulas jurídicas dinâmicas, preâmbulos e regras por modalidade de contratação (TAC-Equiparado, TAC-Independente, ETC).',
    },
    {
      name: 'Aba "Conectores de Integração"',
      type: 'Visualização de Contratos',
      description:
        'Exibe o status real de cada conector de integração (SEFAZ, ANTT/CIOT, Concessionárias de Pedágio, Seguradoras, Assinatura Eletrônica e WhatsApp). Conectores sem credenciais aparecem como "Aguardando configuração".',
    },
    {
      name: 'Botão "Liberar Viagem"',
      type: 'Ação Crítica de Bloqueio/Liberação',
      description:
        'Audita e formaliza a liberação da viagem caso todas as etapas mandatórias estejam cumpridas (veículo alocado, condutor ativo, piso mínimo legal respeitado e VPO gerado).',
    },
  ],
  businessRules: [
    'Regra Anti-Duplicação: Uma chave de acesso de NF-e só pode gerar uma única Ordem de Transporte ativa.',
    'Regra de Piso Mínimo (Resolução ANTT nº 5.867/2019): O frete acordado é comparado à tabela vigente de custo por quilômetro e eixos. Se for menor ("bloqueado_abaixo_piso"), a geração do Contrato de Transporte (CTRB) é estritamente bloqueada até regularização.',
    'Regra Anti-Duplicação do CTRB: Regenerar o mesmo contrato para a mesma Ordem de Transporte atualiza o documento existente e incrementa a versão, sem criar registros duplicados.',
    'Assinatura Eletrônica Honesta: Sem provedor jurídico ativo (Clicksign/DocuSign), exibe "Aguardando configuração" na Central de Conectores, sem falsa simulação de documento assinado.',
    'Regra do VPO (Lei nº 10.209/2001): O Vale-Pedágio Obrigatório é responsabilidade do embarcador e deve ser pago antes do início da viagem através de dispositivo eletrônico (TAG ou cartão IPEF).',
    'Conectores Transparentes: Em hipótese alguma simula autorização fiscal da SEFAZ ou concessão de crédito financeiro. Serviços sem token ativo exibem "Aguardando configuração".',
    'Regra de Transmissão Fiscal (Passo 5): Protocolo oficial gravado SOMENTE com confirmação do webservice da SEFAZ. Retransmissão da mesma operação não duplica documentos fiscais nem números de emissão. Documentos já autorizados são bloqueados contra retransmissão.',
    'Regra de Dependência do MDF-e: Conforme a legislação fiscal, o MDF-e exige CT-e prévio autorizado pela SEFAZ. Sem CT-e autorizado, a transmissão é bloqueada com mensagem clara.',
    'IDVPO no MDF-e: O identificador da compra do Vale-Pedágio Obrigatório é gravado no campo nCompra do grupo de vale-pedágio do MDF-e modelo 58.',
    'Isolamento e Auditoria: Toda alteração de status ou avanço de etapa é persistida com timestamp, IP e usuário responsável na coleção audit_logs.',
  ],
  calculations: [
    'VPO = Número de Eixos × Quantidade de Praças de Pedágio × Tarifa Média por Eixo da Rota',
    'Piso Mínimo ANTT = Distância (km) × Coeficiente de Custo por Eixo (conforme tipo de carga e rodagem)',
    'Saldo do Frete = Valor do Frete Contratado - Adiantamento - Deduções de VPO (se aplicável)',
  ],
  automations: [
    'Extração automática de emitente, destinatário, produtos, peso, valor e placa a partir do XML da NF-e vinculada.',
    'Avanço de etapas em cascata conforme os documentos correspondentes (CT-e, MDF-e, CIOT) são validados pelos hooks do servidor.',
    'Despacho automático dos comprovantes via Agente de Despacho (Etapa 4) aos destinatários cadastrados.',
  ],
  integrations: [
    'SEFAZ Nacional: Emissão de CT-e (mod 57) e MDF-e (mod 58). Status: Aguardando configuração de credenciais quando sem token.',
    'IPEF / ANTT: Geração de CIOT obrigatório para TAC e TAC-Equiparado. Status: Aguardando contratação/credenciais.',
    'Operadoras de Vale-Pedágio (SemParar, Repom, ConectCar, Veloe, MoveMais): Emissão e carregamento em TAG.',
    'Motor de Roteirização Pesada Connect: Cálculo de rota respeitando balanças, pedágios e peso máximo por eixo.',
    'AT&M / Seguradoras: Averbação de seguro de carga RCTR-C e RC-DC.',
  ],
  dataFlow: {
    origin:
      'Collection trips (estendida para Ordem de Transporte), received_fiscal_documents, vehicles, drivers, audit_logs.',
    destination:
      'trips (workflow_stages, operation_status, dispatch_released_at), cte_documents, mdfe_documents, audit_logs.',
  },
  permissions: {
    allowedRoles: ['admin', 'manager', 'operator'],
    restrictions:
      'Usuários com perfil "readonly" ou "financial" possuem acesso de consulta, sem permissão para avançar etapas ou liberar viagens.',
  },
  approvalFlows:
    'Aprovação obrigatória de fretes abaixo do piso mínimo ANTT e autorização formal da diretoria para exceções de seguro ou veículo com pendência documental.',
  errorHandling:
    'Erros em etapas externas (ex: SEFAZ offline, CNPJ inválido, divergência de peso) marcam a respectiva etapa com status "requer_atencao" ou "erro", permitindo reprocessamento cirúrgico sem reiniciar a operação do zero.',
  apiDependencies:
    'PocketBase hooks /backend/v1/operations/*, rotas de regularização fiscal e agente de despacho de documentos.',
  blockReleaseConditions:
    'A viagem só atinge status "liberada" se: Veículo selecionado, motorista com CNH válida, piso mínimo regularizado e VPO provisionado.',
}
