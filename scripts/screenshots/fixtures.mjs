export const API_URL = "http://localhost:3000";

const wine = (overrides) => ({
  agingNotes:
    "This wine's structure gives it real aging potential — many examples reward 5 to 10 years resting in the cellar.",
  country: "Argentina",
  grapes: ["Malbec"],
  imageSource: "WEB",
  offers: [],
  pairings: ["grilled ribeye", "lamb chops", "aged manchego"],
  price: null,
  priceMarket: null,
  producerProfile: null,
  region: "Mendoza",
  regionProfile: null,
  servingNotes:
    "Serve at cool room temperature, around 16–18°C; decanting for 30 minutes can help open up the aromas.",
  tastingNotes: null,
  type: "Dry red",
  vintage: "2021",
  winery: null,
  ...overrides,
});

export const wines = [
  wine({
    id: "catena-malbec",
    imageUrl: `${API_URL}/uploads/00000000-0000-4000-8000-000000000001.jpg`,
    name: "Catena Malbec",
    offers: [
      {
        amount: 225.9,
        amountBrl: 225.9,
        country: "Brazil",
        currency: "BRL",
        store: "Cia do Vinho",
        url: "https://www.ciadovinho.com.br/catena-malbec",
      },
      {
        amount: 219,
        amountBrl: 219,
        country: "Brazil",
        currency: "BRL",
        store: "Mistral",
        url: "https://www.mistral.com.br/catena-malbec",
      },
      {
        amount: 232.5,
        amountBrl: 232.5,
        country: "Brazil",
        currency: "BRL",
        store: "Grand Cru",
        url: "https://www.grandcru.com.br/catena-malbec",
      },
    ],
    price: "~R$ 230",
    priceMarket: "BR",
    producerProfile:
      "Bodega Catena Zapata was founded in 1902 by Nicola Catena in Mendoza. Under Nicolás Catena Zapata it pioneered high-altitude Malbec, and today it is regarded as the reference producer for Argentine fine wine.",
    regionProfile:
      "Mendoza sits at the foot of the Andes in western Argentina. High altitude, intense sunlight and cool nights give Malbec deep color, ripe fruit and fresh acidity, with alluvial soils adding structure.",
    tastingNotes:
      "Aromas of blackberry, violet and a touch of vanilla. The palate is full-bodied with ripe plum, soft tannins and a long, spiced finish that turns gently savoury.",
    winery: "Bodega Catena Zapata",
  }),
  wine({
    country: "Portugal",
    grapes: ["Touriga Nacional", "Touriga Franca", "Tinta Roriz"],
    id: "crasto-reserva",
    imageUrl: `${API_URL}/uploads/00000000-0000-4000-8000-000000000002.jpg`,
    name: "Quinta do Crasto Reserva Vinhas Velhas",
    price: "~R$ 390",
    priceMarket: "BR",
    region: "Douro",
    tastingNotes:
      "Dark fruit, graphite and dried herbs. Dense and layered, with firm tannins and a long mineral finish.",
    vintage: "2019",
    winery: "Quinta do Crasto",
  }),
  wine({
    country: "Chile",
    grapes: ["Cabernet Sauvignon"],
    id: "casillero-reserva",
    imageUrl: `${API_URL}/uploads/00000000-0000-4000-8000-000000000003.jpg`,
    name: "Casillero del Diablo Reserva Cabernet Sauvignon",
    price: "~R$ 75",
    priceMarket: "BR",
    region: "Central Valley",
    vintage: "2022",
    winery: "Concha y Toro",
  }),
  wine({
    country: "Brazil",
    grapes: ["Chardonnay", "Pinot Noir"],
    id: "chandon-brut",
    imageSource: null,
    imageUrl: null,
    name: "Chandon Brut",
    price: "~R$ 95",
    priceMarket: "BR",
    region: "Serra Gaúcha",
    servingNotes:
      "Serve well chilled, around 6–8°C, in a tulip glass or flute to preserve the bubbles.",
    type: "Sparkling wine",
    vintage: "NV",
    winery: "Chandon",
  }),
  wine({
    country: "Brazil",
    grapes: ["Syrah"],
    id: "miolo-syrah",
    imageUrl: `${API_URL}/uploads/00000000-0000-4000-8000-000000000004.jpg`,
    name: "Miolo Single Vineyard Syrah",
    price: "~R$ 120",
    priceMarket: "BR",
    region: "Campanha",
    vintage: "2020",
    winery: "Miolo",
  }),
  wine({
    country: "New Zealand",
    grapes: ["Sauvignon Blanc"],
    id: "cloudy-bay-sb",
    imageSource: null,
    imageUrl: null,
    name: "Cloudy Bay Sauvignon Blanc",
    price: "~R$ 280",
    priceMarket: "INTERNATIONAL",
    region: "Marlborough",
    servingNotes:
      "Serve chilled, around 8–10°C, to keep its acidity and aromatics crisp.",
    type: "Dry white",
    vintage: "2023",
    winery: "Cloudy Bay",
  }),
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
  { ...wineById.get("catena-malbec"), quantity: 6, savedAt: at(2) },
  { ...wineById.get("crasto-reserva"), quantity: 2, savedAt: at(9) },
  { ...wineById.get("chandon-brut"), quantity: 3, savedAt: at(20) },
  { ...wineById.get("miolo-syrah"), quantity: 1, savedAt: at(31) },
];

export const wishlist = [
  { ...wineById.get("cloudy-bay-sb"), savedAt: at(1) },
  { ...wineById.get("casillero-reserva"), savedAt: at(5) },
];

export const ratings = [
  {
    ...wineById.get("catena-malbec"),
    balance: 4,
    complexity: 4,
    conclusion: "A dependable Malbec that punches above its price.",
    emotion: 4,
    intensity: 4,
    nose: "Blackberry, violets and a little vanilla.",
    palate: "Round and ripe with soft tannins and a spiced finish.",
    persistence: 3,
    photoUrl: null,
    savedAt: at(2),
    score: 8.5,
    visual: "Deep ruby with a purple rim.",
    wineId: "catena-malbec",
  },
  {
    ...wineById.get("miolo-syrah"),
    balance: 3,
    complexity: 3,
    conclusion: "Honest, peppery and easy to like.",
    emotion: 3,
    intensity: 3,
    nose: "Black pepper and blueberry.",
    palate: "Medium body, fresh acidity.",
    persistence: 3,
    photoUrl: null,
    savedAt: at(14),
    score: 7.5,
    visual: "Medium ruby.",
    wineId: "miolo-syrah",
  },
];

export const recentViews = [
  { ...wineById.get("crasto-reserva"), viewedAt: at(0) },
  { ...wineById.get("catena-malbec"), viewedAt: at(1) },
  { ...wineById.get("cloudy-bay-sb"), viewedAt: at(3) },
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
  stage: "Writing up Château Pétrus 2015",
  status: "running",
};
