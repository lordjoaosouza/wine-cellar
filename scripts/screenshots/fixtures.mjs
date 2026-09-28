export const API_URL = "http://localhost:3000";

export const PHOTO_KEYS = {
  "miolo-sesmarias": "00000000-0000-4000-8000-000000000003.jpg",
  "miolo-sesmarias-tasting": "00000000-0000-4000-8000-000000000005.jpg",
  "terracas-noar-pinot-noir": "00000000-0000-4000-8000-000000000001.jpg",
  "vinha-solo-nero-selvaggio": "00000000-0000-4000-8000-000000000002.jpg",
};

const photoUrl = (asset) => `${API_URL}/uploads/${PHOTO_KEYS[asset]}`;

export const wines = [
  {
    agingNotes:
      "The producer indicates a potential aging period of about 5-7 years. It can also be enjoyed young for its fresher fruit and herbal character.",
    country: "Brazil",
    grapes: ["Cabernet Sauvignon"],
    id: "vinha-solo-nero-selvaggio-2023",
    imageFillsFrame: false,
    imageSource: "WEB",
    imageUrl: photoUrl("vinha-solo-nero-selvaggio"),
    name: "Vinha Solo Nero Selvaggio",
    offers: [
      {
        amount: 78,
        amountBrl: 78,
        country: "Brazil",
        currency: "BRL",
        store: "Vinhos & Vinhos",
        url: "https://www.vinhosevinhos.com/vinha-solo-nero-selvaggio.html",
      },
    ],
    pairings: [
      "grilled sirloin",
      "mushroom pizza",
      "beef risotto",
      "roast lamb",
    ],
    price: "~R$ 78",
    priceMarket: "BR",
    producerProfile:
      "Vinha Solo was created by Milton Scola and Raimundo Demore in Fazenda Souza, Caxias do Sul. Its estate has about 20 hectares of vineyards planted with material brought from Italy, and the winery focuses on spontaneous fermentation and minimal-intervention wines.",
    region: "Serra Gaúcha",
    regionProfile:
      "Serra Gaúcha lies in northeastern Rio Grande do Sul and is Brazil's historic center of viticulture. Its elevated vineyards, humid temperate conditions and predominantly basalt-derived soils support a wide range of grapes, from Cabernet Sauvignon and Merlot to Chardonnay and Pinot Noir.",
    servingNotes:
      "Serve at 16-18°C in a medium to large red-wine glass. Brief aeration can help open the fruit and herbal aromas.",
    tastingNotes:
      "Ruby red with good intensity. The nose shows ripe cherry, cassis and fresh herbal notes, including red pepper. The palate combines lively acidity, firm but integrated tannins and moderate body, finishing clean and fruit-driven.",
    type: "Dry red",
    vintage: "2023",
    winery: "Vinha Solo",
  },
  {
    agingNotes:
      "This style is primarily suited to drinking while its red-fruit character and acidity remain fresh. Short-term cellaring is reasonable, but it is not designed as a heavily structured long-aging red.",
    country: "Brazil",
    grapes: ["Pinot Noir"],
    id: "terracas-noar-pinot-noir-2025",
    imageFillsFrame: true,
    imageSource: "WEB",
    imageUrl: photoUrl("terracas-noar-pinot-noir"),
    name: "Terraças Noar Pinot Noir",
    offers: [
      {
        amount: 130,
        amountBrl: 130,
        country: "Brazil",
        currency: "BRL",
        store: "Vinhos & Vinhos",
        url: "https://www.vinhosevinhos.com/terracas-noar-pinot-noir-2025.html",
      },
    ],
    pairings: [
      "mushroom risotto",
      "roast chicken",
      "margherita pizza",
      "grilled salmon",
    ],
    price: "~R$ 130",
    priceMarket: "BR",
    producerProfile:
      "Terraças is a family wine producer based in Pinto Bandeira, in the Serra Gaúcha. Its vineyards and wines are closely linked to the high-altitude local landscape, and the winery participated in the regional work connected with the Altos de Pinto Bandeira denomination of origin.",
    region: "Serra Gaúcha",
    regionProfile:
      "Serra Gaúcha lies in northeastern Rio Grande do Sul and combines altitude, regular rainfall and basalt-derived soils. Pinto Bandeira is especially associated with Chardonnay, Pinot Noir and Riesling Itálico, varieties widely used in both still wines and traditional-method sparkling wines.",
    servingNotes:
      "Serve at about 14-16°C in a Burgundy-style glass. Extended decanting is generally unnecessary, though a few minutes of air can help the aromas develop.",
    tastingNotes:
      "Medium-intensity ruby in color, with aromas centered on raspberry, strawberry, dark plum, subtle spice and earthy nuances. The palate is fresh and relatively light, with delicate tannins, balanced acidity and a smooth, fruit-led finish.",
    type: "Dry red",
    vintage: "2025",
    winery: "Terraças",
  },
  {
    agingNotes:
      "The producer states a cellaring potential of about 20 years. The 2023 vintage is highly structured and can benefit from several years in bottle before reaching greater aromatic and tannic integration.",
    country: "Brazil",
    grapes: [
      "Cabernet Sauvignon",
      "Merlot",
      "Petit Verdot",
      "Tannat",
      "Tempranillo",
    ],
    id: "miolo-sesmarias-2023",
    imageFillsFrame: false,
    imageSource: "WEB",
    imageUrl: photoUrl("miolo-sesmarias"),
    name: "Miolo Sesmarias",
    offers: [
      {
        amount: 1049,
        amountBrl: 1049,
        country: "Brazil",
        currency: "BRL",
        store: "Vinhos & Vinhos",
        url: "https://www.vinhosevinhos.com/miolo-sesmarias-2023.html",
      },
    ],
    pairings: [
      "braised short ribs",
      "roast lamb",
      "venison",
      "aged hard cheese",
      "grilled ribeye",
    ],
    price: "~R$ 1.049",
    priceMarket: "BR",
    producerProfile:
      "Miolo traces its family's Brazilian viticultural history to Giuseppe Miolo's arrival in 1897, while commercial wine production began in 1989. Headquartered in Vale dos Vinhedos, the group operates wine projects in several Brazilian regions, including Seival in Campanha Meridional.",
    region: "Campanha Gaúcha",
    regionProfile:
      "Campanha Gaúcha occupies the southern and western plains of Rio Grande do Sul near the Uruguayan border. Compared with Serra Gaúcha it has broader open landscapes and generally drier conditions, favoring structured reds from grapes such as Tannat, Cabernet Sauvignon and Touriga Nacional.",
    servingNotes:
      "Serve at 16-18°C in a large red-wine glass. Decanting for about one to two hours can help a young bottle reveal its layered fruit, floral and oak-derived aromas.",
    tastingNotes:
      "Deep dark red with violet tones. The nose is layered with violets, ripe black fruit, spices and balsamic notes. Dense and full-bodied on the palate, it combines refreshing acidity with silky tannins, substantial concentration and a long, persistent finish.",
    type: "Dry red",
    vintage: "2023",
    winery: "Miolo",
  },
];

export const wineById = new Map(wines.map((entry) => [entry.id, entry]));

const at = (daysAgo) =>
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const profile = {
  avatarUrl: null,
  createdAt: at(120),
  email: "joao@example.com",
  id: "user-1",
  name: "João Souza",
  targetHumidityPct: 70,
  targetTemperatureC: 13,
};

export const cellar = [
  { ...wineById.get("miolo-sesmarias-2023"), quantity: 2, savedAt: at(3) },
  {
    ...wineById.get("vinha-solo-nero-selvaggio-2023"),
    quantity: 4,
    savedAt: at(12),
  },
  {
    ...wineById.get("terracas-noar-pinot-noir-2025"),
    quantity: 1,
    savedAt: at(20),
  },
];

export const wishlist = [
  { ...wineById.get("terracas-noar-pinot-noir-2025"), savedAt: at(1) },
  { ...wineById.get("vinha-solo-nero-selvaggio-2023"), savedAt: at(6) },
];

export const ratings = [
  {
    ...wineById.get("miolo-sesmarias-2023"),
    balance: 5,
    complexity: 5,
    conclusion:
      "A benchmark Brazilian red: layered, concentrated and still young. Worth cellaring, but already remarkable with a long decant.",
    emotion: 5,
    intensity: 5,
    nose: "Violets, ripe blackberry and plum, sweet spice, a balsamic and cedar edge from the oak.",
    palate:
      "Dense and full-bodied, refreshing acidity holding up the concentration, silky tannins and a very long, persistent finish.",
    persistence: 5,
    photoUrl: photoUrl("miolo-sesmarias-tasting"),
    savedAt: at(3),
    score: 9.4,
    visual: "Deep dark red, almost opaque, with violet reflections on the rim.",
    wineId: "miolo-sesmarias-2023",
  },
  {
    ...wineById.get("vinha-solo-nero-selvaggio-2023"),
    balance: 4,
    complexity: 3,
    conclusion:
      "Honest, lively and unfiltered. Great value for a weekday bottle.",
    emotion: 4,
    intensity: 3,
    nose: "Ripe cherry, cassis and a green, peppery herbal note.",
    palate:
      "Lively acidity, firm but integrated tannins, moderate body, clean fruit-driven finish.",
    persistence: 3,
    photoUrl: null,
    savedAt: at(12),
    score: 8.2,
    visual: "Ruby red with good intensity.",
    wineId: "vinha-solo-nero-selvaggio-2023",
  },
];

export const recentViews = [
  { ...wineById.get("miolo-sesmarias-2023"), viewedAt: at(0) },
  { ...wineById.get("vinha-solo-nero-selvaggio-2023"), viewedAt: at(1) },
  { ...wineById.get("terracas-noar-pinot-noir-2025"), viewedAt: at(2) },
];

export const tuyaStatus = {
  clientId: "a8f2c1e4b7d3f9a1c2e4",
  deviceId: "bf5c0e2a1d9f4b7c8e3a",
  hasClientSecret: true,
  region: "US",
};

export const tuyaReading = {
  humidityPct: 68,
  temperatureC: 13.4,
  updatedAt: new Date().toISOString(),
};

const GB = 1024 ** 3;

export const aiStatus = {
  activeModel: "qwen3.5:9b",
  activeModelInstalled: true,
  models: [
    {
      active: false,
      curated: true,
      description:
        "Small and quick. Reads clear labels well; research write-ups are shorter and less precise.",
      downloadBytes: Math.round(3.3 * GB),
      installed: false,
      installedBytes: null,
      label: "Gemma 3 4B",
      memoryGb: 6,
      name: "gemma3:4b",
      pull: {
        completedBytes: Math.round(1.4 * GB),
        error: null,
        id: "pull-1",
        model: "gemma3:4b",
        progress: 0.42,
        stage: "Downloading 1.4 GB of 3.3 GB",
        status: "running",
        totalBytes: Math.round(3.3 * GB),
      },
      speed: "fast",
      vision: null,
    },
    {
      active: false,
      curated: true,
      description:
        "Compact vision model tuned for reading text in photos. A good pick for label scanning on modest hardware.",
      downloadBytes: Math.round(3.2 * GB),
      installed: false,
      installedBytes: null,
      label: "Qwen 2.5 VL 3B",
      memoryGb: 6,
      name: "qwen2.5vl:3b",
      pull: null,
      speed: "fast",
      vision: null,
    },
    {
      active: true,
      curated: true,
      description:
        "The default: strong label reading and solid research write-ups on a 16 GB machine.",
      downloadBytes: Math.round(6.6 * GB),
      installed: true,
      installedBytes: Math.round(6.6 * GB),
      label: "Qwen 3.5 9B",
      memoryGb: 12,
      name: "qwen3.5:9b",
      pull: null,
      speed: "balanced",
      vision: true,
    },
    {
      active: false,
      curated: true,
      description:
        "Strong at reading angled or glared labels, with research quality close to the default.",
      downloadBytes: Math.round(6 * GB),
      installed: true,
      installedBytes: Math.round(6 * GB),
      label: "Qwen 2.5 VL 7B",
      memoryGb: 10,
      name: "qwen2.5vl:7b",
      pull: null,
      speed: "balanced",
      vision: true,
    },
    {
      active: false,
      curated: true,
      description:
        "Larger multilingual model with better wine knowledge for producer and region write-ups.",
      downloadBytes: Math.round(8.1 * GB),
      installed: false,
      installedBytes: null,
      label: "Gemma 3 12B",
      memoryGb: 16,
      name: "gemma3:12b",
      pull: null,
      speed: "balanced",
      vision: null,
    },
  ],
  ollama: {
    reachable: true,
    url: "http://host.docker.internal:11434",
    version: "0.12.3",
  },
  researchProfile: "thorough",
};

export const researchJob = {
  error: null,
  id: "job-1",
  progress: 0.46,
  results: null,
  stage: "Writing up Miolo Reserva Tannat",
  status: "running",
};
