// Global datasets for Realtor Dashboard CRM Panel - ATRIA
//
// Профили риелторов остаются мок-данными: ATRIA API на логине возвращает только
// токены, без профиля. Пароли здесь не хранятся — их проверяет сервер.

export const INITIAL_REALTORS = [
  {
    id: 'realtor-1',
    name: 'Анна Демидова',
    email: 'a.demidova@atria-realestate.ch',
    role: 'Ведущий брокер по элитной недвижимости',
    username: 'realtor',
    avatar: 'AD',
    phone: '+41 79 123 45 67',
    companyName: 'Atria Real Estate Zurich AG',
    companyAddress: 'Bahnhofstrasse 102, 8001 Zürich',
    companyReg: 'CHE-104.928.311',
    cryptoWallet: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B'
  },
  {
    id: 'realtor-2',
    name: 'Иван Кузнецов',
    email: 'i.kuznetsov@atria-realestate.ch',
    role: 'Эксперт по историческому наследию',
    username: 'ivan',
    avatar: 'IK',
    phone: '+41 79 987 65 43',
    companyName: 'Atria Real Estate Zurich AG',
    companyAddress: 'Bahnhofstrasse 102, 8001 Zürich',
    companyReg: 'CHE-104.928.311',
    cryptoWallet: '0x281055afC982d96fAB65b3a49cAc8b878184Cb16'
  }
];

export const INITIAL_PROPERTIES = [
  {
    id: 'prop-1',
    name: 'Вилла Сола Кабиати',
    city: 'Озеро Комо',
    country: 'Италия',
    address: 'Via Statale 12, Tremezzina',
    type: 'Жилая недвижимость',
    price: 2450000,
    area: 520, // sqm
    description: 'Великолепная вилла XVIII века на берегу озера Комо с сохранившимися фресками школы Тьеполо, ухоженным террасным итальянским садом и частным причалом. Идеально отреставрированные интерьеры сочетают историческую роскошь и современные инженерные системы.',
    status: 'published', // 'draft', 'submitted', 'review', 'needs_improvement', 'approved', 'rejected', 'published'
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-06-15 10:24',
    publishedAt: '2026-06-20 14:00',
    history: [
      { date: '2026-06-15 10:24', action: 'Создание черновика', user: 'Анна Демидова' },
      { date: '2026-06-15 11:45', action: 'Добавлены правоустанавливающие документы', user: 'Анна Демидова' },
      { date: '2026-06-16 09:00', action: 'Отправлено на проверку', user: 'Анна Демидова' },
      { date: '2026-06-18 13:12', action: 'Статус изменен на: На рассмотрении', user: 'Управляющая компания' },
      { date: '2026-06-19 16:30', action: 'Объект одобрен для публикации', user: 'Управляющая компания' },
      { date: '2026-06-20 14:00', action: 'Объект успешно опубликован на платформе', user: 'Система' }
    ],
    documents: [
      { id: 'doc-1-1', name: 'Выписка_из_реестра_Комо_Sola_Cabiati.pdf', type: 'title', status: 'verified', size: '3.1 MB', date: '2026-06-15' },
      { id: 'doc-1-2', name: 'Отчет_об_оценке_Sotheby_Estates.pdf', type: 'valuation', status: 'verified', size: '5.4 MB', date: '2026-06-15' },
      { id: 'doc-1-3', name: 'Архитектурный_план_помещений.pdf', type: 'plan', status: 'verified', size: '12.8 MB', date: '2026-06-15' }
    ],
    comments: [
      { id: 'comm-1-1', sender: 'manager', senderName: 'Маркус Вебер (УК)', text: 'Приветствуем! Документы проверены юридическим отделом. Всё в полном порядке. Оценка совпадает с нашими внутренними индикаторами.', date: '2026-06-19 15:20' },
      { id: 'comm-1-2', sender: 'realtor', senderName: 'Анна Демидова', text: 'Спасибо за оперативную работу! Завтра пришлю фотографии в дополнительном разрешении, если потребуется.', date: '2026-06-19 15:45' }
    ]
  },
  {
    id: 'prop-2',
    name: 'Киотское дзен-святилище',
    city: 'Киото',
    country: 'Япония',
    address: '23 Gionmachi Minamigawa, Higashiyama Ward',
    type: 'Коммерческая недвижимость',
    price: 3200000,
    area: 380,
    description: 'Отреставрированная традиционная усадьба (матиа) в историческом квартале Гион. Аутентичная японская архитектура сочетается с технологиями умного дома, панорамной SPA-зоной и чайной комнатой с видом на миниатюрный сад камней.',
    status: 'review',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-06-25 11:15',
    history: [
      { date: '2026-06-25 11:15', action: 'Создание черновика', user: 'Анна Демидова' },
      { date: '2026-06-25 12:40', action: 'Загружены фотографии объекта', user: 'Анна Демидова' },
      { date: '2026-06-28 10:00', action: 'Отправлено на проверку', user: 'Анна Демидова' },
      { date: '2026-07-02 09:30', action: 'Статус изменен на: На рассмотрении', user: 'Управляющая компания' }
    ],
    documents: [
      { id: 'doc-2-1', name: 'Kyoto_Property_Title_Registry.pdf', type: 'title', status: 'verified', size: '2.8 MB', date: '2026-06-25' },
      { id: 'doc-2-2', name: 'Zen_Sanctuary_Evaluation_Report.pdf', type: 'valuation', status: 'pending', size: '4.2 MB', date: '2026-06-25' }
    ],
    comments: [
      { id: 'comm-2-1', sender: 'manager', senderName: 'Елена Боргезе (УК)', text: 'Начали детальное рассмотрение объекта. Пожалуйста, убедитесь, что земельный кадастровый план охватывает зону восточной стены.', date: '2026-07-02 11:10' },
      { id: 'comm-2-2', sender: 'realtor', senderName: 'Анна Демидова', text: 'Добрый день! Да, в документе Kyoto_Property_Title_Registry.pdf на стр. 14 есть подробная схема. С уважением.', date: '2026-07-02 11:45' }
    ]
  },
  {
    id: 'prop-3',
    name: 'Монастырь Брунеллески',
    city: 'Флоренция',
    country: 'Италия',
    address: 'Piazza della Signoria 4, Centro Storico',
    type: 'Жилая недвижимость',
    price: 1650000,
    area: 290,
    description: 'Уникальные апартаменты в бывшем монастыре эпохи Возрождения. Высота потолков до 5 метров, отреставрированные каменные арки, виды на купол Брунеллески и современный минималистичный дизайн интерьеров.',
    status: 'needs_improvement',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-07-01 09:00',
    history: [
      { date: '2026-07-01 09:00', action: 'Создание черновика', user: 'Иван Кузнецов' },
      { date: '2026-07-01 10:15', action: 'Отправлено на проверку', user: 'Иван Кузнецов' },
      { date: '2026-07-03 14:00', action: 'Статус изменен на: Требует доработки', user: 'Управляющая компания' }
    ],
    documents: [
      { id: 'doc-3-1', name: 'Florence_Registry_Excerpt_Brunelleschi.pdf', type: 'title', status: 'verified', size: '4.1 MB', date: '2026-07-01' },
      { id: 'doc-3-2', name: 'Valuation_Florence_Artistic_Heritage.pdf', type: 'valuation', status: 'rejected', size: '6.0 MB', date: '2026-07-01' }
    ],
    comments: [
      { id: 'comm-3-1', sender: 'manager', senderName: 'Штефан Келлер (УК)', text: 'Загруженный документ оценки устарел более чем на 12 месяцев. Нам требуется актуальный аудит стоимости с учетом изменений рынка за 2026 год.', date: '2026-07-03 14:05' },
      { id: 'comm-3-2', sender: 'realtor', senderName: 'Иван Кузнецов', text: 'Понял вас. Уже заказал новую независимую оценку у локального эксперта во Флоренции. Загружу в течение пары дней.', date: '2026-07-03 15:10' }
    ]
  },
  {
    id: 'prop-4',
    name: 'Бруталистская вилла на скале',
    city: 'Майорка',
    country: 'Испания',
    address: 'Carrer de la Roca 8, Port d’Andratx',
    type: 'Жилая недвижимость',
    price: 2340000,
    area: 410,
    description: 'Инженерный шедевр, консольно нависающий над бирюзовыми водами Средиземного моря. Монолитный архитектурный бетон, панорамное остекление без рам, террасы с бесконечным переливным бассейном и полной приватностью.',
    status: 'draft',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-07-05 14:22',
    history: [
      { date: '2026-07-05 14:22', action: 'Создание черновика', user: 'Анна Демидова' }
    ],
    documents: [],
    comments: []
  },
  {
    id: 'prop-5',
    name: 'Коттеджи на норвежских фьордах',
    city: 'Лофотенские острова',
    country: 'Норвегия',
    address: 'Fjordveien 220, Reine',
    type: 'Жилая недвижимость',
    price: 1850000,
    area: 320,
    description: 'Энергоэффективный жилой комплекс премиум-класса из натуральной лиственницы прямо у кромки воды в Норвегии. Панорамные виды на северное сияние, геотермальное отопление и экологически чистое исполнение.',
    status: 'approved',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-06-10 11:00',
    history: [
      { date: '2026-06-10 11:00', action: 'Создание черновика', user: 'Иван Кузнецов' },
      { date: '2026-06-12 15:40', action: 'Отправлено на проверку', user: 'Иван Кузнецов' },
      { date: '2026-06-14 10:20', action: 'На рассмотрении', user: 'Управляющая компания' },
      { date: '2026-06-18 11:00', action: 'Объект одобрен для публикации', user: 'Управляющая компания' }
    ],
    documents: [
      { id: 'doc-5-1', name: 'Lofoten_Eco_Complex_Deed.pdf', type: 'title', status: 'verified', size: '1.9 MB', date: '2026-06-10' },
      { id: 'doc-5-2', name: 'NVE_Energy_Certificate_A.pdf', type: 'valuation', status: 'verified', size: '1.2 MB', date: '2026-06-10' }
    ],
    comments: [
      { id: 'comm-5-1', sender: 'manager', senderName: 'Маркус Вебер (УК)', text: 'Прекрасный проект с высоким показателем энергоэффективности. Все документы успешно верифицированы.', date: '2026-06-18 10:45' }
    ]
  },
  {
    id: 'prop-6',
    name: 'Резиденция у Озера Жиронда',
    city: 'Бордо',
    country: 'Франция',
    address: '14 Route du Lac, Carcans',
    type: 'Жилая недвижимость',
    price: 1100000,
    area: 210,
    description: 'Семейная резиденция в сосновом лесу у озера Жиронда. Эко-дизайн, подогреваемый бассейн, солнечные батареи, близость к океанским пляжам Бордо.',
    status: 'rejected',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'
    ],
    createdAt: '2026-06-01 12:00',
    history: [
      { date: '2026-06-01 12:00', action: 'Создание черновика', user: 'Иван Кузнецов' },
      { date: '2026-06-02 09:30', action: 'Отправлено на проверку', user: 'Иван Кузнецов' },
      { date: '2026-06-05 14:00', action: 'Статус изменен на: На рассмотрении', user: 'Управляющая компания' },
      { date: '2026-06-10 17:00', action: 'Объект отклонен платформой', user: 'Управляющая компания' }
    ],
    documents: [
      { id: 'doc-6-1', name: 'Gironde_Deed_Registry.pdf', type: 'title', status: 'rejected', size: '3.4 MB', date: '2026-06-01' }
    ],
    comments: [
      { id: 'comm-6-1', sender: 'manager', senderName: 'Елена Боргезе (УК)', text: 'К сожалению, объект расположен в природоохранной зоне с серьезными ограничениями на реконструкцию коммерческих площадей. Подобные риски не позволяют токенизировать или выставлять данный актив. Объект отклонен.', date: '2026-06-10 16:50' }
    ]
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    propertyId: 'prop-3',
    propertyName: 'Монастырь Брунеллески',
    title: 'Требуется доработка',
    message: 'Объект "Монастырь Брунеллески" требует актуализации документов оценки стоимости.',
    date: '2026-07-03 14:00',
    read: false,
    type: 'warning'
  },
  {
    id: 'notif-2',
    propertyId: 'prop-2',
    propertyName: 'Киотское дзен-святилище',
    title: 'Статус обновлен',
    message: 'Объект "Киотское дзен-святилище" переведен в статус "На рассмотрении".',
    date: '2026-07-02 09:30',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-3',
    propertyId: 'prop-1',
    propertyName: 'Вилла Сола Кабиати',
    title: 'Объект опубликован!',
    message: 'Объект "Вилла Сола Кабиати" успешно верифицирован и опубликован на платформе.',
    date: '2026-06-20 14:00',
    read: true,
    type: 'success'
  },
  {
    id: 'notif-4',
    propertyId: 'prop-5',
    propertyName: 'Коттеджи на норвежских фьордах',
    title: 'Объект одобрен УК',
    message: 'Объект "Коттеджи на норвежских фьордах" успешно прошел проверку комплаенс и одобрен.',
    date: '2026-06-18 11:00',
    read: true,
    type: 'success'
  }
];

export const REALTOR_ACTIONS = [
  { id: 'act-1', date: '2026-07-05 14:22', text: 'Создан новый черновик: "Бруталистская вилла на скале"', type: 'create' },
  { id: 'act-2', date: '2026-07-03 15:10', text: 'Отправлен ответ на комментарий УК по объекту "Монастырь Брунеллески"', type: 'message' },
  { id: 'act-3', date: '2026-06-28 10:00', text: 'Объект "Киотское дзен-святилище" отправлен на проверку', type: 'submit' },
  { id: 'act-4', date: '2026-06-25 12:40', text: 'Загружен документ "Kyoto_Property_Title_Registry.pdf"', type: 'upload' }
];
