// Global datasets for Commercial Company Admin Panel - ATRIA

export const INITIAL_ADMINS = [
  {
    id: 'admin-1',
    name: 'Альберт Цукерберг',
    email: 'a.zuckerberg@atria-rwa.ch',
    role: 'Compliance Officer & AML Chief',
    username: 'admin',
    avatar: 'AC',
    permissions: ['AML Checking', 'KYC Verification', 'System Management', 'User Control']
  },
  {
    id: 'admin-2',
    name: 'Елена Боргезе',
    email: 'e.borghese@atria-rwa.ch',
    role: 'Senior Property Asset Manager',
    username: 'elena',
    avatar: 'EB',
    permissions: ['Property Edit', 'Placements Control', 'Payout Issuance']
  },
  {
    id: 'admin-3',
    name: 'Штефан Келлер',
    email: 's.keller@atria-rwa.ch',
    role: 'Smart Contract Developer',
    username: 'stefan',
    avatar: 'SK',
    permissions: ['Smart Contract Whitelisting', 'Token Minting', 'Security Systems']
  }
];

export const INITIAL_STATS = {
  totalObjects: 6,
  activePlacements: 3,
  totalInvestors: 148,
  totalInvestedVolume: 3240000,
  payoutsDistributed: 154800,
  averageYieldRoi: 7.96,
  kycVerificationRate: 92.4,
  auditLogsCount: 1024,
  totalActiveTokens: 32400,
};

export const INITIAL_PROPERTIES = [
  {
    id: 'prop-1',
    name: 'Вилла Сола Кабиати',
    city: 'Озеро Комо',
    country: 'Италия',
    type: 'Историческая вилла',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800',
    currentValuation: 2450000,
    monthlyYield: 14500,
    roi: 8.28,
    status: 'active', // active, archived, draft
    tokenAddress: '0xAtriaCabiati7f2c69137b003a',
    tokenSymbol: 'ATR-CABIATI',
    tokenPrice: 50,
    completionYear: 1812,
    registrationStatus: 'Registered',
    registrationNumber: 'CH-REG-9812-B',
    whitePaperFile: 'Villa_Sola_Cabiati_White_Paper_v2.pdf',
    appraisalValue: 2450000,
    pledgeStatus: 'Registered Pledge',
    pledgeTrustee: 'Helvetic Trust AG',
    collateralStatus: 'Fully Collateralized',
    blockchainNetwork: 'Ethereum (ERC-20/RWA)',
  },
  {
    id: 'prop-2',
    name: 'Киотское дзен-святилище',
    city: 'Киото',
    country: 'Япония',
    type: 'Бутик-отель',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=800',
    currentValuation: 3200000,
    monthlyYield: 18400,
    roi: 7.85,
    status: 'active',
    tokenAddress: '0xAtriaZenKyoto9a3f2d1e2c',
    tokenSymbol: 'ATR-KYOTO',
    tokenPrice: 35,
    completionYear: 2021,
    registrationStatus: 'Registered',
    registrationNumber: 'CH-REG-1049-A',
    whitePaperFile: 'Kyoto_Zen_Sanctuary_Offering_Memo.pdf',
    appraisalValue: 3150000,
    pledgeStatus: 'Registered Pledge',
    pledgeTrustee: 'Glarus Custody AG',
    collateralStatus: 'Fully Collateralized',
    blockchainNetwork: 'Arbitrum (RWA Layer)',
  },
  {
    id: 'prop-3',
    name: 'Монастырь Брунеллески',
    city: 'Флоренция',
    country: 'Италия',
    type: 'Реконструированная резиденция',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
    currentValuation: 1650000,
    monthlyYield: 9100,
    roi: 7.28,
    status: 'active',
    tokenAddress: '0xAtriaBrunelleschi3b4e',
    tokenSymbol: 'ATR-BRUNEL',
    tokenPrice: 75,
    completionYear: 1540,
    registrationStatus: 'Registered',
    registrationNumber: 'CH-REG-3051-D',
    whitePaperFile: 'Brunelleschi_Cloister_White_Paper_v1.1.pdf',
    appraisalValue: 1680000,
    pledgeStatus: 'Registered Pledge',
    pledgeTrustee: 'Helvetic Trust AG',
    collateralStatus: 'Fully Collateralized',
    blockchainNetwork: 'Ethereum (ERC-20/RWA)',
  },
  {
    id: 'prop-4',
    name: 'Бруталистская вилла на скале',
    city: 'Майорка',
    country: 'Испания',
    type: 'Бетонный павильон',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
    currentValuation: 2340000,
    monthlyYield: 13200,
    roi: 7.92,
    status: 'active',
    tokenAddress: '0xAtriaBrutalistClipped1d8b',
    tokenSymbol: 'ATR-BRUTAL',
    tokenPrice: 40,
    completionYear: 2023,
    registrationStatus: 'Registered',
    registrationNumber: 'CH-REG-8720-F',
    whitePaperFile: 'Mallorca_Brutalist_Villa_RWA_Offering.pdf',
    appraisalValue: 2340000,
    pledgeStatus: 'Registered Pledge',
    pledgeTrustee: 'Zurich Securitisation Ltd',
    collateralStatus: 'Fully Collateralized',
    blockchainNetwork: 'Polygon (POS Token)',
  },
  {
    id: 'prop-5',
    name: 'Коттеджи на норвежских фьордах',
    city: 'Лофотенские острова',
    country: 'Норвегия',
    type: 'Эко-комплекс',
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=800',
    currentValuation: 4500000,
    monthlyYield: 24500,
    roi: 8.45,
    status: 'draft',
    tokenAddress: '0xAtriaNorwayFjords8d2a3',
    tokenSymbol: 'ATR-NORWAY',
    tokenPrice: 100,
    completionYear: 2024,
    registrationStatus: 'Pending Review',
    registrationNumber: 'CH-REG-PENDING-4',
    whitePaperFile: 'Lofoten_Norway_Eco_Lodges_WP.pdf',
    appraisalValue: 4400000,
    pledgeStatus: 'Pending Appraisal',
    pledgeTrustee: 'Helvetic Trust AG',
    collateralStatus: '90% Appraisal Registered',
    blockchainNetwork: 'Ethereum (ERC-20/RWA)',
  },
  {
    id: 'prop-6',
    name: 'Дом в стиле Баухаус',
    city: 'Дессау',
    country: 'Германия',
    type: 'Модернистский дуплекс',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
    currentValuation: 3800000,
    monthlyYield: 19800,
    roi: 6.95,
    status: 'archived',
    tokenAddress: '0xAtriaBauhausDessau4f6e',
    tokenSymbol: 'ATR-BAUHAUS',
    tokenPrice: 200,
    completionYear: 1928,
    registrationStatus: 'Archived',
    registrationNumber: 'CH-REG-2089-K',
    whitePaperFile: 'Dessau_Bauhaus_Duplex_Offering_Final.pdf',
    appraisalValue: 3850000,
    pledgeStatus: 'Liquidated / Discharged',
    pledgeTrustee: 'Glarus Custody AG',
    collateralStatus: 'Discharged on Exited Public Sale',
    blockchainNetwork: 'Arbitrum (RWA Layer)',
  }
];

export const INITIAL_PLACEMENTS = [
  {
    id: 'place-1',
    propertyId: 'prop-1',
    propertyName: 'Вилла Сола Кабиати',
    targetAmount: 500000,
    raisedAmount: 385000,
    tokenSupply: 10000,
    tokenPrice: 50,
    status: 'active', // active, paused, completed, failed
    launchDate: '2026-05-15',
    endDate: '2026-08-15',
    investorsCount: 34,
    description: 'Публичное предложение инвестиций в историческую недвижимость озера Комо.',
    whitelistRequired: true,
  },
  {
    id: 'place-2',
    propertyId: 'prop-3',
    propertyName: 'Монастырь Брунеллески',
    targetAmount: 800000,
    raisedAmount: 800000,
    tokenSupply: 10666,
    tokenPrice: 75,
    status: 'completed',
    launchDate: '2026-03-01',
    endDate: '2026-05-30',
    investorsCount: 52,
    description: 'Полностью закрытый раунд привлечения капитала для токенизации резиденции Брунеллески.',
    whitelistRequired: true,
  },
  {
    id: 'place-3',
    propertyId: 'prop-4',
    propertyName: 'Бруталистская вилла на скале',
    targetAmount: 600000,
    raisedAmount: 185000,
    tokenSupply: 15000,
    tokenPrice: 40,
    status: 'paused',
    launchDate: '2026-06-01',
    endDate: '2026-09-01',
    investorsCount: 18,
    description: 'Временная приостановка в связи с уточнением кадастрового плана острова Майорка.',
    whitelistRequired: true,
  },
  {
    id: 'place-4',
    propertyId: 'prop-5',
    propertyName: 'Коттеджи на норвежских фьордах',
    targetAmount: 1200000,
    raisedAmount: 0,
    tokenSupply: 12000,
    tokenPrice: 100,
    status: 'draft',
    launchDate: '2026-08-01',
    endDate: '2026-11-01',
    investorsCount: 0,
    description: 'Проект выпуска токенов для эко-курорта на Лофотенах.',
    whitelistRequired: true,
  }
];

export const INITIAL_INVESTORS = [
  {
    id: 'inv-1',
    name: 'Азамат Исмаилов',
    email: 'a.ismailov@invest.kg',
    walletAddress: '0x7F2C9A3F3B4E1D8B8D2A4F6E6B1c2D3e4F5a6B7c',
    kycStatus: 'Approved', // Approved, Pending, Failed, Suspended
    amlRisk: 'Low', // Low, Medium, High, Flagged
    pepStatus: 'Non-PEP Verified', // Non-PEP, PEP, Alert
    verificationDate: '2026-01-10',
    status: 'Active', // Active, Blocked
    nationalID: 'KG-ID-201048392',
    country: 'Кыргызстан (КР)',
    holdings: [
      { propertyId: 'prop-1', tokensOwned: 4250, value: 210000, activePlacementId: 'place-1' },
      { propertyId: 'prop-2', tokensOwned: 8500, value: 280000, activePlacementId: null },
      { propertyId: 'prop-3', tokensOwned: 2100, value: 150000, activePlacementId: 'place-2' }
    ]
  },
  {
    id: 'inv-2',
    name: 'Айсулуу Асанова',
    email: 'aisuluu.asanova@gfc.kg',
    walletAddress: '0x9E10B38AD43A2C10D8C8E19B2783F415E98B10A2',
    kycStatus: 'Approved',
    amlRisk: 'Low',
    pepStatus: 'Non-PEP Verified',
    verificationDate: '2026-02-14',
    status: 'Active',
    nationalID: 'KG-ID-108492048',
    country: 'Кыргызстан (КР)',
    holdings: [
      { propertyId: 'prop-2', tokensOwned: 12000, value: 420000, activePlacementId: null },
      { propertyId: 'prop-4', tokensOwned: 3500, value: 140000, activePlacementId: 'place-3' }
    ]
  },
  {
    id: 'inv-3',
    name: 'Бакыт Мамытов',
    email: 'b.mamytov@bishkek-capital.kg',
    walletAddress: '0x3C81B283A412D10E398B19C0C3058D10E98A0D10',
    kycStatus: 'Approved',
    amlRisk: 'Low',
    pepStatus: 'Audit Pending',
    verificationDate: '2026-06-18',
    status: 'Active',
    nationalID: 'KG-ID-301984209',
    country: 'Кыргызстан (КР)',
    holdings: [
      { propertyId: 'prop-1', tokensOwned: 1000, value: 50000, activePlacementId: 'place-1' }
    ]
  },
  {
    id: 'inv-4',
    name: 'Нурбек Касымов',
    email: 'n.kasymov@rwa.kg',
    walletAddress: '0xf8E12A109D439CE230D8D902B3019A82C0E1B098',
    kycStatus: 'Approved',
    amlRisk: 'Low',
    pepStatus: 'Non-PEP Verified',
    verificationDate: '2026-03-29',
    status: 'Active',
    nationalID: 'KG-ID-481903022',
    country: 'Кыргызстан (КР)',
    holdings: [
      { propertyId: 'prop-3', tokensOwned: 4000, value: 300000, activePlacementId: 'place-2' }
    ]
  },
  {
    id: 'inv-5',
    name: 'Каныкей Осмонова',
    email: 'kanykey.osmonova@it-holding.kg',
    walletAddress: '0x8823FB819DC2C182A9C0E3A20B19A2D0E8B19B27',
    kycStatus: 'Approved',
    amlRisk: 'Low',
    pepStatus: 'Non-PEP Verified',
    verificationDate: '2026-05-02',
    status: 'Active',
    nationalID: 'KG-ID-702981315',
    country: 'Кыргызстан (КР)',
    holdings: [
      { propertyId: 'prop-1', tokensOwned: 5000, value: 250000, activePlacementId: 'place-1' }
    ]
  }
];

export const INITIAL_PAYOUTS = [
  {
    id: 'pay-1',
    propertyName: 'Вилла Сола Кабиати',
    propertyId: 'prop-1',
    amount: 14500,
    period: 'Июнь 2026',
    dateCreated: '2026-06-25',
    status: 'pending', // pending, processing, confirmed
    transactionsCount: 34,
    method: 'Smart Contract Distribution'
  },
  {
    id: 'pay-2',
    propertyName: 'Киотское дзен-святилище',
    propertyId: 'prop-2',
    amount: 18400,
    period: 'Июнь 2026',
    dateCreated: '2026-06-25',
    status: 'confirmed',
    transactionsCount: 41,
    method: 'Smart Contract Distribution'
  },
  {
    id: 'pay-3',
    propertyName: 'Монастырь Брунеллески',
    propertyId: 'prop-3',
    amount: 9100,
    period: 'Июнь 2026',
    dateCreated: '2026-06-25',
    status: 'confirmed',
    transactionsCount: 18,
    method: 'Smart Contract Distribution'
  },
  {
    id: 'pay-4',
    propertyName: 'Бруталистская вилла на скале',
    propertyId: 'prop-4',
    amount: 13200,
    period: 'Май 2026',
    dateCreated: '2026-05-25',
    status: 'confirmed',
    transactionsCount: 22,
    method: 'Smart Contract Distribution'
  }
];

export const INITIAL_DOCUMENTS = [
  {
    id: 'doc-1',
    title: 'Решение о регистрации залога Villa Sola Cabiati (CH-78a)',
    category: 'collateral',
    propertyName: 'Вилла Сола Кабиати',
    propertyId: 'prop-1',
    dateStr: '2026-05-18',
    fileSize: '3.4 MB',
    status: 'Registered',
  },
  {
    id: 'doc-2',
    title: 'Экспертная финансовая оценка Kyoto Zen Sanctuary (Savills Asia)',
    category: 'valuation',
    propertyName: 'Киотское дзен-святилище',
    propertyId: 'prop-2',
    dateStr: '2026-04-05',
    fileSize: '7.2 MB',
    status: 'Valid',
  },
  {
    id: 'doc-3',
    title: 'Смарт-контракт публичного предложения ATR-BRUNEL v1.0',
    category: 'legal',
    propertyName: 'Монастырь Брунеллески',
    propertyId: 'prop-3',
    dateStr: '2026-02-28',
    fileSize: '1.8 MB',
    status: 'Audited',
  },
  {
    id: 'doc-4',
    title: 'Свидетельство о праве залога и назначении Helvetic Trust AG',
    category: 'collateral',
    propertyName: 'Монастырь Брунеллески',
    propertyId: 'prop-3',
    dateStr: '2026-02-27',
    fileSize: '4.1 MB',
    status: 'Registered',
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Начало публичного предложения (Public Offering) по ATR-CABIATI',
    recipientGroup: 'All Whitelisted Investors',
    dateSent: '2026-05-15 10:00',
    deliveryStatus: 'Delivered (142 users)',
    content: 'Уведомляем о начале открытого предложения долей. Спецификации White Paper доступны для загрузки.'
  },
  {
    id: 'notif-2',
    title: 'Завершение процедуры AML по инвесторам размещения ATR-BRUNEL',
    recipientGroup: 'Compliance Admins',
    dateSent: '2026-05-30 18:30',
    deliveryStatus: 'Sent',
    content: 'Все инвесторы закрытого выпуска успешно прошли вторичный санкционный скрининг. Нарушений не выявлено.'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'audit-1',
    timestamp: '2026-07-06 22:15:30',
    adminName: 'Альберт Цукерберг',
    action: 'Whitelist Approved',
    details: 'Добавлен кошелек 0x7F2C9A3F...3e4F инвестора Жан-Пьер Сутер в смарт-контракт ATR-CABIATI.',
    status: 'SUCCESS',
  },
  {
    id: 'audit-2',
    timestamp: '2026-07-06 21:44:12',
    adminName: 'Елена Боргезе',
    action: 'Property Draft Saved',
    details: 'Создан черновик объекта "Коттеджи на норвежских фьордах". Загружена финансовая модель.',
    status: 'SUCCESS',
  },
  {
    id: 'audit-3',
    timestamp: '2026-07-06 20:10:05',
    adminName: 'Штефан Келлер',
    action: 'Smart Contract Deploy',
    details: 'Успешно деплоирован смарт-контракт токенизации ATR-CABIATI на Arbitrum One.',
    status: 'SUCCESS',
  },
  {
    id: 'audit-4',
    timestamp: '2026-07-06 19:33:41',
    adminName: 'Альберт Цукерберг',
    action: 'PEP Check Triggered',
    details: 'Обнаружена санкционная тревога средней критичности для кошелька 0xf8E12A...B098.',
    status: 'WARNING',
  },
  {
    id: 'audit-5',
    timestamp: '2026-07-06 18:12:00',
    adminName: 'Елена Боргезе',
    action: 'Payout Initiated',
    details: 'Создана платежная ведомость по выплатам за Июнь 2026 по Вилле Сола Кабиати ($14,500).',
    status: 'SUCCESS',
  },
  {
    id: 'audit-6',
    timestamp: '2026-07-06 15:02:18',
    adminName: 'Системный скрипт AML',
    action: 'AML Automated Monitor',
    details: 'Блокировка аккаунта инвестора Амаль аль-Мансури (0x8823FB...) из-за санкционного совпадения SDN OFAC.',
    status: 'ALERT',
  }
];

export const INITIAL_INTEGRATIONS = [
  {
    id: 'int-1',
    exchangeName: 'SIX Digital Exchange (SDX)',
    status: 'Connected', // Connected, Syncing, Disconnected
    endpoint: 'https://api.sdx.eth.swiss/v2/rwa-custody',
    lastSync: '2026-07-06 22:00',
    syncedTokensCount: 3,
    payoutBridgeEnabled: true,
  },
  {
    id: 'int-2',
    exchangeName: 'Helvetic Secondary Board',
    status: 'Connected',
    endpoint: 'https://hsb-trade.ch/api/v1/whitelist-feed',
    lastSync: '2026-07-06 21:30',
    syncedTokensCount: 2,
    payoutBridgeEnabled: false,
  },
  {
    id: 'int-3',
    exchangeName: 'Singapore Token Exchange (SGX-i)',
    status: 'Syncing',
    endpoint: 'https://sgx-i-sandbox.com.sg/gate',
    lastSync: '2026-07-06 22:10',
    syncedTokensCount: 0,
    payoutBridgeEnabled: true,
  }
];

export const INITIAL_NEWS_PUBLICATIONS = [
  {
    id: 'pub-1',
    title: 'Отчет об операционной доходности Виллы Сола Кабиати за 1 кв. 2026 года',
    date: '2026-04-15',
    propertyId: 'prop-1',
    propertyName: 'Вилла Сола Кабиати',
    type: 'Financial Report',
    summary: 'Доходность превысила плановые показатели на 4.2% благодаря повышенному спросу на аренду в весенний сезон.',
    status: 'Published'
  },
  {
    id: 'pub-2',
    title: 'Завершение реставрационных работ фасада в монастыре Брунеллески',
    date: '2026-05-20',
    propertyId: 'prop-3',
    propertyName: 'Монастырь Брунеллески',
    type: 'News Release',
    summary: 'Реставрация завершена с опережением графика. Это увеличивает долгосрочную оценочную стоимость актива на 5%.',
    status: 'Published'
  },
  {
    id: 'pub-3',
    title: 'Оценочная ведомость для Киотского дзен-святилища от Cushman & Wakefield',
    date: '2026-06-10',
    propertyId: 'prop-2',
    propertyName: 'Киотское дзен-святилище',
    type: 'Valuation Audit',
    summary: 'Оценочная стоимость подтверждена на уровне 3.2 млн долларов США. Прогноз на 3-й квартал стабильный.',
    status: 'Published'
  }
];

export const INITIAL_TICKETS = [
  {
    id: 'tkt-1',
    investorId: 'inv-1',
    investorName: 'Жан-Пьер Сутер',
    investorEmail: 'j.suter@swissfunds.ch',
    subject: 'Задержка при начислении дивидендов KGS',
    category: 'Выплаты',
    priority: 'High',
    status: 'Open', // Open, Answered, Resolved
    createdAt: '2026-07-06 18:30:15',
    updatedAt: '2026-07-06 18:30:15',
    messages: [
      {
        id: 'msg-1-1',
        sender: 'investor',
        senderName: 'Жан-Пьер Сутер',
        timestamp: '2026-07-06 18:30:15',
        text: 'Приветствую! Я заметил, что зачисление токенов выплат KGS по объекту "Вилла Сола Кабиати" задерживается на моем кошельке 0x7F2C... Можете проверить статус транзакции? В швейцарском банке-депозитарии мне сообщили, что реестр обновлен.'
      }
    ]
  },
  {
    id: 'tkt-2',
    investorId: 'inv-3',
    investorName: 'Маркус О’Лири',
    investorEmail: 'oleary.m@dublininvestments.ie',
    subject: 'Статус прохождения проверки KYC',
    category: 'Верификация',
    priority: 'Medium',
    status: 'Answered',
    createdAt: '2026-07-05 11:20:00',
    updatedAt: '2026-07-06 10:15:00',
    messages: [
      {
        id: 'msg-2-1',
        sender: 'investor',
        senderName: 'Маркус О’Лири',
        timestamp: '2026-07-05 11:20:00',
        text: 'Здравствуйте. Я отправил все необходимые документы (ID, подтверждение адреса) три дня назад. Мой статус до сих пор отображается как "В обработке" (Pending). Буду благодарен за информацию.'
      },
      {
        id: 'msg-2-2',
        sender: 'support',
        senderName: 'Адилет Оморов (Compliance)',
        timestamp: '2026-07-06 10:15:00',
        text: 'Уважаемый Маркус, здравствуйте! Ваши документы находятся на финальной стадии проверки отделом комплаенса. Мы ожидаем подтверждения со стороны нашего банка-партнера до конца сегодняшнего дня. Спасибо за ваше терпение.'
      }
    ]
  },
  {
    id: 'tkt-3',
    investorId: 'inv-2',
    investorName: 'Акайо Танака',
    investorEmail: 't.akayo@tokyocryptofund.jp',
    subject: 'Синхронизация вайтлиста с Arbitrum-нодой',
    category: 'Технические вопросы',
    priority: 'Low',
    status: 'Resolved',
    createdAt: '2026-07-04 09:12:00',
    updatedAt: '2026-07-05 16:40:00',
    messages: [
      {
        id: 'msg-3-1',
        sender: 'investor',
        senderName: 'Акайо Танака',
        timestamp: '2026-07-04 09:12:00',
        text: 'При попытке подписать транзакцию покупки на вторичном рынке возникает ошибка "Not in whitelist". Хотя в личном кабинете написано, что я верифицирован. Пожалуйста, синхронизируйте мой адрес 0x9E10...'
      },
      {
        id: 'msg-3-2',
        sender: 'support',
        senderName: 'Данияр Токтогулов (IT)',
        timestamp: '2026-07-05 16:30:00',
        text: 'Приветствуем! Мы провели принудительную ресинхронизацию пула смарт-контрактов на сети Arbitrum. Пожалуйста, попробуйте совершить транзакцию еще раз.'
      },
      {
        id: 'msg-3-3',
        sender: 'investor',
        senderName: 'Акайо Танака',
        timestamp: '2026-07-05 16:40:00',
        text: 'Спасибо, теперь все работает идеально! Ордер успешно исполнен.'
      }
    ]
  },
  {
    id: 'tkt-4',
    investorId: 'inv-4',
    investorName: 'Алексей Назаров',
    investorEmail: 'nazarov.al@cyprusestates.cy',
    subject: 'Запрос на изменение юридического адреса фирмы',
    category: 'Юридические вопросы',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-07-07 02:15:30',
    updatedAt: '2026-07-07 02:15:30',
    messages: [
      {
        id: 'msg-4-1',
        sender: 'investor',
        senderName: 'Алексей Назаров',
        timestamp: '2026-07-07 02:15:30',
        text: 'Добрый день. Наша кипрская холдинговая компания сменила юридический адрес. Нам нужно обновить корпоративные данные в реестре RWA, чтобы выплаты дивидендов зачислялись на новый субсчет. Документы о редомициляции прикреплены.'
      }
    ]
  }
];

