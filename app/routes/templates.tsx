import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { TEMPLATES, CATEGORY_LABELS, type TemplateCategory } from "~/data/templates";
import { parseDSL, autoLayout, generateExportSVG } from "~/lib/core";
import { useViewport } from "~/lib/react";

export function meta() {
  return [
    { title: "DiagramCraft — テンプレート" },
    { name: "description", content: "テンプレートギャラリー" },
  ];
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as TemplateCategory[];

function TemplateThumbnail({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const svgHtml = useMemo(() => {
    if (!visible) return null;
    const parsed = parseDSL(code);
    for (const n of parsed.nodes) n._needsPosition = true;
    autoLayout(parsed.nodes, parsed.edges, parsed.groups);
    return generateExportSVG(parsed);
  }, [code, visible]);

  return (
    <div
      ref={ref}
      className="w-full bg-bg-deepest rounded-t-lg overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: "16 / 10" }}
    >
      {svgHtml ? (
        <div
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        <div className="text-text-dimmed text-xs">Loading...</div>
      )}
    </div>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState<"all" | TemplateCategory>("all");

  const filtered = activeTab === "all"
    ? TEMPLATES.filter((t) => t.id !== "empty")
    : TEMPLATES.filter((t) => t.category === activeTab);

  const grouped = useMemo(() => {
    if (activeTab !== "all") return null;
    const map = new Map<TemplateCategory, typeof TEMPLATES>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [activeTab, filtered]);

  return (
    <div className="min-h-screen bg-bg-deepest text-text-primary font-sans">
      {/* ヘッダー */}
      <header className="flex items-center px-6 h-12 bg-bg-raised border-b border-border-subtle gap-2.5">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-inherit">
          <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-purple flex items-center justify-center text-sm font-bold">
            ◈
          </div>
          {!isMobile && (
            <>
              <span className="text-[15px] font-bold tracking-tight">DiagramCraft</span>
              <span className="text-[9px] bg-primary-darker text-primary-pale px-1.5 py-0.5 rounded-[4px] font-semibold tracking-[0.05em] uppercase">
                Code → Diagram
              </span>
            </>
          )}
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          className="text-text-muted text-xs no-underline hover:text-text-primary transition-colors"
        >
          マイ作品
        </Link>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-[1200px] mx-auto" style={{ padding: isMobile ? "20px 16px" : "40px 48px" }}>
        <h1 className="text-[22px] font-bold text-text-primary m-0 tracking-tight" style={{ marginBottom: isMobile ? 16 : 24 }}>
          テンプレート
        </h1>

        {/* カテゴリタブ */}
        <div className="flex flex-wrap gap-2" style={{ marginBottom: isMobile ? 20 : 32 }}>
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
            全て
          </TabButton>
          {ALL_CATEGORIES.map((cat) => (
            <TabButton key={cat} active={activeTab === cat} onClick={() => setActiveTab(cat)}>
              {CATEGORY_LABELS[cat]}
            </TabButton>
          ))}
        </div>

        {/* グリッド表示 */}
        {activeTab === "all" && grouped ? (
          ALL_CATEGORIES.map((cat) => {
            const items = grouped.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <section key={cat} style={{ marginBottom: isMobile ? 24 : 40 }}>
                <h2 className="text-sm font-semibold text-text-muted m-0 mb-4">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                  {items.map((t) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      description={t.description}
                      code={t.code}
                      onClick={() => void navigate("/diagrams/new", { state: { templateCode: t.code } })}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                name={t.name}
                description={t.description}
                code={t.code}
                onClick={() => void navigate("/diagrams/new", { state: { templateCode: t.code } })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
        active
          ? "bg-primary-darker border-primary-dark text-primary-lighter"
          : "bg-transparent border-border-subtle text-text-muted hover:border-primary-dark hover:text-primary-lighter"
      }`}
    >
      {children}
    </button>
  );
}

function TemplateCard({ name, description, code, onClick }: { name: string; description: string; code: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-bg-panel border border-border-subtle rounded-lg cursor-pointer transition-[border-color] duration-150 overflow-hidden hover:border-primary-dark"
    >
      <TemplateThumbnail code={code} />
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-text-primary">{name}</div>
        <div className="text-xs text-text-dimmed mt-1 line-clamp-2">{description}</div>
      </div>
    </div>
  );
}
