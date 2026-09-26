import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchedWine } from "../../src/modules/wines/wine-research.js";
import { app, bearer, loginAs, resetDb, type Session } from "./helpers.js";

const { researchWine, researchWineFromPhoto, researchWinesByQuery } =
  vi.hoisted(() => ({
    researchWine: vi.fn(),
    researchWineFromPhoto: vi.fn(),
    researchWinesByQuery: vi.fn(),
  }));

vi.mock("../../src/modules/wines/wine-research.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../src/modules/wines/wine-research.js")
  >()),
  researchWine,
  researchWineFromPhoto,
  researchWinesByQuery,
}));

const STORED_PATH_PATTERN = /^\/uploads\/[0-9a-f-]+\.jpg$/;
const UPLOADED_JPG_PATTERN = /\/uploads\/[0-9a-f-]+\.jpg$/;
const UPLOADED_PNG_PATTERN = /\/uploads\/[0-9a-f-]+\.png$/;

const CATENA: ResearchedWine = {
  country: "Argentina",
  grapes: ["Malbec"],
  listings: [
    {
      amount: 225.9,
      country: "Brazil",
      currency: "BRL",
      store: "Cia do Vinho",
      url: "https://www.ciadovinho.com.br/catena",
    },
    {
      amount: 222.69,
      country: "Brazil",
      currency: "BRL",
      store: "Mistral",
      url: "https://www.mistral.com.br/catena",
    },
  ],
  name: "Catena Malbec",
  pairings: ["grilled ribeye"],
  photo: {
    buffer: Buffer.alloc(4096, 3),
    extension: ".jpg",
    mimetype: "image/jpeg",
  },
  producer: "Bodega Catena Zapata",
  producerProfile: null,
  region: "Mendoza",
  regionProfile: null,
  tastingNotes: null,
  type: "Dry red",
  vintage: null,
};

async function waitForJob(session: Session, jobId: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: polling the job until it settles
    const res = await request(app)
      .get(`/wines/research/${jobId}`)
      .set(bearer(session))
      .expect(200);
    if (res.body.status === "done" || res.body.status === "failed") {
      return res.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("job did not finish");
}

describe("wine research jobs", () => {
  beforeEach(async () => {
    await resetDb();
    researchWinesByQuery.mockReset();
    researchWine.mockReset();
    researchWineFromPhoto.mockReset();
  });

  it("researches in the background and stores the wine with its store prices", async () => {
    const session = await loginAs("research@example.com");
    researchWinesByQuery.mockImplementation((_query, report) => {
      report("Checking stores for Catena Malbec");
      return Promise.resolve([CATENA]);
    });

    const started = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena malbek" })
      .expect(202);
    expect(started.body).toMatchObject({ results: null });

    const job = await waitForJob(session, started.body.id);
    expect(researchWinesByQuery).toHaveBeenCalledWith(
      "catena malbek",
      expect.any(Function)
    );
    expect(job).toMatchObject({ error: null, status: "done" });
    expect(job.results).toHaveLength(1);
    expect(job.results[0]).toMatchObject({
      name: "Catena Malbec",
      price: "~R$ 220",
      priceMarket: "BR",
      winery: "Bodega Catena Zapata",
    });
    expect(job.results[0].offers).toHaveLength(2);
    // A new wine gets the verified store photo, stored on this server.
    expect(job.results[0].imageSource).toBe("WEB");
    expect(job.results[0].imageUrl).toMatch(UPLOADED_JPG_PATTERN);

    // The catalog search now finds it without researching again.
    const search = await request(app)
      .get("/wines/search?q=catena")
      .set(bearer(session))
      .expect(200);
    expect(search.body.total).toBe(1);
    expect(researchWinesByQuery).toHaveBeenCalledTimes(1);
  });

  it("refreshes an existing wine as a job", async () => {
    const session = await loginAs("refresh@example.com");
    researchWinesByQuery.mockResolvedValue([CATENA]);
    const first = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena" });
    const [wine] = (await waitForJob(session, first.body.id)).results;

    researchWine.mockResolvedValue({
      ...CATENA,
      listings: [{ ...CATENA.listings[0], amount: 300 }],
    });
    const started = await request(app)
      .post(`/wines/${wine.id}/refresh`)
      .set(bearer(session))
      .expect(202);
    const job = await waitForJob(session, started.body.id);

    expect(job.results[0]).toMatchObject({ id: wine.id, price: "~R$ 300" });
  });

  it("reports a stopped local model as a failed job with its code", async () => {
    const session = await loginAs("down@example.com");
    const { HttpError } = await import("../../src/lib/http-error.js");
    researchWinesByQuery.mockRejectedValue(
      HttpError.serviceUnavailableWithCode("llm_unavailable", "Ollama is down")
    );

    const started = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena" });
    const job = await waitForJob(session, started.body.id);

    expect(job).toMatchObject({
      error: { code: "llm_unavailable", message: "Ollama is down" },
      status: "failed",
    });
  });

  it("keeps jobs private and 404s refreshes of unknown wines", async () => {
    const owner = await loginAs("owner@example.com");
    const other = await loginAs("other@example.com");
    researchWinesByQuery.mockResolvedValue([]);
    const started = await request(app)
      .post("/wines/research")
      .set(bearer(owner))
      .send({ q: "catena" });

    await request(app)
      .get(`/wines/research/${started.body.id}`)
      .set(bearer(other))
      .expect(404);
    await request(app)
      .post("/wines/does-not-exist/refresh")
      .set(bearer(owner))
      .expect(404);
  });

  it("keeps an existing photo when research runs again", async () => {
    const session = await loginAs("existing@example.com");
    researchWinesByQuery.mockResolvedValue([CATENA]);
    const first = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena" });
    const [wine] = (await waitForJob(session, first.body.id)).results;
    const { prisma } = await import("../../src/lib/prisma.js");
    await prisma.wine.update({
      data: {
        imageSource: "LABEL_SCAN",
        imageUrl: "https://example.com/mine.jpg",
      },
      where: { id: wine.id },
    });

    const again = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena malbec" });
    const job = await waitForJob(session, again.body.id);

    expect(job.results[0]).toMatchObject({
      imageSource: "LABEL_SCAN",
      imageUrl: "https://example.com/mine.jpg",
    });
  });

  it("uses the scanned label as the photo only when no store has one", async () => {
    const session = await loginAs("scan@example.com");
    const png = Buffer.alloc(64, 7).toString("base64");
    const scan = (wine: ResearchedWine) => {
      researchWineFromPhoto.mockResolvedValue([wine]);
      return request(app)
        .post("/wines/identify-label")
        .set(bearer(session))
        .send({ image: `data:image/png;base64,${png}` })
        .expect(202);
    };

    // A store photo exists: it wins over the scan.
    const withStore = await waitForJob(session, (await scan(CATENA)).body.id);
    expect(withStore.results[0]).toMatchObject({ imageSource: "WEB" });

    // No store photo: the scan becomes the wine's picture.
    const noStore = await waitForJob(
      session,
      (
        await scan({
          ...CATENA,
          name: "Catena Alta Malbec",
          photo: null,
        })
      ).body.id
    );
    expect(noStore.results[0].imageSource).toBe("LABEL_SCAN");
    expect(noStore.results[0].imageUrl).toMatch(UPLOADED_PNG_PATTERN);
  });

  it("stores photos as relative paths and answers with the caller's address", async () => {
    const session = await loginAs("address@example.com");
    researchWinesByQuery.mockResolvedValue([CATENA]);
    const started = await request(app)
      .post("/wines/research")
      .set(bearer(session))
      .send({ q: "catena" });
    const [wine] = (await waitForJob(session, started.body.id)).results;

    const { prisma } = await import("../../src/lib/prisma.js");
    const stored = await prisma.wine.findUniqueOrThrow({
      where: { id: wine.id },
    });
    expect(stored.imageUrl).toMatch(STORED_PATH_PATTERN);

    const fromPhone = await request(app)
      .get(`/wines/${wine.id}`)
      .set(bearer(session))
      .set("Host", "100.100.15.95:3000")
      .expect(200);
    expect(fromPhone.body.imageUrl).toBe(
      `http://100.100.15.95:3000${stored.imageUrl}`
    );

    const photo = await request(app)
      .get(stored.imageUrl ?? "")
      .expect(200);
    expect(photo.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });
});
