"use client";

import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";

type Card = {
  id: string;
  series: string;
  filename: string;
  image: string;
  images: { field?: string | null; filename: string; series: string; image: string }[];
  isDoubleSided: boolean;
  name: string;
  subtitle?: string | null;
  title?: string | null;
  number?: string | null;
  cardType: string;
  rarity?: string | null;
  rarityCode?: string | null;
  isUltraRare: boolean;
  isFixed: boolean;
  isFoil: boolean;
  isPromo: boolean;
  pageUrl?: string | null;
};

type CardData = {
  cards: Card[];
  series: { name: string; count: number }[];
  types: { name: string; count: number }[];
  assets: { name: string; path: string }[];
};

type PickedCard = {
  card: Card;
  price: string;
  quantity: number;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const basePath =
  (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

function assetUrl(path: string) {
  if (/^(?:data:|blob:|https?:)/.test(path)) return path;
  return `${basePath}${path.replace(/^\/+/, "")}`;
}

function thumbnailUrl(path: string) {
  const thumbnailPath = path.replace(/^\/cards\//, "/card-thumbs/").replace(/\.[^.]+$/, ".webp");
  return `${assetUrl(thumbnailPath)}?v=20260805-2`;
}

function fallbackToOriginal(event: SyntheticEvent<HTMLImageElement>, path: string) {
  const image = event.currentTarget;
  if (image.dataset.originalFallback === "true") return;
  image.dataset.originalFallback = "true";
  image.src = assetUrl(path);
}

const typeColor: Record<string, string> = {
  Friend: "#22a06b",
  Event: "#7c5cff",
  Problem: "#e58b2a",
  Resource: "#0f7bbf",
  "Mane Character": "#e0528d",
  Troublemaker: "#7a4d36",
  Dilemma: "#697386",
};

const tradingCardSeries = new Set([
  "Series 1",
  "Series 2",
  "Series 3",
  "Series 4",
  "MLP the Movie",
]);

const seriesIcons: Record<string, string> = {
  CanterlotNights: "/series-icons/CanterlotNightsSymbol.png",
  CelestialSolstice: "/series-icons/CelestialSolsticeSymbol.png",
  DefendersofEquestria: "/series-icons/DefendersofEquestriaSymbol.png",
  EquestrianOdysseys: "/series-icons/EquestrianOdysseysSymbol.png",
  FriendsForever: "/series-icons/FriendsForeverSymbol.png",
  GenCon: "/series-icons/GenConDemoSymbol.png",
  GenericFixed: "/series-icons/GenericFixedSymbol.png",
  HighMagic: "/series-icons/HighMagicSymbol.png",
  MarksinTime: "/series-icons/MarksinTimeSymbol.png",
  Premiere: "/series-icons/PremiereSymbol.png",
  RockNRave: "/series-icons/RockNRaveSymbol.png",
  SeaquestriaandBeyond: "/series-icons/SeaquestriaandBeyondSymbol.png",
};

function showDoubleSidedLabel(card: Card) {
  return card.isDoubleSided && !tradingCardSeries.has(card.series);
}

function loadCanvasImage(path: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = assetUrl(path);
  });
}

function drawImageContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

export function CardCatalog() {
  const [data, setData] = useState<CardData | null>(null);
  const [activeSeries, setActiveSeries] = useState("All");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("All");
  const [picked, setPicked] = useState<Record<string, PickedCard>>({});
  const [orderTitle, setOrderTitle] = useState("MLP CCG Card Order");
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportFileName, setExportFileName] = useState("mlp-card-order.png");
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch(assetUrl("/data/cards.json"))
      .then((response) => response.json())
      .then((payload: CardData) => setData(payload));
  }, []);

  const cards = data?.cards ?? [];
  const pickedList = Object.values(picked);
  const selectedTotal = pickedList.reduce((sum, item) => {
    const price = Number(item.price || 0);
    return sum + (Number.isFinite(price) ? price * item.quantity : 0);
  }, 0);

  const filteredCards = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (activeSeries !== "All" && card.series !== activeSeries) return false;
      if (rarity === "UR" && !card.isUltraRare) return false;
      if (rarity === "Foil" && !card.isFoil) return false;
      if (rarity === "Promo" && !card.isPromo) return false;
      if (keyword) {
        const haystack = [
          card.name,
          card.subtitle,
          card.title,
          card.filename,
          ...card.images.map((image) => image.filename),
          card.number,
          card.series,
          card.cardType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [activeSeries, cards, query, rarity]);

  const featured = data?.assets?.[0]?.path ?? filteredCards[0]?.image;

  function toggleCard(card: Card) {
    setPicked((current) => {
      const copy = { ...current };
      if (copy[card.id]) {
        delete copy[card.id];
      } else {
        copy[card.id] = { card, price: "", quantity: 1 };
      }
      return copy;
    });
  }

  function updatePicked(id: string, patch: Partial<PickedCard>) {
    setPicked((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  function resetGalleryScroll() {
    requestAnimationFrame(() => {
      galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectSeries(series: string) {
    setActiveSeries(series);
    resetGalleryScroll();
  }

  function selectRarity(value: string) {
    setRarity(value);
    resetGalleryScroll();
  }

  async function generateImage() {
    if (!pickedList.length || isExporting) return;
    setIsExporting(true);
    setExportUrl(null);
    const canvas = document.createElement("canvas");
    const width = 1200;
    const rowHeight = 190;
    const headerHeight = 190;
    const footerHeight = 130;
    const height = headerHeight + pickedList.length * rowHeight + footerHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const finalOrderTitle = orderTitle.trim() || "MLP CCG Card Order";
    const safeFileName =
      finalOrderTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "mlp-card-order";

    ctx.fillStyle = "#fff1f4";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#111111";
    let titleSize = 44;
    ctx.font = `700 ${titleSize}px Arial`;
    while (ctx.measureText(finalOrderTitle).width > width - 112 && titleSize > 28) {
      titleSize -= 2;
      ctx.font = `700 ${titleSize}px Arial`;
    }
    ctx.fillText(finalOrderTitle, 56, 76);
    ctx.font = "22px Arial";
    ctx.fillStyle = "#765764";
    ctx.fillText(
      `${pickedList.length} ${pickedList.length === 1 ? "card" : "cards"} · Total ${currency.format(selectedTotal)}`,
      56,
      122,
    );
    ctx.fillStyle = "#ff3d91";
    ctx.fillRect(56, 150, width - 112, 4);

    const images = await Promise.all(
      pickedList.map((item) => Promise.all(item.card.images.slice(0, 2).map((image) => loadCanvasImage(image.image)))),
    );

    pickedList.forEach((item, index) => {
      const y = headerHeight + index * rowHeight;
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#fff8fa";
      ctx.fillRect(42, y - 18, width - 84, rowHeight - 16);
      ctx.strokeStyle = "#171317";
      ctx.strokeRect(42, y - 18, width - 84, rowHeight - 16);
      const itemImages = images[index].filter((image): image is HTMLImageElement => image !== null);
      const imageBoxWidth = itemImages.length > 1 ? 78 : 162;
      itemImages.forEach((image, imageIndex) => {
        const imageX = 58 + imageIndex * 84;
        drawImageContained(ctx, image, imageX, y, imageBoxWidth, 151);
      });
      const textX = 250;
      ctx.fillStyle = "#111111";
      ctx.font = "700 28px Arial";
      ctx.fillText(item.card.name, textX, y + 34);
      ctx.font = "20px Arial";
      ctx.fillStyle = "#765764";
      ctx.fillText(`${item.card.series} · #${item.card.number ?? "-"} · ${item.card.cardType}`, textX, y + 70);
      ctx.fillStyle = typeColor[item.card.cardType] ?? "#ff3d91";
      ctx.fillRect(textX, y + 92, 12, 12);
      ctx.fillStyle = "#765764";
      ctx.font = "18px Arial";
      const filenameText = item.card.isDoubleSided
        ? item.card.images.map((image) => image.filename).join(" / ")
        : item.card.filename;
      ctx.fillText(filenameText.slice(0, 52), textX + 22, y + 104);
      ctx.fillStyle = "#111111";
      ctx.font = "700 24px Arial";
      const price = Number(item.price || 0);
      ctx.fillText(`${currency.format(price)} × ${item.quantity}`, 900, y + 54);
      ctx.fillText(currency.format(price * item.quantity), 900, y + 98);
    });

    ctx.fillStyle = "#ff3d91";
    ctx.font = "700 34px Arial";
    ctx.fillText(`Total ${currency.format(selectedTotal)}`, 56, height - 58);
    ctx.font = "18px Arial";
    ctx.fillStyle = "#765764";
    ctx.fillText("Generated from MLP CCG picker", 56, height - 28);
    setExportUrl(canvas.toDataURL("image/png"));
    setExportFileName(`${safeFileName}.png`);
    setIsExporting(false);
  }

  if (!data) {
    return (
      <main className="appShell loadingShell">
        <div className="loadingPanel">Loading card catalog...</div>
      </main>
    );
  }

  return (
    <main className="appShell">
      <section className="topBand">
        <div className="brandBlock">
          <div className="brandImage" style={{ backgroundImage: `url(${assetUrl(featured)})` }} />
          <div>
            <p className="eyebrow">MLP CCG Card Picker</p>
            <h1>My Little Pony Card Shop</h1>
            <p className="intro">
              Browse by set, select the cards you want, enter prices, and create a ready-to-share order image.
            </p>
          </div>
        </div>
        <div className="heroArt" aria-hidden="true">
          <img className="heroGiftPony" src={assetUrl("/brand/asset_12.png")} alt="" />
        </div>
      </section>

      <section className="workspace">
        <aside className="filters">
          <div className="filterHeading">
            <p className="eyebrow">FILTER CARDS</p>
            <h2>Find Cards</h2>
            <p>Search by set or card tag.</p>
          </div>

          <label className="searchBox">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Card name, number, or file"
            />
          </label>

          <div className="filterGroup">
            <div className="filterTitle">Sets</div>
            <button className={activeSeries === "All" ? "active" : ""} onClick={() => selectSeries("All")}>
              All <span>{cards.length}</span>
            </button>
            {data.series.map((item) => (
              <button
                key={item.name}
                className={activeSeries === item.name ? "active" : ""}
                onClick={() => selectSeries(item.name)}
              >
                <span className="seriesLabel">
                  {seriesIcons[item.name] && (
                    <img src={assetUrl(seriesIcons[item.name])} alt="" width="28" height="28" loading="lazy" />
                  )}
                  <span>{item.name}</span>
                </span>
                <span className="seriesCount">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="filterGroup compact">
            <div className="filterTitle">Tags</div>
            {["All", "UR", "Foil", "Promo"].map((item) => (
              <button key={item} className={rarity === item ? "active" : ""} onClick={() => selectRarity(item)}>
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section className="gallery" aria-label="Card catalog" ref={galleryRef}>
          <div className="galleryHeader">
            <div>
              <strong>{filteredCards.length}</strong>
              <span> cards found</span>
            </div>
            <button className="ghostButton" onClick={() => setPicked({})} disabled={!pickedList.length}>
              Clear selection
            </button>
          </div>

          <div className="cardGrid">
            {filteredCards.slice(0, 240).map((card) => {
              const selected = Boolean(picked[card.id]);
              return (
                <button
                  key={card.id}
                  className={`cardTile ${selected ? "selected" : ""} ${
                    tradingCardSeries.has(card.series) ? "tradingCardTile" : ""
                  }`}
                  onClick={() => toggleCard(card)}
                  title={card.filename}
                >
                  <div className="cardImageWrap">
                    <img
                      src={thumbnailUrl(card.image)}
                      alt={card.name}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => fallbackToOriginal(event, card.image)}
                    />
                    {showDoubleSidedLabel(card) && <span className="sideBadge">2-sided</span>}
                  </div>
                  <div className="cardInfo">
                    <strong>{card.name}</strong>
                    <span>
                      #{card.number ?? "-"} · {card.cardType}
                    </span>
                    {showDoubleSidedLabel(card) && (
                      <small>{card.images.map((image) => image.filename).join(" / ")}</small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {filteredCards.length > 240 && (
            <p className="limitNote">Showing the first 240 cards. Use search or filters to narrow the results.</p>
          )}
        </section>

        <aside className="cart" ref={exportRef}>
          <div className="cartHeader">
            <div>
              <p className="eyebrow">Selected</p>
              <h2>Order</h2>
            </div>
            <strong>{currency.format(selectedTotal)}</strong>
          </div>

          <label className="orderTitleField">
            <span>Order title</span>
            <input
              value={orderTitle}
              onChange={(event) => setOrderTitle(event.target.value)}
              placeholder="e.g. Emma's Card Order"
              maxLength={80}
            />
          </label>

          <div className="cartList">
            {pickedList.length === 0 ? (
              <p className="emptyText">Select cards from the catalog, then enter the price and quantity here.</p>
            ) : (
              pickedList.map(({ card, price, quantity }) => (
                <article className="cartItem" key={card.id}>
                  <div className="cartThumbs">
                    {card.images.slice(0, 2).map((image) => (
                      <img
                        key={image.filename}
                        src={thumbnailUrl(image.image)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => fallbackToOriginal(event, image.image)}
                      />
                    ))}
                  </div>
                  <div>
                    <strong>{card.name}</strong>
                    <span>
                      {card.series} · #{card.number ?? "-"} {showDoubleSidedLabel(card) ? "· 2-sided" : ""}
                    </span>
                    <div className="cartControls">
                      <input
                        aria-label={`${card.name} price`}
                        value={price}
                        onChange={(event) => updatePicked(card.id, { price: event.target.value })}
                        placeholder="Price"
                        inputMode="decimal"
                      />
                      <input
                        aria-label={`${card.name} quantity`}
                        value={quantity}
                        onChange={(event) =>
                          updatePicked(card.id, { quantity: Math.max(1, Number(event.target.value || 1)) })
                        }
                        type="number"
                        min="1"
                      />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <button className="primaryButton" onClick={generateImage} disabled={!pickedList.length || isExporting}>
            {isExporting ? "Creating image..." : "Create order image"}
          </button>

          {exportUrl && (
            <div className="exportPreview">
              <img src={exportUrl} alt="Generated order" />
              <a href={exportUrl} download={exportFileName}>
                Download image
              </a>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
