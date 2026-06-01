/** Global styles for Purga Rift (injected once by IntegratedGameShell) */
export const PURGA_RIFT_STYLES_ID = 'purga-rift-game-styles';

export const PURGA_RIFT_STYLES = `
  @keyframes glitch {
    0% { transform: translate(0) }
    20% { transform: translate(-2px, 2px) }
    40% { transform: translate(-2px, -2px) }
    60% { transform: translate(2px, 2px) }
    80% { transform: translate(2px, -2px) }
    100% { transform: translate(0) }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%) }
    100% { transform: translateY(100%) }
  }
  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .animate-glitch { animation: glitch 0.3s infinite linear; }
  .animate-scanline { animation: scanline 8s infinite linear; }
  .animate-wave { animation: wave 2s infinite ease-in-out; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.5);
  }
`;
