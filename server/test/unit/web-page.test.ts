import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  htmlToText,
  parsePrice,
  parseWebPage,
} from "../../src/lib/web-page.js";

const PAGE_URL = "https://www.loja.com.br/vinho-catena-malbec";

function jsonLd(value: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

describe("parsePrice", () => {
  it("reads Brazilian, US and numeric prices", () => {
    expect(parsePrice("189,90")).toBe(189.9);
    expect(parsePrice("R$ 1.250,00")).toBe(1250);
    expect(parsePrice("24.99")).toBe(24.99);
    expect(parsePrice("$1,250.50")).toBe(1250.5);
    expect(parsePrice(99)).toBe(99);
  });

  it("rejects missing, zero and non-numeric prices", () => {
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice("0")).toBeNull();
    expect(parsePrice("sob consulta")).toBeNull();
  });
});

describe("decodeEntities / htmlToText", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Barolo &amp; Barbaresco &#233; &#x45;")).toBe(
      "Barolo & Barbaresco é E"
    );
  });

  it("drops scripts, navigation and markup but keeps the text", () => {
    const text = htmlToText(
      "<nav>Menu</nav><h1>Catena Malbec</h1><script>var x=1</script><p>Uvas: Malbec</p>"
    );
    expect(text).toBe("Catena Malbec\nUvas: Malbec");
  });
});

describe("parseWebPage", () => {
  it("extracts a JSON-LD product with its offer", () => {
    const page = parseWebPage(
      PAGE_URL,
      `<html><head><meta property="og:site_name" content="Cia do Vinho">${jsonLd(
        {
          "@type": "Product",
          image: "/img/catena.png",
          name: "Vinho Tinto Catena Malbec 750 mL",
          offers: {
            availability: "https://schema.org/InStock",
            price: "225.90",
            priceCurrency: "brl",
          },
        }
      )}</head><body>Catena</body></html>`
    );

    expect(page.siteName).toBe("Cia do Vinho");
    expect(page.products).toEqual([
      {
        availability: "https://schema.org/InStock",
        currency: "BRL",
        image: "https://www.loja.com.br/img/catena.png",
        name: "Vinho Tinto Catena Malbec 750 mL",
        price: 225.9,
      },
    ]);
    expect(page.images).toEqual(["https://www.loja.com.br/img/catena.png"]);
  });

  it("finds products inside @graph and aggregate offers", () => {
    const page = parseWebPage(
      PAGE_URL,
      jsonLd({
        "@graph": [
          { "@type": "WebPage" },
          {
            "@type": ["Product"],
            name: "Catena Malbec",
            offers: [{ lowPrice: 199, priceCurrency: "BRL" }],
          },
        ],
      })
    );
    expect(page.products[0]).toMatchObject({ currency: "BRL", price: 199 });
  });

  it("falls back to product meta tags when there is no JSON-LD price", () => {
    const page = parseWebPage(
      PAGE_URL,
      `<meta property="product:price:amount" content="89,90">
       <meta property="product:price:currency" content="BRL">
       <meta property="og:title" content="Casillero del Diablo">
       <meta property="og:image" content="https://cdn.loja.com.br/cd.jpg">`
    );
    expect(page.products).toEqual([
      {
        availability: null,
        currency: "BRL",
        image: "https://cdn.loja.com.br/cd.jpg",
        name: "Casillero del Diablo",
        price: 89.9,
      },
    ]);
    expect(page.title).toBe("Casillero del Diablo");
  });

  it("ignores malformed JSON-LD", () => {
    const page = parseWebPage(
      PAGE_URL,
      '<title>Loja</title><script type="application/ld+json">{oops</script>'
    );
    expect(page.products).toEqual([]);
    expect(page.title).toBe("Loja");
  });

  describe("siteName", () => {
    const name = (html: string) => parseWebPage(PAGE_URL, html).siteName;

    it("prefers og:site_name", () => {
      expect(
        name(
          `<meta property="og:site_name" content="Super Adega"><title>Vinho | Outro</title>`
        )
      ).toBe("Super Adega");
    });

    it("uses the offer's seller or the site's organization from JSON-LD", () => {
      expect(
        name(
          jsonLd({
            "@type": "Product",
            offers: { price: 10, seller: { name: "Via Vini" } },
          })
        )
      ).toBe("Via Vini");
      expect(
        name(
          jsonLd({ "@graph": [{ "@type": "Organization", name: "Meu Vinho" }] })
        )
      ).toBe("Meu Vinho");
    });

    it("falls back to the logo's alt text", () => {
      expect(
        name(
          '<title>Miolo Single Vineyard Syrah</title><img class="default-logo" src="/logo.png" alt="Vinhos e Vinhos">'
        )
      ).toBe("Vinhos e Vinhos");
    });

    it("falls back to the page title's last segment, unless it is part of the product name", () => {
      expect(
        name("<title>Vinho Catena Malbec 750 ml | Imigrantes Bebidas</title>")
      ).toBe("Imigrantes Bebidas");
      expect(name("<title>Catena Malbec - Malbec</title>")).toBeNull();
      expect(name("<title>Catena Malbec</title>")).toBeNull();
    });

    it("ignores generic names and URLs", () => {
      expect(
        name(
          '<img class="logo" alt="Logo"><meta name="application-name" content="https://x.com">'
        )
      ).toBeNull();
    });
  });
});
