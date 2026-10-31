migrate(
  (app) => {
    const tabelasCol = app.findCollectionByNameOrId('piso_minimo_tabelas')
    const coefsCol = app.findCollectionByNameOrId('piso_minimo_coeficientes')

    // 1. Inserir tabela de coeficientes oficial ANTT Resolução nº 6.059/2024 (vigência Jan/2025)
    const tabelaRec = new Record(tabelasCol)
    tabelaRec.set('version_code', 'ANTT-RES-6059-2024')
    tabelaRec.set('name', 'Tabela Oficial ANTT 2025.1 — Resolução nº 6.059/2024')
    tabelaRec.set(
      'legal_act',
      'Resolução ANTT nº 6.059, de 27 de dezembro de 2024 (altera Anexo II da Resolução nº 5.867/2020)',
    )
    tabelaRec.set(
      'source_url',
      'https://anttlegis.antt.gov.br/action/ActionDatalegis.php?acao=abrirTextoAto&cod_modulo=161&numeroAto=00006059&valorAno=2024',
    )
    tabelaRec.set('effective_from', '2025-01-01T00:00:00.000Z')
    tabelaRec.set('is_current', true)
    tabelaRec.set('validation_status', 'oficial_validada')
    tabelaRec.set('diesel_reference_price', 5.94)
    tabelaRec.set('ipca_accumulated_percent', 2.84)
    tabelaRec.set(
      'notes',
      'Coeficientes oficiais CCD (Custo Deslocamento R$/km) e CC (Carga e Descarga R$) para Lotação (Tabela A) e Veículo Automotor (Tabela B), conforme Resolução ANTT nº 6.059/2024 e Lei nº 13.703/2018.',
    )
    tabelaRec.set('imported_by', 'Sistema Automático TMS')
    app.save(tabelaRec)

    // Dados oficiais extraídos diretamente do DOU / ANTTlegis da Resolução nº 6.059/2024:
    // Tabela A - Transporte Rodoviário de Carga Lotação
    // Cada item tem: cargo_category, cargo_category_label, ccd_by_axle: { 2, 3, 4, 5, 6, 7, 9 }, cc_by_axle: { 2, 3, 4, 5, 6, 7, 9 }
    const tabelaAData = [
      {
        category: 'granel_solido',
        label: 'Granel Sólido',
        ccd: { 2: 3.656, 3: 4.629, 4: 5.285, 5: 5.6195, 6: 6.2731, 7: 7.2163, 9: 8.1375 },
        cc: { 2: 413.06, 3: 503.16, 4: 547.19, 5: 503.06, 6: 534.98, 7: 729.94, 9: 782.5 },
      },
      {
        category: 'granel_liquido',
        label: 'Granel Líquido',
        ccd: { 2: 3.7114, 3: 4.7006, 4: 5.494, 5: 5.7648, 6: 6.4089, 7: 7.3706, 9: 8.3015 },
        cc: { 2: 420.01, 3: 514.58, 4: 588.12, 5: 526.44, 6: 555.76, 7: 755.8, 9: 811.04 },
      },
      {
        category: 'frigorificada',
        label: 'Frigorificada ou Aquecida',
        ccd: { 2: 4.2873, 3: 5.3966, 4: 6.2691, 5: 6.6945, 6: 7.4265, 7: 8.6788, 9: 9.748 },
        cc: { 2: 470.77, 3: 563.73, 4: 641.71, 5: 597.75, 6: 623.07, 7: 903.05, 9: 961.91 },
      },
      {
        category: 'conteinerizada',
        label: 'Conteinerizada',
        ccd: { 3: 4.7018, 4: 5.2212, 5: 5.5496, 6: 6.1969, 7: 7.2549, 9: 8.0893 },
        cc: { 3: 523.18, 4: 529.65, 5: 483.84, 6: 514.02, 7: 740.55, 9: 769.24 },
      },
      {
        category: 'carga_geral',
        label: 'Carga Geral',
        ccd: { 2: 3.6255, 3: 4.593, 4: 5.2636, 5: 5.6013, 6: 6.2628, 7: 7.2119, 9: 8.1626 },
        cc: { 2: 404.67, 3: 493.25, 4: 541.33, 5: 498.04, 6: 532.13, 7: 728.74, 9: 789.41 },
      },
      {
        category: 'neogranel',
        label: 'Neogranel',
        ccd: { 2: 3.2916, 3: 4.5923, 4: 5.2754, 5: 5.5924, 6: 6.2558, 7: 7.2515, 9: 8.1557 },
        cc: { 2: 404.67, 3: 493.06, 4: 544.57, 5: 495.6, 6: 530.22, 7: 739.6, 9: 787.5 },
      },
      {
        category: 'perigosa_granel_solido',
        label: 'Perigosa (Granel Sólido)',
        ccd: { 2: 4.359, 3: 5.332, 4: 6.0342, 5: 6.3687, 6: 7.0223, 7: 7.9935, 9: 8.9441 },
        cc: { 2: 547.62, 3: 637.73, 4: 689.83, 5: 645.7, 6: 677.62, 7: 880.27, 9: 940.93 },
      },
      {
        category: 'perigosa_granel_liquido',
        label: 'Perigosa (Granel Líquido)',
        ccd: { 2: 4.426, 3: 5.4152, 4: 6.2247, 5: 6.4955, 6: 7.1396, 7: 8.1293, 9: 9.0896 },
        cc: { 2: 566.04, 3: 660.62, 4: 742.24, 5: 680.55, 6: 709.88, 7: 917.61, 9: 980.95 },
      },
      {
        category: 'perigosa_frigorificada',
        label: 'Perigosa (Frigorificada ou Aquecida)',
        ccd: { 2: 4.8379, 3: 5.9472, 4: 6.8507, 5: 7.2761, 6: 8.0081, 7: 9.2967, 9: 10.4042 },
        cc: { 2: 570.02, 3: 662.98, 4: 751.48, 5: 707.52, 6: 732.84, 7: 1022.8, 9: 1092.2 },
      },
      {
        category: 'perigosa_conteinerizada',
        label: 'Perigosa (Conteinerizada)',
        ccd: { 3: 5.0391, 4: 5.6047, 5: 5.9331, 6: 6.5804, 7: 7.6664, 9: 8.5302 },
        cc: { 3: 611.3, 4: 625.86, 5: 580.04, 6: 610.22, 7: 844.45, 9: 881.24 },
      },
      {
        category: 'perigosa_carga_geral',
        label: 'Perigosa (Carga Geral)',
        ccd: { 2: 3.9628, 3: 4.9302, 4: 5.6471, 5: 5.9847, 6: 6.6462, 7: 7.6234, 9: 8.6035 },
        cc: { 2: 492.8, 3: 581.37, 4: 637.53, 5: 594.24, 6: 628.33, 7: 832.63, 9: 901.4 },
      },
      {
        category: 'granel_pressurizada',
        label: 'Carga Granel Pressurizada',
        ccd: { 5: 5.8928, 6: 6.6079, 9: 8.5818 },
        cc: { 5: 578.22, 6: 627.03, 9: 904.69 },
      },
    ]

    for (let item of tabelaAData) {
      const axlesList = [2, 3, 4, 5, 6, 7, 9]
      for (let ax of axlesList) {
        if (item.ccd[ax] !== undefined && item.cc[ax] !== undefined) {
          const rec = new Record(coefsCol)
          rec.set('table_id', tabelaRec.id)
          rec.set('table_type', 'tabela_a')
          rec.set('cargo_category', item.category)
          rec.set('cargo_category_label', item.label)
          rec.set('axles', ax)
          rec.set('ccd_cost_per_km', item.ccd[ax])
          rec.set('cc_loading_unloading', item.cc[ax])
          app.save(rec)
        }
      }
    }

    // Tabela B - Operações com contratação apenas do veículo automotor (tração)
    const tabelaBData = [
      {
        category: 'carga_geral',
        label: 'Carga Geral (Apenas Cavalo)',
        ccd: { 4: 4.7436, 5: 5.283, 6: 5.9648, 7: 6.3285, 9: 6.9138 },
        cc: { 4: 495.49, 5: 539.23, 6: 578.93, 7: 655.73, 9: 679.04 },
      },
      {
        category: 'granel_solido',
        label: 'Granel Sólido (Apenas Cavalo)',
        ccd: { 4: 4.7436, 5: 5.283, 6: 5.9648, 7: 6.3285, 9: 6.9138 },
        cc: { 4: 495.49, 5: 539.23, 6: 578.93, 7: 655.73, 9: 679.04 },
      },
      {
        category: 'frigorificada',
        label: 'Frigorificada (Apenas Cavalo)',
        ccd: { 4: 5.5484, 5: 6.1779, 6: 6.9622, 7: 7.3538, 9: 8.0937 },
        cc: { 4: 540.69, 5: 584.43, 6: 624.13, 7: 708.62, 9: 740.03 },
      },
    ]

    for (let item of tabelaBData) {
      const axlesList = [4, 5, 6, 7, 9]
      for (let ax of axlesList) {
        if (item.ccd[ax] !== undefined && item.cc[ax] !== undefined) {
          const rec = new Record(coefsCol)
          rec.set('table_id', tabelaRec.id)
          rec.set('table_type', 'tabela_b')
          rec.set('cargo_category', item.category)
          rec.set('cargo_category_label', item.label)
          rec.set('axles', ax)
          rec.set('ccd_cost_per_km', item.ccd[ax])
          rec.set('cc_loading_unloading', item.cc[ax])
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // Reversão
    try {
      const tabs = app.findRecordsByFilter(
        'piso_minimo_tabelas',
        "version_code = 'ANTT-RES-6059-2024'",
        '',
        1,
        0,
      )
      if (tabs.length > 0) {
        app.delete(tabs[0])
      }
    } catch (_) {}
  },
)
