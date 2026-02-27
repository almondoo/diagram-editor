import { useViewport } from "../hooks/useViewport.js";

interface SyntaxPanelProps {
  onClose: () => void;
}

export function SyntaxPanel({ onClose }: SyntaxPanelProps) {
  const { isMobile } = useViewport();

  return (
    <div
      className={`syntax-card overflow-auto bg-bg-overlay p-[18px] text-[11px] leading-[1.7] font-mono text-text-muted ${isMobile ? "fixed inset-0 z-[200] [-webkit-overflow-scrolling:touch]" : "absolute top-[42px] right-3 w-[420px] max-h-[calc(100vh-140px)] border border-border rounded-[10px] z-50 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"}`}
    >
      <div className="font-bold text-text-primary mb-3 text-sm">
        構文リファレンス
      </div>

      <div className="font-semibold text-xs mb-1" style={{ color: "#c084fc" }}>ノード (node)</div>
      <div className="text-text-secondary mb-0.5">{'node <id> "ラベル" { プロパティ }'}</div>
      <table className="w-full border-collapse mb-3 text-[10.5px]">
        <thead>
          <tr className="border-b border-border">
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">プロパティ</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">値</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["shape", "rect | stadium | diamond | ellipse | circle | cylinder | hexagon | parallelogram | trapezoid", "rect"],
            ["color", "#hex (例: #6366f1) — 未指定時ランダム", "ランダム"],
            ["text", "#hex — テキスト色", "#ffffff"],
            ["icon", "アイコン名 (例: aws.service.s3, aws.service.lambda)", "なし"],
            ["dashed", "true | false — 枠線を破線に", "false"],
          ].map(([k, v, d]) => (
            <tr key={k} className="border-b border-border-subtle">
              <td className="px-1.5 py-[3px] text-[#60a5fa]">{k}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{v}</td>
              <td className="px-1.5 py-[3px] text-text-faint">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="font-semibold text-xs mb-1" style={{ color: "#f97316" }}>エッジ (edge)</div>
      <div className="text-text-secondary mb-0.5">{'edge <from> 演算子 <to> { プロパティ }'}</div>
      <table className="w-full border-collapse mb-1.5 text-[10.5px]">
        <thead>
          <tr className="border-b border-border">
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">演算子</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">矢印</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">線種</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["->", "順方向 →", "実線"],
            ["<-", "逆方向 ←", "実線"],
            ["<->", "双方向 ↔", "実線"],
            ["-->", "順方向 →", "破線"],
            ["<--", "逆方向 ←", "破線"],
            ["<-->", "双方向 ↔", "破線"],
            ["--", "なし", "実線"],
          ].map(([op, arrow, style]) => (
            <tr key={op} className="border-b border-border-subtle">
              <td className="px-1.5 py-[3px] text-[#f97316] font-mono">{op}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{arrow}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{style}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full border-collapse mb-3 text-[10.5px]">
        <thead>
          <tr className="border-b border-border">
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">プロパティ</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">値</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["label", '"テキスト" — エッジラベル', "なし"],
            ["color", "#hex (例: #94a3b8)", "#94a3b8"],
            ["animate", "true | false — ダッシュアニメ", "false"],
            ["thickness", "数値 (px) — 線の太さ", "1.5"],
            ["curve", "smooth | straight — カーブの種類", "smooth"],
          ].map(([k, v, d]) => (
            <tr key={k} className="border-b border-border-subtle">
              <td className="px-1.5 py-[3px] text-[#60a5fa]">{k}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{v}</td>
              <td className="px-1.5 py-[3px] text-text-faint">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="font-semibold text-xs mb-1" style={{ color: "#10b981" }}>グループ (group)</div>
      <div className="text-text-secondary mb-0.5">{'group <id> "ラベル" { プロパティ }'}</div>
      <table className="w-full border-collapse mb-3 text-[10.5px]">
        <thead>
          <tr className="border-b border-border">
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">プロパティ</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">値</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["color", "#hex — グループの色", "ランダム"],
          ].map(([k, v, d]) => (
            <tr key={k} className="border-b border-border-subtle">
              <td className="px-1.5 py-[3px] text-[#60a5fa]">{k}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{v}</td>
              <td className="px-1.5 py-[3px] text-text-faint">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="font-semibold text-xs mb-1" style={{ color: "#fbbf24" }}>ノート (note)</div>
      <div className="text-text-secondary mb-0.5">{'note <id> "テキスト" { プロパティ }'}</div>
      <table className="w-full border-collapse mb-3 text-[10.5px]">
        <thead>
          <tr className="border-b border-border">
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">プロパティ</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">値</td>
            <td className="px-1.5 py-[3px] text-text-faint font-semibold">デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["color", "#hex — ノートの色", "#fbbf24"],
          ].map(([k, v, d]) => (
            <tr key={k} className="border-b border-border-subtle">
              <td className="px-1.5 py-[3px] text-[#60a5fa]">{k}</td>
              <td className="px-1.5 py-[3px] text-text-primary">{v}</td>
              <td className="px-1.5 py-[3px] text-text-faint">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="font-semibold text-xs mb-1" style={{ color: "#f472b6" }}>スタイル上書き (style)</div>
      <div className="text-text-secondary mb-0.5">{'style <nodeId> { color=#hex shape=rect text=#hex }'}</div>
      <div className="text-text-faint mb-3">既存ノードのプロパティを後から上書きします</div>

      <div className="font-semibold text-xs mb-1" style={{ color: "#6b7280" }}>コメント</div>
      {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
      <div className="text-text-secondary mb-0.5">{"// コメント行"}</div>
      {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
      <div className="text-text-secondary mb-3">{"# コメント行"}</div>

      <button
        onClick={onClose}
        className="mt-1 bg-surface-alt border border-border-faint text-text-muted px-3.5 py-[5px] rounded-[5px] cursor-pointer text-[11px]"
      >
        閉じる
      </button>
    </div>
  );
}
