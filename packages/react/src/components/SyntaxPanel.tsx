import type { CSSProperties } from "react";
import { useViewport } from "../hooks/useViewport.js";

interface SyntaxPanelProps {
  onClose: () => void;
}

const baseStyle: CSSProperties = {
  overflow: "auto",
  background: "#131720",
  padding: 18,
  fontSize: 11,
  lineHeight: 1.7,
  fontFamily: "'IBM Plex Mono', monospace",
  color: "#94a3b8",
};

const mobileStyle: CSSProperties = {
  ...baseStyle,
  position: "fixed",
  inset: 0,
  zIndex: 200,
  WebkitOverflowScrolling: "touch",
};

const desktopStyle: CSSProperties = {
  ...baseStyle,
  position: "absolute",
  top: 42,
  right: 12,
  width: 420,
  maxHeight: "calc(100vh - 140px)",
  border: "1px solid #2d3548",
  borderRadius: 10,
  zIndex: 50,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

export function SyntaxPanel({ onClose }: SyntaxPanelProps) {
  const { isMobile } = useViewport();

  return (
    <div
      className="syntax-card"
      style={isMobile ? mobileStyle : desktopStyle}
    >
      <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 12, fontSize: 14 }}>
        構文リファレンス
      </div>

      <div style={{ color: "#c084fc", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>ノード (node)</div>
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'node <id> "ラベル" { プロパティ }'}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 10.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3548" }}>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>プロパティ</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>値</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["shape", "rect | stadium | diamond | ellipse | circle | cylinder | hexagon | parallelogram | trapezoid", "rect"],
            ["color", "#hex (例: #6366f1) — 未指定時ランダム", "ランダム"],
            ["text", "#hex — テキスト色", "#ffffff"],
            ["border", "#hex — 枠線色", "colorと同じ"],
            ["borderWidth", "数値 (px)", "2"],
            ["icon", "絵文字 (例: ⚙️ ⚡ 🔄)", "なし"],
            ["group", "グループID — 所属グループ", "なし"],
            ["fontSize", "数値 (px)", "13"],
            ["dashed", "true | false — 枠線を破線に", "false"],
          ].map(([k, v, d]) => (
            <tr key={k} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px", color: "#60a5fa" }}>{k}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{v}</td>
              <td style={{ padding: "3px 6px", color: "#64748b" }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ color: "#f97316", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>エッジ (edge)</div>
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'edge <from> 演算子 <to> { プロパティ }'}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6, fontSize: 10.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3548" }}>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>演算子</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>矢印</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>線種</td>
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
            <tr key={op} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px", color: "#f97316", fontFamily: "monospace" }}>{op}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{arrow}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{style}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 10.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3548" }}>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>プロパティ</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>値</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>デフォルト</td>
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
            <tr key={k} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px", color: "#60a5fa" }}>{k}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{v}</td>
              <td style={{ padding: "3px 6px", color: "#64748b" }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ color: "#10b981", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>グループ (group)</div>
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'group <id> "ラベル" { プロパティ }'}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 10.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3548" }}>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>プロパティ</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>値</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["color", "#hex — グループの色", "ランダム"],
          ].map(([k, v, d]) => (
            <tr key={k} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px", color: "#60a5fa" }}>{k}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{v}</td>
              <td style={{ padding: "3px 6px", color: "#64748b" }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ color: "#fbbf24", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>ノート (note)</div>
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'note <id> "テキスト" { プロパティ }'}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 10.5 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2d3548" }}>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>プロパティ</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>値</td>
            <td style={{ padding: "3px 6px", color: "#64748b", fontWeight: 600 }}>デフォルト</td>
          </tr>
        </thead>
        <tbody>
          {[
            ["color", "#hex — ノートの色", "#fbbf24"],
          ].map(([k, v, d]) => (
            <tr key={k} style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px", color: "#60a5fa" }}>{k}</td>
              <td style={{ padding: "3px 6px", color: "#e2e8f0" }}>{v}</td>
              <td style={{ padding: "3px 6px", color: "#64748b" }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ color: "#f472b6", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>スタイル上書き (style)</div>
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'style <nodeId> { color=#hex shape=rect border=#hex text=#hex }'}</div>
      <div style={{ color: "#64748b", marginBottom: 12 }}>既存ノードのプロパティを後から上書きします</div>

      <div style={{ color: "#6b7280", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>コメント</div>
      {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{"// コメント行"}</div>
      {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
      <div style={{ color: "#cbd5e1", marginBottom: 12 }}>{"# コメント行"}</div>

      <button
        onClick={onClose}
        style={{
          marginTop: 4,
          background: "#1e293b",
          border: "1px solid #334155",
          color: "#94a3b8",
          padding: "5px 14px",
          borderRadius: 5,
          cursor: "pointer",
          fontSize: 11,
        }}
      >
        閉じる
      </button>
    </div>
  );
}
