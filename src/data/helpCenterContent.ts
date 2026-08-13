export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'example'; lines: string[] }
  | { type: 'notice'; text: string };

export interface HelpArticle {
  id: string;
  question: string;
  blocks: HelpBlock[];
  keywords?: string[];
}

export interface HelpCategory {
  id: string;
  navLabel: string;
  title: string;
  summary: string;
  articles: HelpArticle[];
}

export const helpCenterCategories: HelpCategory[] = [
  {
    id: 'onboarding',
    navLabel: '接入说明',
    title: '外部客服接入说明',
    summary: '先判断问题类型，无法确定时及时反馈群内。',
    articles: [
      {
        id: 'onboarding-basic',
        question: '外部客服接入说明',
        keywords: ['接入', '承诺', '反馈', '平台无法操作', '情绪激动'],
        blocks: [
          { type: 'paragraph', text: '各位老师好，后续店铺客服问题请先按照以下规则处理。' },
          { type: 'paragraph', text: '遇到不确定、平台无法操作、用户情绪激动的问题，请及时反馈群内，不要自行承诺。' },
        ],
      },
    ],
  },
  {
    id: 'shops',
    navLabel: '在线店铺',
    title: '目前在线店铺有哪些？',
    summary: '覆盖抖店、微信小店、百度优选三类在线店铺。',
    articles: [
      {
        id: 'shops-current',
        question: '目前在线店铺有哪些？',
        keywords: ['抖店', '微信小店', '百度优选', '店铺'],
        blocks: [
          { type: 'paragraph', text: '抖店：' },
          { type: 'bullets', items: ['开开美好生活', '华彩音与乐'] },
          { type: 'paragraph', text: '微信小店：' },
          { type: 'bullets', items: ['开开美好生活', '开开华彩的小店'] },
          { type: 'paragraph', text: '百度优选：' },
          { type: 'bullets', items: ['开开华彩美好生活'] },
        ],
      },
    ],
  },
  {
    id: 'product-types',
    navLabel: '商品类型',
    title: '商品类型',
    summary: '处理前先判断虚拟品还是实体图书。',
    articles: [
      {
        id: 'product-types-main',
        question: '目前商品主要分为哪几类？',
        keywords: ['虚拟品', '实体图书', '课程', '卡券', '书课包', '赠品'],
        blocks: [
          { type: 'paragraph', text: '目前商品主要分为两类：' },
          { type: 'numbered', items: ['虚拟品：包含课程、卡券、书课包、课程赠品等。', '实体图书：平台内直接发货的图书类商品。'] },
          { type: 'notice', text: '客服处理问题前，需要先判断用户购买的是虚拟品还是实体图书，两类商品处理方式不同。' },
        ],
      },
    ],
  },
  {
    id: 'virtual-rules',
    navLabel: '虚拟品处理规则',
    title: '虚拟品处理规则',
    summary: '卡券、课程、赠品、退款、地址登记的处理口径。',
    articles: [
      {
        id: 'virtual-card-delivery',
        question: '虚拟品卡券多久发货？',
        keywords: ['卡券', '发货', '核销', '未收到'],
        blocks: [
          { type: 'paragraph', text: '用户下单后，卡券一般 3 分钟左右到账，6 天后自动核销。' },
          { type: 'paragraph', text: '如用户反馈未收到，可先引导用户查看订单页、卡券页或平台通知。' },
        ],
      },
      {
        id: 'virtual-teacher-first',
        question: '用户咨询课程或赠品物流，第一步应该问什么？',
        keywords: ['课程', '赠品', '物流', '老师', '手机号', '虚拟号', '联系'],
        blocks: [
          { type: 'paragraph', text: '用户咨询课程或赠品物流时，客服第一步先询问：' },
          { type: 'example', lines: ['“请问您现在已经添加上对应的课程老师了吗？”'] },
          { type: 'paragraph', text: '如用户已添加老师：引导用户直接咨询课程老师即可。' },
          { type: 'paragraph', text: '如用户未添加老师：将用户手机号 / 虚拟号反馈到群内，由内部统一联系。' },
          { type: 'bullets', items: ['18:00 前反馈，当天统一联系；', '18:00 后反馈，顺延次日联系。'] },
        ],
      },
      {
        id: 'virtual-gift-delivery',
        question: '虚拟品赠品如何发货？',
        keywords: ['赠品', '发货', '平台物流', '韵达', '邮政', '指定快递'],
        blocks: [
          { type: 'paragraph', text: '虚拟品中的实体赠品，需要添加老师后登记发货信息。' },
          { type: 'paragraph', text: '赠品物流不走平台官方物流，平台内无法实时查询。' },
          { type: 'paragraph', text: '默认发韵达或邮政快递，暂不支持指定快递。' },
        ],
      },
      {
        id: 'virtual-refund',
        question: '虚拟品用户申请退款怎么处理？',
        keywords: ['退款', '卡券', '核销', '撤销核销'],
        blocks: [
          { type: 'paragraph', text: '用户咨询退款，可直接协助代发起退款申请。' },
          { type: 'paragraph', text: '如遇卡券已核销、需要撤销核销的情况：先反馈群内，取消核销后再协助发起退款。' },
        ],
      },
      {
        id: 'wechat-address',
        question: '微信小店用户如何登记地址？',
        keywords: ['微信小店', '地址', '短信', '登记', '发货信息'],
        blocks: [
          { type: 'paragraph', text: '微信小店用户下单后，会收到地址核对短信。' },
          { type: 'paragraph', text: '用户点击短信链接后，即可登记发货信息。' },
        ],
      },
      {
        id: 'douyin-address',
        question: '抖店用户如何登记地址？',
        keywords: ['抖店', '地址', '虚拟号', '短信登记', '老师', '电话联系'],
        blocks: [
          { type: 'paragraph', text: '抖店目前受虚拟号影响，暂时无法开通短信登记功能。' },
          { type: 'paragraph', text: '如用户未添加老师，需要反馈群内，由内部电话联系登记。' },
        ],
      },
    ],
  },
  {
    id: 'book-rules',
    navLabel: '实体图书处理规则',
    title: '实体图书处理规则',
    summary: '图书发货、退货退款、拦截、运费补偿与好评返现。',
    articles: [
      {
        id: 'book-delivery',
        question: '实体图书如何发货和查询物流？',
        keywords: ['实体图书', '发货', '物流', '韵达', '邮政', '快递'],
        blocks: [
          { type: 'paragraph', text: '实体图书直接通过平台内发货，物流可在平台订单内查询。' },
          { type: 'paragraph', text: '默认发韵达或邮政快递，暂不支持指定快递。' },
        ],
      },
      {
        id: 'book-refund',
        question: '实体图书用户申请退货退款怎么处理？',
        keywords: ['实体图书', '退货退款', '退款', '平台规则'],
        blocks: [
          { type: 'paragraph', text: '如用户申请退货退款，符合平台规则的，可直接通过。' },
        ],
      },
      {
        id: 'book-intercept',
        question: '用户要求拦截快递怎么处理？',
        keywords: ['拦截', '快递', '订单号', '快递单号'],
        blocks: [
          { type: 'paragraph', text: '如用户要求拦截快递，将订单号、快递单号反馈群内处理。' },
        ],
      },
      {
        id: 'book-freight',
        question: '用户要求运费补偿怎么处理？',
        keywords: ['运费', '补偿', '破损', '污渍', '情绪过激', '小额打款'],
        blocks: [
          { type: 'paragraph', text: '如商品无明显破损、使用痕迹、污渍等，不影响二次售卖，可小额打款补偿运费。' },
          { type: 'paragraph', text: '如用户情绪过激，也可视情况小额打款 3～5 元安抚。' },
        ],
      },
      {
        id: 'book-cashback',
        question: '用户好评后要求返现怎么处理？',
        keywords: ['好评返现', '返现', '小额打款'],
        blocks: [
          { type: 'paragraph', text: '如用户好评后要求返现，可小额打款 3～5 元。' },
        ],
      },
    ],
  },
  {
    id: 'feedback-format',
    navLabel: '群内反馈格式',
    title: '群内反馈格式',
    summary: '需要内部协助时统一用固定格式反馈。',
    articles: [
      {
        id: 'feedback-format-main',
        question: '需要群内协助时，应该怎么反馈？',
        keywords: ['群内', '反馈格式', '店铺', '订单号', '用户诉求'],
        blocks: [
          { type: 'paragraph', text: '需要群内协助的问题，请按以下格式反馈：' },
          { type: 'example', lines: ['店铺 + 订单号 + 下单商品 + 用户诉求', '开开美好生活 + 123456789 + 声乐书课包 + 用户未添加老师，咨询赠品物流'] },
        ],
      },
    ],
  },
  {
    id: 'common-feedback',
    navLabel: '常见反馈类型',
    title: '哪些问题需要反馈群内？',
    summary: '异常、无法确认或需要内部动作的问题都要反馈。',
    articles: [
      {
        id: 'common-feedback-main',
        question: '哪些问题需要反馈群内？',
        keywords: ['未添加老师', '赠品物流', '撤销核销', '快递拦截', '物流异常', '情绪激动'],
        blocks: [
          { type: 'paragraph', text: '以下问题建议反馈群内：' },
          {
            type: 'bullets',
            items: ['未添加老师待联系', '赠品物流咨询', '退款需撤销核销', '快递拦截', '物流异常', '用户情绪激动', '其他异常问题'],
          },
        ],
      },
    ],
  },
  {
    id: 'cautions',
    navLabel: '注意事项',
    title: '注意事项',
    summary: '客服处理时不要超出口径自行承诺。',
    articles: [
      {
        id: 'cautions-main',
        question: '客服处理时有哪些禁止承诺？',
        keywords: ['禁止承诺', '平台物流', '当天联系', '退款到账', '指定快递', '不确定'],
        blocks: [
          {
            type: 'numbered',
            items: [
              '不要承诺虚拟品赠品可在平台内查询物流。',
              '不要承诺一定当天联系用户，18:00 后反馈顺延次日。',
              '不要承诺退款马上到账，以平台到账时间为准。',
              '不要承诺用户可指定快递，目前默认韵达或邮政。',
              '不确定的问题不要自行判断，先反馈群内确认。',
            ],
          },
        ],
      },
    ],
  },
];

export const helpCenterHotKeywords = ['退款', '物流', '老师', '卡券', '核销', '快递', '好评返现', '抖店', '微信小店'];
