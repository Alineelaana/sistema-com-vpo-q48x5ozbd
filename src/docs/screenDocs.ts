import { ScreenLogicDoc } from '@/components/ScreenLogicModal'

export const DASHBOARD_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Dashboard de Operações Integrado',
  screenBadge: 'Visão Geral • Prioridades 1, 2, 3 e 4',
  lastUpdate: '2026-10-29',
  version: '2.0.0',
  objective:
    'Centralizar em tempo real as métricas executivas e operacionais da transportadora: fretes, Vale Pedágio Obrigatório (Lei 10.209/01), CT-es autorizados, multas críticas, entregas monitoradas e os 4 agentes autônomos (E-mails, Cargas, Regularização e Envio Automático).',
  realFeatures: [
    'Alerta crítico de multas vencidas ou com vencimento nos próximos 7 dias com acesso direto para pagamento ou recurso',
    'Indicadores financeiros: Total em fretes, VPO destacado em conformidade e CT-es autorizados',
    'Bloco executivo dos 4 Agentes Autônomos: E-mails triados (P1), Cargas vinculadas (P2), Regularização fiscal (P3) e Documentos Enviados com anti-duplicação (P4)',
    'Métricas em tempo real de cargas vinculadas automaticamente, pendências de revisão humana e duplicidades fiscais impedidas',
    'Métricas da Etapa 4: Documentos enviados com sucesso aos destinatários e monitoramento de falhas/retries',
    'Painel Fusion: Entregas hoje com POD, veículos em rota, ocorrências em trânsito, entregas atrasadas (SLA) e divergência de frete',
    'Listagem das últimas viagens operacionais e documentos fiscais emitidos',
  ],
  fieldsAndButtons: [
    {
      name: 'Abrir Central de Agentes',
      type: 'Botão de Navegação',
      purpose:
        'Acessa a Central de Agentes com o fluxo visual em 4 etapas e resolução de pendências.',
    },
    {
      name: 'Verificar Todas as Multas',
      type: 'Botão de Ação Rápida',
      purpose: 'Direciona ao módulo de multas destacando infrações em atraso.',
    },
    {
      name: 'Torre de Controle & Nova Entrega',
      type: 'Botões de Atalho',
      purpose: 'Acesso imediato à gestão em tempo real de frota e cadastro de coletas/entregas.',
    },
  ],
  businessRules: [
    'O valor de VPO é repassado obrigatoriamente sem desconto no frete ao transportador/autônomo conforme Lei 10.209/01.',
    'Associações de carga ambíguas ou divergentes não são contabilizadas como vinculadas e alimentam o contador de pendências.',
    'Duplicidade fiscal é bloqueada quando a chave já possui CT-e registrado no banco de dados.',
  ],
  agentsAndAutomations: [
    'Hook do servidor PocketBase atualiza periodicamente contadores de e-mails e cargas processadas.',
    'Agente de Cargas opera com mínimo de 2 sinais coincidentes por padrão.',
  ],
  validations: [
    'Cálculo dinâmico de datas para identificar multas críticas a vencer.',
    'Verificação de divergências financeiras entre frete cobrado e acordado.',
  ],
  integrations: [
    'Coleções trips, cte_documents, traffic_fines, deliveries, email_agent_configs e cargo_agent_configs.',
  ],
  flowsAndDependencies: [
    'O resumo do dashboard reflete imediatamente ações tomadas na Central de Agentes e nos módulos operacionais.',
  ],
  dataSourceAndDestination: {
    origin: 'Consultas agregadas ao banco de dados PocketBase.',
    destination: 'Renderização no navegador com caching de estado.',
    persistence: 'Banco SQLite via PocketBase v0.36.',
  },
  permissions: [
    { role: 'Todos os usuários autenticados', access: 'Visualização das métricas consolidadas.' },
  ],
  notificationsAndErrors: [
    'Banners visuais de alerta para multas vencidas e pendências de cargas.',
  ],
}

export const COMPANY_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Dados da Empresa Transportadora',
  screenBadge: 'Cadastros • Dados Fiscais',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Gerenciar a identificação cadastral e fiscal da transportadora emitente de CT-e/MDF-e, RNTRC na ANTT, regime tributário e dados de contato para expedição.',
  realFeatures: [
    'Cadastro e edição de Razão Social, Nome Fantasia, CNPJ e Inscrição Estadual',
    'Registro do RNTRC (Registro Nacional de Transportadores Rodoviários de Cargas)',
    'Endereço fiscal completo com CEP, logradouro, número, bairro, município e UF',
    'Contatos de expedição e faturamento operacional',
  ],
  fieldsAndButtons: [
    {
      name: 'Salvar Configurações',
      type: 'Botão de Ação Primária',
      purpose: 'Persiste os dados cadastrais da transportadora.',
    },
    {
      name: 'CNPJ e IE',
      type: 'Campos de Texto Formatado',
      purpose: 'Identificação fiscal exigida em documentos SEFAZ.',
    },
    {
      name: 'RNTRC',
      type: 'Campo Numérico',
      purpose: 'Registro obrigatório junto à ANTT para transporte remunerado.',
    },
  ],
  businessRules: [
    'O CNPJ e a Inscrição Estadual devem coincidir com o emissor dos conhecimentos de transporte.',
    'RNTRC ativo é pré-requisito legal para transporte rodoviário de cargas.',
  ],
  agentsAndAutomations: [
    'Dados usados pelos agentes para identificar se a transportadora foi contratada ou subcontratada no XML da NF-e.',
  ],
  validations: ['Validação de formato de CNPJ, UF válida e campos obrigatórios preenchidos.'],
  integrations: ['Coleção PocketBase company_settings.'],
  flowsAndDependencies: [
    'Os dados desta tela são injetados automaticamente no cabeçalho de CT-es e cálculos de VPO.',
  ],
  dataSourceAndDestination: {
    origin: 'Entrada manual de administradores.',
    destination: 'Coleção company_settings.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Administrador', access: 'Edição completa dos dados fiscais.' }],
  notificationsAndErrors: ['Toasts de sucesso e erro ao persistir.'],
}

export const VEHICLES_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Gestão de Veículos da Frota',
  screenBadge: 'Cadastros • Frota Operacional',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Cadastrar e monitorar veículos próprios e agregados, tipos de rodado, número de eixos (crítico para cálculo exato de Vale Pedágio Lei 10.209/01), capacidade de carga e rastreamento de multas vinculadas.',
  realFeatures: [
    'Listagem de veículos com busca por placa, modelo e tipo de rodado',
    'Cadastro de tipo de veículo (Toco, Truck, Cavalo Mecânico, Carreta, Bitrem, Rodotrem)',
    'Número exato de eixos utilizado na calculadora e destaque de VPO',
    'Associação com multas de trânsito em aberto para bloqueio preventivo',
    'Status operacional (Ativo, Em Manutenção, Inativo)',
  ],
  fieldsAndButtons: [
    {
      name: 'Novo Veículo',
      type: 'Botão de Ação',
      purpose: 'Abre modal para inclusão de veículo na frota.',
    },
    {
      name: 'Placa (Padrão Mercosul / Antigo)',
      type: 'Campo de Texto',
      purpose: 'Identificador do veículo cruzado pelo Agente de Cargas.',
    },
    {
      name: 'Número de Eixos',
      type: 'Seletor Numérico',
      purpose: 'Base de cálculo para tarifas de pedágio por eixo.',
    },
  ],
  businessRules: [
    'A placa é um dos sinais analisados pelo Agente de Identificação de Cargas (não exclusivo).',
    'Veículos com multas vencidas em aberto recebem badge de alerta operacional.',
  ],
  agentsAndAutomations: [
    'Agente de Cargas cruza a placa lida na NF-e com os veículos cadastrados nesta coleção.',
  ],
  validations: [
    'Placa única no banco de dados e validação de quantidade de eixos compatível com o tipo de rodado.',
  ],
  integrations: ['Coleção vehicles, trips, traffic_fines e received_fiscal_documents.'],
  flowsAndDependencies: [
    'Veículos cadastrados aqui ficam disponíveis para alocação em Viagens e Entregas.',
  ],
  dataSourceAndDestination: {
    origin: 'Cadastro operacional.',
    destination: 'Coleção vehicles.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Operador e Admin', access: 'Cadastro e consulta de veículos.' }],
  notificationsAndErrors: ['Notificações em caso de duplicidade de placa.'],
}

export const DRIVERS_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Gestão de Motoristas & Condutores',
  screenBadge: 'Cadastros • Equipe de Tráfego',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Manter o prontuário dos condutores (próprios, terceiros e agregados), número e validade de CNH, pontuação acumulada de infrações e associação de viagens.',
  realFeatures: [
    'Cadastro completo de motoristas com CPF, CNH, Categoria e Validade',
    'Controle de pontos na CNH decorrentes de multas vinculadas com alerta de suspensão aos 20/30/40 pontos',
    'Status do condutor (Ativo, Férias, Afastado, Bloqueado)',
    'Identificação para cruzamento de NF-e recebidas pelo Agente de Cargas',
  ],
  fieldsAndButtons: [
    { name: 'Novo Motorista', type: 'Botão de Ação', purpose: 'Cadastra novo condutor.' },
    {
      name: 'CPF e CNH',
      type: 'Campos com Máscara',
      purpose: 'Documentação obrigatória do condutor.',
    },
    {
      name: 'Pontuação de Multas',
      type: 'Contador Automático',
      purpose: 'Soma dos pontos ativos de infrações associadas.',
    },
  ],
  businessRules: [
    'CPF e Nome do motorista são utilizados pelo Agente de Cargas como sinal de confirmação.',
    'Motoristas com pontuação crítica na CNH são sinalizados para evitar suspensão ao volante.',
  ],
  agentsAndAutomations: [
    'Agente de Cargas busca motorista por nome e CPF ao analisar o XML da NF-e.',
  ],
  validations: ['CPF válido (algoritmo receita) e data de validade de CNH futura.'],
  integrations: ['Coleções drivers, trips, traffic_fines e cargo_identifications.'],
  flowsAndDependencies: [
    'Condutor alocado na viagem vincula automaticamente as ocorrências de trânsito e POD.',
  ],
  dataSourceAndDestination: {
    origin: 'Cadastro pelo setor de RH/Tráfego.',
    destination: 'Coleção drivers.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Operador e Admin', access: 'Gestão de condutores.' }],
  notificationsAndErrors: ['Avisos de CNH vencida ou pontuação crítica.'],
}

export const TRIPS_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Ordens de Carregamento & Viagens',
  screenBadge: 'Operacional • Ordem de Carga',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Gerenciar as ordens de carregamento e viagens da transportadora. É a entidade oficial onde o Agente de Identificação de Cargas (Prioridade 2) vincula as NF-es recebidas após validação de múltiplos sinais.',
  realFeatures: [
    'Cadastro de viagem com origem, destino, veículo, motorista, peso da carga e valor do frete',
    'Cálculo e destaque de Vale Pedágio Obrigatório (VPO) conforme eixos e distância',
    'Status da viagem: Planejada, Em Trânsito, Concluída, Cancelada',
    'Visualização de documentos fiscais e entregas associadas a cada viagem',
  ],
  fieldsAndButtons: [
    { name: 'Nova Viagem', type: 'Botão de Ação', purpose: 'Cria nova ordem de carregamento.' },
    {
      name: 'Calcular VPO',
      type: 'Botão Integrado',
      purpose: 'Calcula o valor do pedágio da rota e eixos.',
    },
    {
      name: 'Código da Viagem',
      type: 'Identificador Único',
      purpose: 'Identificador (ex: VIAG-2025-001) usado no cruzamento do agente.',
    },
  ],
  businessRules: [
    'Regra Crítica: O Agente de Cargas vincula NF-es a viagens existentes em status Planejada ou Em Trânsito.',
    'Se houver mais de uma viagem compatível, nenhuma é vinculada automaticamente (pendência gerada na Central).',
  ],
  agentsAndAutomations: [
    'Agente de Cargas consulta viagens ativas para cruzar placa, cliente, datas e peso.',
  ],
  validations: ['Origem e destino obrigatórios, peso positivo e veículo compatível.'],
  integrations: [
    'Coleções trips, vehicles, drivers, cte_documents, deliveries e cargo_identifications.',
  ],
  flowsAndDependencies: ['Viagens são a base para emissão de CT-e e despacho de entregas.'],
  dataSourceAndDestination: {
    origin: 'Ordens operacionais criadas pela expedição.',
    destination: 'Coleção trips.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [
    { role: 'Operador, Gestor e Admin', access: 'Criação e acompanhamento de viagens.' },
  ],
  notificationsAndErrors: ['Alertas de sobrepeso ou pendência de pedágio.'],
}

export const CTE_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Documentos Fiscais (CT-e)',
  screenBadge: 'Fiscal • Conhecimento de Frete',
  lastUpdate: '2026-10-29',
  version: '2.1.0',
  objective:
    'Gerenciamento e emissão de Conhecimentos de Transporte Eletrônicos (CT-e Modelo 57) via Provedor Fiscal Certificado (Nuvem Fiscal real). Transmissão sem qualquer simulação: documentos permanecem na fila enquanto aguardam resposta oficial da SEFAZ. Uma vez autorizados oficialmente, alimentam a Etapa 4 da Central de Agentes para envio automático aos destinatários (tomador/remetente/destinatário) com DACTE e XML.',
  realFeatures: [
    'Transmissão para a SEFAZ através da API oficial Nuvem Fiscal (provedores Focus NFe e TecnoSpeed com interfaces preparadas)',
    'Destaque obrigatório e legal do Vale Pedágio Obrigatório (VPO)',
    'Tratamento honesto de status: Em Fila, Pendente SEFAZ, Autorizado e Rejeitado com mensagem do motivo oficial',
    'DACTE demonstrativo com protocolo e chave de acesso oficial',
    'Salvaguarda: documentos já autorizados são bloqueados contra retransmissão indevida',
    'Integração com Etapa 4 de Envio: apenas CT-es com status authorized são despachados aos destinatários cadastrados com proteção anti-duplicação',
  ],
  fieldsAndButtons: [
    {
      name: 'Transmitir à SEFAZ',
      type: 'Botão de Ação Fiscal',
      purpose: 'Envia o CT-e à SEFAZ através do backend hook com credenciais seguras.',
    },
    {
      name: 'Visualizar DACTE',
      type: 'Ação na Linha',
      purpose: 'Visualização dos dados fiscais do conhecimento com destaque de VPO.',
    },
    {
      name: 'Lógica da Tela',
      type: 'Botão de Auditoria',
      purpose:
        'Documenta o que está integrado de forma real e o que depende de credenciais de provedor.',
    },
  ],
  businessRules: [
    'Regra Inegociável: NUNCA simular autorização fiscal. Sem credenciais cadastradas na tela Empresa, o CT-e permanece na fila como aguardando transmissão.',
    'CIOT e VPO são obrigações distintas e segregadas.',
    'CT-e autorizado perante a SEFAZ nunca pode ser retransmitido.',
    'Apenas CT-e autorizado na SEFAZ pode ser despachado aos destinatários pela Etapa 4 (Agente de Envio Automático).',
  ],
  agentsAndAutomations: [
    'Orquestrador da Etapa 3 processa viagens da Etapa 2 gerando CT-es na fila para emissão.',
    'Agente de Envio (Etapa 4 / hook dispatch_agent.pb.js) detecta CT-es autorizados e dispara e-mails aos contatos cadastrados.',
  ],
  validations: ['Validação de remetente, destinatário, valor da carga, frete e ambiente da SEFAZ.'],
  integrations: [
    'Coleções cte_documents, trips, company_settings, document_dispatch_logs e Nuvem Fiscal API.',
  ],
  flowsAndDependencies: [
    'CT-es autorizados alimentam a montagem de MDF-e na Etapa 3 e o despacho automático por e-mail na Etapa 4.',
  ],
  dataSourceAndDestination: {
    origin: 'Viagens operacionais e dados fiscais de embarcadores.',
    destination: 'Coleção cte_documents e SEFAZ.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Fiscal e Admin', access: 'Emissão e transmissão de conhecimentos.' }],
  notificationsAndErrors: ['Rejeições da SEFAZ com código e motivo legível para saneamento.'],
}

export const MDFE_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Manifesto Eletrônico de Documentos Fiscais (MDF-e)',
  screenBadge: 'Fiscal & VPO • Modelo 58',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Consolidação de cargas e manifesto de documentos fiscais eletrônicos (modelo 58) para transporte interestadual, agrupando exclusivamente CT-es autorizados. Quando autorizado, integra com a Etapa 4 para envio automático do DAMDFE e XML aos responsáveis da rota e transportador.',
  realFeatures: [
    'Consolidação automática dos CT-es autorizados da viagem',
    'Transmissão via Nuvem Fiscal ou enfileiramento seguro na ausência de credenciais',
    'Definição e validação do percurso interestadual de UFs',
    'Encerramento do manifesto no destino e cancelamento dentro dos prazos legais',
    'Visualização simplificada de DAMDFE com protocolo e chaves vinculadas',
    'Elegibilidade para Etapa 4: manifesto com status authorized é enviado automaticamente aos contatos cadastrados para MDF-e',
  ],
  fieldsAndButtons: [
    {
      name: 'Novo MDF-e',
      type: 'Botão de Ação',
      purpose: 'Gera rascunho de manifesto a partir de uma viagem com CT-es autorizados.',
    },
    {
      name: 'Transmitir à SEFAZ',
      type: 'Ação na Linha / Modal',
      purpose: 'Envia o manifesto para autorização junto ao provedor fiscal conectado.',
    },
    {
      name: 'Encerrar Manifesto',
      type: 'Ação Finalizadora',
      purpose: 'Comunica o término da rota na UF de destino, liberando o veículo.',
    },
  ],
  businessRules: [
    'Só podem ser consolidados no MDF-e documentos (CT-e) com status autorizado na SEFAZ.',
    'Nunca simular autorização fiscal: manifesto sem resposta oficial fica retido como fila/rascunho.',
    'Envio da Etapa 4 restrito a manifestos autorizados, bloqueando envio de rascunhos ou manifestos pendentes.',
  ],
  agentsAndAutomations: [
    'Agente de regularização fiscal cria automaticamente o rascunho de MDF-e após CT-e pronto.',
    'Agente de Envio Automático (Etapa 4) despacha DAMDFE e XML oficial aos condutores e expedição cadastrados.',
  ],
  validations: ['Obrigatoriedade de UFs de origem, destino e percurso compatíveis com a rota.'],
  integrations: [
    'Coleções mdfe_documents, cte_documents, trips, vehicles, drivers e document_dispatch_logs.',
  ],
  flowsAndDependencies: [
    'Depende de CT-es autorizados para transmissão e alimenta o envio de documentos da rota na Etapa 4.',
  ],
  dataSourceAndDestination: {
    origin: 'CT-es autorizados da viagem.',
    destination: 'Coleção mdfe_documents e SEFAZ.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Fiscal e Operador', access: 'Emissão, encerramento e consulta.' }],
  notificationsAndErrors: ['Avisos de necessidade de encerramento antes de novas viagens.'],
}

export const CIOT_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Código Identificador da Operação de Transportes (CIOT)',
  screenBadge: 'Fiscal & VPO • Res. ANTT 5.862/2019',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Controle da obrigatoriedade do CIOT para remuneração do frete na ANTT, com distinção estrita em relação ao VPO e perfil do transportador (ETC ou TAC-Equiparado). Registros com protocolo oficial (status registered) são integrados à Etapa 4 da Central de Agentes para envio do comprovante aos contratantes e transportadores.',
  realFeatures: [
    'Registro do código CIOT de 16 dígitos e comprovante oficial fornecido pela IPEF',
    'Classificação de perfil do transportador (TAC-Equiparado, ETC, TAC-Independente)',
    'Integração com viagens operacionais e bloqueio de expedição configurável',
    'Salvaguarda contra promessas irreais: esclarece que não existe emissão mágica direta na ANTT sem IPEF homologada',
    'Despacho na Etapa 4: CIOTs com status registered têm comprovantes enviados aos destinatários cadastrados',
  ],
  fieldsAndButtons: [
    {
      name: 'Registrar CIOT',
      type: 'Botão de Formulário',
      purpose: 'Cadastra ou atualiza o CIOT e comprovante da viagem.',
    },
    {
      name: 'Editar / Comprovante',
      type: 'Ação na Linha',
      purpose: 'Insere o hash do protocolo gerado pela fornecedora.',
    },
  ],
  businessRules: [
    'CIOT e VPO são obrigações DISTINTAS: possuem finalidades, coleções e normativas diferentes.',
    'Não prometer CIOT direto na ANTT sem custo: a integração exige credencial de IPEF cadastrada.',
    'Apenas CIOTs devidamente registrados com protocolo IPEF/ANTT são enviados na Etapa 4.',
  ],
  agentsAndAutomations: [
    'Agente de regularização verifica a obrigatoriedade por viagem e gera pendência se faltar.',
    'Agente de Envio Automático (Etapa 4) envia o comprovante de compliance de pagamento de frete.',
  ],
  validations: ['Validação do RNTRC do transportador e formato do código numérico de 16 dígitos.'],
  integrations: ['Coleções ciot_records, trips, company_settings e document_dispatch_logs.'],
  flowsAndDependencies: [
    'Pendência de CIOT bloqueia a regularização da viagem e impede o despacho de compliance na Etapa 4.',
  ],
  dataSourceAndDestination: {
    origin: 'Viagens contratadas e retorno de IPEFs.',
    destination: 'Coleção ciot_records.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Frota, Fiscal e Admin', access: 'Gestão de CIOT e compliance ANTT.' }],
  notificationsAndErrors: ['Alertas de viagem com CIOT pendente antes do despacho.'],
}

export const INSURANCE_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Seguros & Averbação de Carga',
  screenBadge: 'Fiscal & VPO • Lei 14.599/2023',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Gestão de apólices de seguro de transporte rodoviário de cargas (RCTR-C obrigatório e RC-DC facultativo) e controle dos dossiês de averbação por viagem. Dossiês com protocolo confirmado (status averbada) são integrados à Etapa 4 da Central de Agentes para envio do comprovante aos embarcadores e corretores.',
  realFeatures: [
    'Cadastro e controle de vigência de apólices de seguro (Porto Seguro, Tokio Marine, Sompo)',
    'Geração de dossiê de averbação com valor declarado e chave fiscal da carga',
    'Registro do protocolo de averbação e comprovante retornado pela seguradora ou AT&M',
    'Envio automático do comprovante de averbação pelo Agente de Envio (Etapa 4) aos destinatários cadastrados, com anexo do arquivo de retorno e controle anti-duplicidade',
    'Bloqueio automático de despacho de viagem sem seguro ativo quando configurado na Empresa',
    'Despacho de comprovante na Etapa 4 para clientes que exigem compliance securitário prévio',
  ],
  fieldsAndButtons: [
    {
      name: 'Novo Dossiê de Averbação',
      type: 'Botão de Ação',
      purpose: 'Registra o pedido de averbação da carga com a seguradora.',
    },
    {
      name: 'Nova Apólice',
      type: 'Botão de Formulário',
      purpose: 'Cadastra nova apólice RCTR-C ou RC-DC com seguradora e corretora.',
    },
  ],
  businessRules: [
    'Lei nº 14.599/2023: o seguro RCTR-C é de contratação e averbação obrigatória do transportador.',
    'Carga sem averbação confirmada permanece na fila com status honesto.',
    'Somente averbações com confirmação e protocolo AT&M/Seguradora (status "averbada") e comprovante anexável são elegíveis para envio na Etapa 4; caso sem anexo retornado, registra pendência detalhada sem simular disparo.',
    'Salvaguarda anti-duplicidade: a chave [tipo_doc]_[id]_[email] impede reenvio da mesma averbação para o mesmo destinatário.',
  ],
  agentsAndAutomations: [
    'Agente de regularização fiscal monta o dossiê de averbação para cada viagem identificada.',
    'Agente de Envio Automático (Etapa 4) envia o comprovante de averbação conforme cadastro do destinatário.',
  ],
  validations: ['Vigência ativa da apólice e valor declarado compatível com a mercadoria.'],
  integrations: [
    'Coleções insurance_policies, insurance_endorsements, trips e document_dispatch_logs.',
  ],
  flowsAndDependencies: [
    'Averbação confirmada viabiliza a transmissão do CT-e e o envio dos comprovantes na Etapa 4.',
  ],
  dataSourceAndDestination: {
    origin: 'Apólices e dados de NF-e da carga.',
    destination: 'Coleções insurance_policies e insurance_endorsements.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Seguros, Fiscal e Admin', access: 'Gestão de apólices e averbações.' }],
  notificationsAndErrors: ['Avisos de viagens sem averbação ou com apólice próxima do vencimento.'],
}

export const VPO_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Calculadora de Vale Pedágio Obrigatório (VPO)',
  screenBadge: 'Compliance • Lei 10.209/2001',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Calcular a tarifa exata de pedágio rodoviário por trecho e número de eixos do veículo, assegurando o cumprimento da Lei Federal nº 10.209/2001 que obriga o embarcador a fornecer o pedágio antecipado ao transportador.',
  realFeatures: [
    'Presets para rotas populares brasileiras (SP-RJ, SP-BH, Curitiba-Santos, etc.)',
    'Configuração rápida por tipo de veículo e quantidade de eixos (2 a 9 eixos)',
    'Cálculo do valor por eixo e custo total de pedágio ida e volta',
    'Demonstração do destaque de VPO no frete sem retenção tributária',
  ],
  fieldsAndButtons: [
    {
      name: 'Calcular Tarifa',
      type: 'Botão de Cálculo',
      purpose: 'Calcula o pedágio com base na rota e eixos.',
    },
    {
      name: 'Rota e Praças de Pedágio',
      type: 'Seleção / Input',
      purpose: 'Origem, destino e concessionárias do trajeto.',
    },
    {
      name: 'Número de Eixos',
      type: 'Seletor',
      purpose: 'Multiplicador tarifário de cada praça rodoviária.',
    },
  ],
  businessRules: [
    'O Vale Pedágio deve ser entregue em meio eletrônico habilitado pela ANTT antes do início da viagem.',
    'É vedado o desconto do valor do pedágio do valor do frete contratado.',
  ],
  agentsAndAutomations: [
    'Métrica utilizada na composição de custos do frete em viagens operacionais.',
  ],
  validations: ['Número mínimo de 2 eixos para veículos comerciais.'],
  integrations: ['Utilizado na página de Viagens, Dashboard e CT-e.'],
  flowsAndDependencies: [
    'O valor apurado nesta calculadora alimenta o campo vpo_value de trips e ctes.',
  ],
  dataSourceAndDestination: {
    origin: 'Tabelas tarifárias e parâmetros de eixos.',
    destination: 'Cálculo dinâmico em memória e persistência em trips.',
    persistence: 'Banco de dados da viagem.',
  },
  permissions: [{ role: 'Todos os usuários', access: 'Consulta e cálculo de pedágio.' }],
  notificationsAndErrors: ['Feedback instantâneo na tela.'],
}

export const FINES_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Multas & Infrações de Trânsito',
  screenBadge: 'Frota & Compliance • Detran/ANTT/PRF',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Gestão completa de infrações cometidas pela frota, importação em lote com deduplicação, notificação automática de vencimentos, controle de recursos e alocação de pontuação no prontuário do condutor.',
  realFeatures: [
    'Listagem com filtros por status (Pendente, Paga, Em Recurso, Cancelada)',
    'Destaque visual de multas vencidas e vencendo nos próximos 7 dias com contagem regressiva',
    'Importador em lote via CSV flexível com parser inteligente e tolerância a delimitadores',
    'Controle de pontuação por gravidade (Leve: 3, Média: 4, Grave: 5, Gravíssima: 7)',
    'Histórico de notificações automáticas geradas no centro de notificações',
  ],
  fieldsAndButtons: [
    {
      name: 'Importar Lote (CSV)',
      type: 'Botão com Modal',
      purpose: 'Importação massiva de autos de infração.',
    },
    {
      name: 'Nova Infração',
      type: 'Botão de Formulário',
      purpose: 'Cadastro individual de multa.',
    },
    {
      name: 'Registrar Pagamento / Recurso',
      type: 'Ações na Linha',
      purpose: 'Atualiza o status financeiro e jurídico do auto.',
    },
  ],
  businessRules: [
    'Autos duplicados (mesmo auto_number) são rejeitados no importador para evitar pagamento duplicado.',
    'Multas sem condutor atribuído geram notificação de identificação obrigatória de condutor infrator.',
  ],
  agentsAndAutomations: [
    'Cron do sistema gera notificações automáticas para autos com vencimento iminente.',
  ],
  validations: ['Validação de formato de placa, número de auto único e data de vencimento válida.'],
  integrations: ['Coleções traffic_fines, vehicles, drivers e fine_notifications.'],
  flowsAndDependencies: [
    'Multas em atraso geram alertas no Dashboard para evitar bloqueio no Detran/ANTT.',
  ],
  dataSourceAndDestination: {
    origin: 'Planilhas de órgãos autuadores e cadastro manual.',
    destination: 'Coleção traffic_fines.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Operador e Admin', access: 'Gestão de infrações e recursos.' }],
  notificationsAndErrors: ['Toasts de importação e notificações persistentes de prazo fatal.'],
}

export const DELIVERIES_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Entregas & Coletas (Fusion by nstech)',
  screenBadge: 'Operações • Última Milha',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Controle e comprovação da execução de coletas e entregas, gestão de janelas de SLA de atendimento, apontamento de ocorrências em rota e upload de comprovantes digitais (POD).',
  realFeatures: [
    'Listagem de entregas com status (Pendente, Em Trânsito, Entregue, Ocorrência, Cancelada)',
    'Upload e visualização de comprovante de entrega (POD) com geolocalização e assinatura',
    'Controle de SLA com identificação automática de entregas atrasadas',
    'Registro de ocorrências com motivo, fotos e reacomodação na rota',
  ],
  fieldsAndButtons: [
    {
      name: 'Nova Entrega',
      type: 'Botão de Ação',
      purpose: 'Cadastra nova ordem de entrega ou coleta.',
    },
    {
      name: 'Anexar POD',
      type: 'Ação na Linha',
      purpose: 'Upload do comprovante de entrega assinado pelo cliente.',
    },
    {
      name: 'Registrar Ocorrência',
      type: 'Ação na Linha',
      purpose: 'Aponta recusa, avaria ou ausência do destinatário.',
    },
  ],
  businessRules: [
    'Uma entrega só pode ser dada como concluída com a comprovação do POD.',
    'Entregas fora da janela programada entram no cálculo de quebra de SLA da Torre de Controle.',
  ],
  agentsAndAutomations: ['Integração com Torre de Controle em tempo real via PocketBase Realtime.'],
  validations: ['Janela de entrega válida e campos de cliente preenchidos.'],
  integrations: ['Coleções deliveries, trips, vehicles e drivers.'],
  flowsAndDependencies: [
    'Entregas com POD alimentam a esteira de auditoria de frete para liberação de pagamento.',
  ],
  dataSourceAndDestination: {
    origin: 'Ordens de expedição e motoristas via app.',
    destination: 'Coleção deliveries.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Operador e Admin', access: 'Gestão de entregas e POD.' }],
  notificationsAndErrors: ['Alertas de SLA estourado e ocorrências ativas.'],
}

export const ROUTING_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Roteirização Inteligente de Rotas',
  screenBadge: 'Operações • Otimização de Trajeto',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Sequenciamento e otimização geométrica de paradas de entrega e coleta para redução de quilometragem rodada, tempo em trânsito e consumo de combustível com base na fórmula de Haversine e algoritmo do vizinho mais próximo.',
  realFeatures: [
    'Otimização automática da sequência de paradas saindo do centro de distribuição (depósito)',
    'Cálculo de distância total percorrida e tempo estimado em rota',
    'Reordenação manual de paradas com recálculo instantâneo',
    'Exportação do manifesto de rota para o motorista',
  ],
  fieldsAndButtons: [
    {
      name: 'Otimizar Rota',
      type: 'Botão de Ação Primária',
      purpose: 'Executa algoritmo heurístico de sequenciamento de paradas.',
    },
    {
      name: 'Ponto de Partida (Depósito)',
      type: 'Configuração',
      purpose: 'Coordenadas base da transportadora.',
    },
    {
      name: 'Reordenar Paradas',
      type: 'Controles Interativos',
      purpose: 'Ajuste manual da sequência logística.',
    },
  ],
  businessRules: [
    'Otimização busca minimizar a distância euclidiana/esférica entre pontos sequenciais.',
    'Prioridade de janelas de atendimento de clientes preferenciais.',
  ],
  agentsAndAutomations: [
    'Algoritmo client-side routingOptimizer.ts para rápida resposta interativa.',
  ],
  validations: ['Pelo menos 2 paradas para cálculo de trajeto.'],
  integrations: ['Serviço de roteirização e entregas cadastradas.'],
  flowsAndDependencies: ['Rotas aprovadas são associadas a viagens ou manifestos de entrega.'],
  dataSourceAndDestination: {
    origin: 'Lista de entregas pendentes da transportadora.',
    destination: 'Manifesto de viagem otimizado.',
    persistence: 'Persistência no registro da viagem.',
  },
  permissions: [{ role: 'Operador e Roteirizador', access: 'Planejamento de rotas.' }],
  notificationsAndErrors: ['Feedback visual na otimização da rota.'],
}

export const CONTROL_TOWER_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Torre de Controle Logística (Tempo Real)',
  screenBadge: 'Operações • Monitoramento Ativo',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Monitoramento em tempo real de todas as operações ativas da transportadora: veículos em trânsito, cumprimento de janelas de entrega (SLA), ocorrências graves que demandam suporte imediato e confirmação de POD.',
  realFeatures: [
    'Dashboard operacional com atualização em tempo real via WebSocket (PocketBase Realtime)',
    'Painel de alertas para entregas atrasadas e ocorrências não resolvidas',
    'Filtro rápido por status, motorista e veículo',
    'Acesso instantâneo ao chamado de ocorrência com registro de providências',
  ],
  fieldsAndButtons: [
    {
      name: 'Filtros Rápidos (Em Rota, Atrasadas, Ocorrências)',
      type: 'Tabs de Navegação',
      purpose: 'Segmenta a atenção operacional.',
    },
    {
      name: 'Resolver Ocorrência',
      type: 'Modal de Ação',
      purpose: 'Registra o plano de contingência para sinistro ou recusa.',
    },
    {
      name: 'Atualização em Tempo Real',
      type: 'Indicador de Conexão',
      purpose: 'Garante que os dados refletem os eventos do campo sem refresh.',
    },
  ],
  businessRules: [
    'Ocorrências críticas não resolvidas em até 60 minutos disparam aviso no painel.',
    'Atualizações recebidas de campo são sincronizadas imediatamente.',
  ],
  agentsAndAutomations: ['Hook de realtime e assinaturas ativas na coleção deliveries.'],
  validations: ['Validação de status permitidos em transição operacional.'],
  integrations: ['Coleções deliveries, trips, vehicles, drivers e incident_logs.'],
  flowsAndDependencies: ['A Torre de Controle é o hub de monitoramento de ponta a ponta da frota.'],
  dataSourceAndDestination: {
    origin: 'Eventos em tempo real da frota e do aplicativo.',
    destination: 'Interface da Torre de Controle.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [
    { role: 'Operador de Torre, Gestor e Admin', access: 'Acesso pleno ao monitoramento.' },
  ],
  notificationsAndErrors: ['Badges pulsantes e alertas sonoros/visuais para ocorrências.'],
}

export const FREIGHT_AUDIT_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Auditoria de Frete & Comprovação (POD)',
  screenBadge: 'Financeiro • Auditoria Fatura',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Conferência do frete cobrado versus acordado, validação do comprovante digital de entrega (POD) e conciliação de adicionais operacionais (diárias de carga/descarga, pedágio, estadias e reentregas) para liberação de pagamento.',
  realFeatures: [
    'Identificação de divergências financeiras entre valor tabelado e valor faturado',
    'Conferência obrigatória do POD com assinatura e geolocalização do cliente',
    'Status de auditoria: Aprovado, Divergente, Pendente POD, Em Análise',
    'Registro de parecer técnico e aprovação com assinatura do auditor',
  ],
  fieldsAndButtons: [
    {
      name: 'Aprovar Frete para Faturamento',
      type: 'Botão de Ação',
      purpose: 'Libera o frete para liquidação financeira.',
    },
    {
      name: 'Apontar Divergência',
      type: 'Ação com Justificativa',
      purpose: 'Retém o pagamento indicando a diferença de valores.',
    },
    {
      name: 'Verificar Comprovante POD',
      type: 'Modal de Imagem',
      purpose: 'Exibe a imagem digitalizada do canhoto assinado.',
    },
  ],
  businessRules: [
    'Fretes com divergência acima de R$ 0,01 exigem aprovação formal de gestor financeiro.',
    'Pagamentos de frete só devem ser liberados mediante apresentação de POD legível.',
  ],
  agentsAndAutomations: ['Cálculo de diferença de frete e auditoria automatizada em background.'],
  validations: ['Divergência matemática estrita e validação de anexo de comprovante.'],
  integrations: ['Coleções deliveries, trips e cte_documents.'],
  flowsAndDependencies: [
    'Fretes auditados e aprovados são liberados para faturamento e pagamento ao terceiro.',
  ],
  dataSourceAndDestination: {
    origin: 'Dados da entrega e comprovantes enviados.',
    destination: 'Campos audit_status e audit_difference na coleção deliveries.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Auditor de Frete, Financeiro e Admin', access: 'Auditoria e aprovação.' }],
  notificationsAndErrors: ['Destaque em vermelho para faturas divergentes.'],
}

export const USERS_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Gestão de Usuários & Acessos (RBAC / LGPD)',
  screenBadge: 'Administração • Governança',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Administrar as contas de acesso ao ED Integração com controle de privilégios baseado em funções (RBAC), conformidade estrita com a LGPD (anonimização com Hash SHA-256 e exportação de dados do titular) e trilha de auditoria de credenciais.',
  realFeatures: [
    'Gestão dos 5 perfis de acesso: Administrador, Gestor Operacional, Operador Logístico, Financeiro e Somente Leitura',
    'Ativação, desativação e bloqueio de usuários',
    'Anonimização irreversível conforme Art. 18 da LGPD com substituição por hash criptográfico',
    'Exportação completa dos dados do titular em formato JSON auditável',
    'Forçar troca de senha no próximo login para novas contas',
  ],
  fieldsAndButtons: [
    {
      name: 'Novo Usuário',
      type: 'Botão de Formulário',
      purpose: 'Cadastra novo operador com seu perfil e cargo.',
    },
    {
      name: 'Anonimizar (LGPD)',
      type: 'Ação Crítica com Modal',
      purpose: 'Exclui dados pessoais preservando integridade das métricas.',
    },
    {
      name: 'Exportar Dados (Art. 19 LGPD)',
      type: 'Ação de Portabilidade',
      purpose: 'Gera arquivo de dados pessoais do titular.',
    },
    {
      name: 'Ativar / Inativar',
      type: 'Toggle de Acesso',
      purpose: 'Revoga acesso sem exclusão de histórico.',
    },
  ],
  businessRules: [
    'Anonimização é irreversível e exige confirmação com digitação do e-mail do titular.',
    'Apenas Administradores podem criar usuários, alterar perfis e disparar anonimização.',
  ],
  agentsAndAutomations: [
    'Toda alteração de usuário é registrada automaticamente em audit_logs com IP e User-Agent.',
  ],
  validations: [
    'Validação de CPF com dígitos verificadores e formato de e-mail corporativo válido.',
  ],
  integrations: ['Coleção users e audit_logs do PocketBase.'],
  flowsAndDependencies: ['Define as permissões de acesso em todos os módulos e menus do sistema.'],
  dataSourceAndDestination: {
    origin: 'Administração de segurança da informação.',
    destination: 'Coleção users do sistema.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Administrador', access: 'Acesso exclusivo para gerenciar usuários.' }],
  notificationsAndErrors: [
    'Toasts de sucesso e confirmação com modal duplo para ações destrutivas.',
  ],
}

export const AUDIT_TRAIL_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Trilha de Auditoria & Segurança (LGPD)',
  screenBadge: 'Governança • Logs Imutáveis',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Registrar e exibir de forma imutável todos os eventos críticos de segurança, login, privacidade e execuções dos agentes autônomos (E-mails e Cargas) para compliance fiscal, auditorias externas e prestação de contas à ANPD.',
  realFeatures: [
    'Visualização cronológica de eventos com data, hora, autor, ação e detalhes técnicos',
    'Filtros por tipo de ação (Logins, Criação de Usuário, Anonimização, Agente de E-mails, Agente de Cargas, etc.)',
    'Inspeção do JSON de detalhes de cada ação executada pelo sistema ou operadores',
    'Busca textual por nome do usuário ou e-mail',
  ],
  fieldsAndButtons: [
    {
      name: 'Filtro por Ação',
      type: 'Seletor de Tipo de Evento',
      purpose: 'Filtra ações específicas de segurança ou agentes.',
    },
    {
      name: 'Ver Detalhes do Evento',
      type: 'Expansão de Linha',
      purpose: 'Exibe o payload técnico de auditoria registrado.',
    },
  ],
  businessRules: [
    'Registros de auditoria são imutáveis (não podem ser alterados nem excluídos via interface).',
    'Qualquer disparo ou aprovação nos agentes autônomos deve constar nesta trilha.',
  ],
  agentsAndAutomations: ['Hooks do PocketBase registram eventos de agentes nesta coleção.'],
  validations: ['Garantia de integridade e registro de ator responsável.'],
  integrations: ['Coleção audit_logs.'],
  flowsAndDependencies: ['Alimentada por todas as ações executadas no sistema.'],
  dataSourceAndDestination: {
    origin: 'Operações de usuários e hooks backend.',
    destination: 'Coleção audit_logs.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Administrador e Auditor', access: 'Consulta aos logs de auditoria.' }],
  notificationsAndErrors: ['Indicadores visuais por severidade do evento.'],
}

export const PRIVACY_POLICY_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Política de Privacidade & Termos LGPD',
  screenBadge: 'Compliance • Lei 13.709/2018',
  lastUpdate: '2026-10-29',
  version: '1.0.0',
  objective:
    'Apresentar os termos de uso, finalidades de tratamento de dados pessoais (motoristas, clientes e operadores), direitos dos titulares previstos na LGPD e registro de consentimento dos usuários da plataforma.',
  realFeatures: [
    'Texto completo da Política de Privacidade detalhando tratamento para fins de transporte rodoviário',
    'Registro da versão aceita pelo usuário autenticado com data e hora no banco de dados',
    'Canais de contato do Encarregado pelo Tratamento de Dados Pessoais (DPO)',
    'Histórico de consentimento e base legal do tratamento (Execução de contrato e obrigação legal fiscal)',
  ],
  fieldsAndButtons: [
    {
      name: 'Aceitar Termos e Continuar',
      type: 'Botão de Consentimento',
      purpose: 'Registra a aceitação da versão vigente da política.',
    },
    {
      name: 'Exportar Termos em PDF/Texto',
      type: 'Opção de Leitura',
      purpose: 'Garante acesso facilitado aos direitos do titular.',
    },
  ],
  businessRules: [
    'Usuários devem estar com a versão vigente da política aceita para operar o sistema.',
  ],
  agentsAndAutomations: ['Registro de consentimento salvo em users e audit_logs.'],
  validations: ['Checagem de versão comparada com CURRENT_PRIVACY_POLICY_VERSION.'],
  integrations: ['Coleções users e audit_logs.'],
  flowsAndDependencies: ['Bloqueia o uso do sistema se a versão vigente não estiver aceita.'],
  dataSourceAndDestination: {
    origin: 'Termos jurídicos da empresa.',
    destination: 'Campos privacy_policy_version e privacy_accepted_at.',
    persistence: 'Banco SQLite via PocketBase.',
  },
  permissions: [{ role: 'Todos os usuários', access: 'Leitura e registro de consentimento.' }],
  notificationsAndErrors: ['Confirmação imediata com toast.'],
}
