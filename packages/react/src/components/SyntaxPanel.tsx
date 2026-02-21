interface SyntaxPanelProps {
  onClose: () => void;
}

export function SyntaxPanel({ onClose }: SyntaxPanelProps) {
  return (
    <div
      className="syntax-card"
      style={{
        position: "absolute",
        top: 42,
        right: 12,
        width: 420,
        maxHeight: "calc(100vh - 140px)",
        overflow: "auto",
        background: "#131720",
        border: "1px solid #2d3548",
        borderRadius: 10,
        padding: 18,
        zIndex: 50,
        fontSize: 11,
        lineHeight: 1.7,
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#94a3b8",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
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
            ["x", "数値 — X座標 (px)、未指定時は自動配置", "自動"],
            ["y", "数値 — Y座標 (px)、未指定時は自動配置", "自動"],
            ["w", "数値 — 幅 (px)", "150"],
            ["h", "数値 — 高さ (px)", "60"],
            ["icon", "絵文字 (例: ⚙️ ⚡ 🔄)", "なし"],
            ["group", "グループID — 所属グループ", "なし"],
            ["fontSize", "数値 (px)", "13"],
            ["opacity", "0〜1 の小数", "1"],
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
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'edge <from> -> <to> { プロパティ }'}</div>
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
            ["style", "solid | dashed", "solid"],
            ["animate", "true | false — ダッシュアニメ", "false"],
            ["thickness", "数値 (px) — 線の太さ", "1.5"],
            ["arrow", "end | both | none — 矢印の位置", "end"],
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
            ["x", "数値 — X座標 (px)", "0"],
            ["y", "数値 — Y座標 (px)", "0"],
            ["w", "数値 — 幅 (px)", "300"],
            ["h", "数値 — 高さ (px)", "200"],
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
            ["x", "数値 — X座標 (px)", "50"],
            ["y", "数値 — Y座標 (px)", "50"],
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
      <div style={{ color: "#cbd5e1", marginBottom: 2 }}>{'// コメント行'}</div>
      <div style={{ color: "#cbd5e1", marginBottom: 12 }}>{'# コメント行'}</div>

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
