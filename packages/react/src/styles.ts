export const DIAGRAM_EDITOR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0f1219; }
  ::-webkit-scrollbar-thumb { background: #2d3548; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
  .edge-animate { animation: edgeDash 1s linear infinite; stroke-dasharray: 8,4; }
  @keyframes edgeDash { to { stroke-dashoffset: -20; } }
  .sel-outline { animation: selPulse 1.5s ease-in-out infinite; }
  @keyframes selPulse { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
  .tmpl-btn { transition: all 0.15s; }
  .tmpl-btn:hover { background: #1e293b !important; border-color: #475569 !important; }
  textarea::selection { background: #312e81; }
  .syntax-card { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
`;
