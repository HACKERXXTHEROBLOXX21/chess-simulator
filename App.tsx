
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square as ChessSquare, Move as ChessMove } from 'chess.js';
import { RANKS, FILES, PIECE_IMAGES } from './constants';
import { GameState, PieceColor, PieceType, SoundType } from './types';
import { audioService } from './services/audioService';
import { geminiService } from './services/geminiService';
import { 
  Trophy, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Bot, 
  History,
  AlertCircle,
  Volume2,
  VolumeX,
  User
} from 'lucide-react';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    fen: 'start',
    turn: 'w',
    history: [],
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    winner: null,
    captured: { w: [], b: [] }
  });
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Play sound helper
  const playSound = useCallback((type: SoundType) => {
    if (!isMuted) audioService.play(type);
  }, [isMuted]);

  // Update game state from chess.js instance
  const syncGameState = useCallback((chess: Chess) => {
    const history = chess.history({ verbose: true });
    
    // Calculate captured pieces
    const captured = { w: [] as PieceType[], b: [] as PieceType[] };
    history.forEach(m => {
      if (m.captured) {
        // If white moved and captured, it captured a black piece
        const capturedColor = m.color === 'w' ? 'b' : 'w';
        captured[capturedColor].push(m.captured);
      }
    });

    setGameState({
      fen: chess.fen(),
      turn: chess.turn(),
      history: history as any[],
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition(),
      winner: chess.isCheckmate() ? (chess.turn() === 'w' ? 'b' : 'w') : (chess.isDraw() ? 'draw' : null),
      captured
    });
  }, []);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      const chess = new Chess(game.fen());
      const result = chess.move(move);
      
      if (result) {
        setGame(chess);
        syncGameState(chess);
        
        // Sound effects
        if (chess.isCheckmate() || chess.isDraw()) {
          playSound(SoundType.END);
        } else if (chess.isCheck()) {
          playSound(SoundType.CHECK);
        } else if (result.captured) {
          playSound(SoundType.CAPTURE);
        } else {
          playSound(SoundType.MOVE);
        }

        setSelectedSquare(null);
        setValidMoves([]);
        setAnalysis(null); // Clear analysis on new move
      }
      return result;
    } catch (e) {
      return null;
    }
  }, [game, syncGameState, playSound]);

  const onSquareClick = (square: string) => {
    if (gameState.isCheckmate || gameState.isDraw) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // If a square is already selected, try to move
    if (selectedSquare) {
      const move = makeMove({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) return;
    }

    // Select piece
    const piece = game.get(square as ChessSquare);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as ChessSquare, verbose: true });
      setValidMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    syncGameState(newGame);
    setAnalysis(null);
    setSelectedSquare(null);
    setValidMoves([]);
    playSound(SoundType.START);
  };

  const getCoachAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await geminiService.analyzePosition(game.fen(), game.history());
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const undoMove = () => {
    const chess = new Chess(game.fen());
    chess.undo();
    setGame(chess);
    syncGameState(chess);
    setSelectedSquare(null);
    setValidMoves([]);
    playSound(SoundType.MOVE);
  };

  const lastMove = gameState.history[gameState.history.length - 1];

  return (
    <div className="min-h-screen bg-[#302e2c] flex flex-col md:flex-row items-center justify-center p-4 gap-8">
      {/* Sidebar: Players and Board */}
      <div className="flex flex-col gap-4 w-full max-w-[600px]">
        {/* Opponent Info */}
        <div className="flex items-center justify-between px-2 text-gray-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#262421] rounded flex items-center justify-center border border-[#403d39]">
              <Bot size={24} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold">AI Opponent (Level 1)</p>
              <div className="flex gap-1 h-3">
                {gameState.captured.w.map((p, i) => (
                  <img key={i} src={PIECE_IMAGES[`b-${p}`]} className="h-full opacity-60" />
                ))}
              </div>
            </div>
          </div>
          <div className="text-2xl font-mono bg-[#262421] px-3 py-1 rounded border border-[#403d39]">
            {gameState.turn === 'b' ? '10:00' : '10:00'}
          </div>
        </div>

        {/* The Chess Board */}
        <div className="relative aspect-square w-full shadow-2xl rounded overflow-hidden border-4 border-[#262421]">
          <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
            {RANKS.map((rank) => (
              FILES.map((file) => {
                const squareId = `${file}${rank}`;
                const isDark = (FILES.indexOf(file) + rank) % 2 === 0;
                const piece = game.get(squareId as ChessSquare);
                const isSelected = selectedSquare === squareId;
                const isValidMove = validMoves.includes(squareId);
                const isLastMove = lastMove && (lastMove.from === squareId || lastMove.to === squareId);
                const isCheckingSquare = gameState.isCheck && piece?.type === 'k' && piece?.color === gameState.turn;

                return (
                  <div
                    key={squareId}
                    onClick={() => onSquareClick(squareId)}
                    className={`
                      relative flex items-center justify-center cursor-pointer transition-colors duration-150
                      ${isDark ? 'bg-[#739552]' : 'bg-[#ebecd0]'}
                      ${isSelected ? 'bg-[#f5f682] !important' : ''}
                      ${isLastMove && !isSelected ? 'bg-[#f5f682] opacity-80' : ''}
                      ${isCheckingSquare ? 'bg-red-500 !important' : ''}
                    `}
                  >
                    {/* Square Labels */}
                    {file === 'a' && (
                      <span className={`absolute top-0.5 left-0.5 text-[10px] font-bold ${isDark ? 'text-[#ebecd0]' : 'text-[#739552]'}`}>
                        {rank}
                      </span>
                    )}
                    {rank === 1 && (
                      <span className={`absolute bottom-0.5 right-0.5 text-[10px] font-bold ${isDark ? 'text-[#ebecd0]' : 'text-[#739552]'}`}>
                        {file}
                      </span>
                    )}

                    {/* Move Indicators */}
                    {isValidMove && !piece && (
                      <div className="w-4 h-4 rounded-full bg-black/10"></div>
                    )}
                    {isValidMove && piece && (
                      <div className="absolute inset-0 border-[6px] border-black/10 rounded-full m-1"></div>
                    )}

                    {/* Chess Piece */}
                    {piece && (
                      <img
                        src={PIECE_IMAGES[`${piece.color}-${piece.type}`]}
                        alt={`${piece.color} ${piece.type}`}
                        className={`w-[85%] h-[85%] select-none transition-transform duration-200 ${isSelected ? 'scale-110 -translate-y-1' : ''}`}
                        draggable={false}
                      />
                    )}
                  </div>
                );
              })
            ))}
          </div>

          {/* Game Over Overlay */}
          {(gameState.isCheckmate || gameState.isDraw) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#262421] p-8 rounded-xl shadow-2xl text-center border border-[#403d39] transform animate-in fade-in zoom-in duration-300">
                <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Game Over</h2>
                <p className="text-xl text-gray-300 mb-6">
                  {gameState.isCheckmate ? `Checkmate! ${gameState.winner === 'w' ? 'White' : 'Black'} wins!` : 'Draw!'}
                </p>
                <button
                  onClick={resetGame}
                  className="bg-[#81b64c] hover:bg-[#a3d160] text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <RotateCcw size={20} />
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex items-center justify-between px-2 text-gray-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#262421] rounded flex items-center justify-center border border-[#403d39]">
              <User size={24} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold">You (White)</p>
              <div className="flex gap-1 h-3">
                {gameState.captured.b.map((p, i) => (
                  <img key={i} src={PIECE_IMAGES[`w-${p}`]} className="h-full opacity-60" />
                ))}
              </div>
            </div>
          </div>
          <div className="text-2xl font-mono bg-[#262421] px-3 py-1 rounded border border-[#403d39]">
            {gameState.turn === 'w' ? '10:00' : '10:00'}
          </div>
        </div>
      </div>

      {/* Control Panel: History and Analysis */}
      <div className="w-full max-w-[400px] h-[600px] bg-[#262421] rounded-lg shadow-xl flex flex-col border border-[#403d39]">
        {/* Header Tabs */}
        <div className="flex border-b border-[#403d39]">
          <div className="flex-1 p-4 text-center font-bold text-white border-b-2 border-[#81b64c] bg-[#2d2a27]">
            Game
          </div>
          <div className="flex-1 p-4 text-center font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
            Chat
          </div>
        </div>

        {/* History Area */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700">
          <div className="grid grid-cols-2 gap-px bg-[#403d39] rounded overflow-hidden">
            {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => (
              <React.Fragment key={i}>
                <div className="bg-[#2d2a27] p-2 flex gap-4 items-center group">
                  <span className="text-gray-500 w-4 text-xs">{i + 1}.</span>
                  <span className="text-gray-200 cursor-pointer hover:bg-[#403d39] px-1 rounded flex-1">
                    {gameState.history[i * 2]?.san}
                  </span>
                </div>
                <div className="bg-[#2d2a27] p-2 flex gap-4 items-center group">
                  <span className="text-gray-200 cursor-pointer hover:bg-[#403d39] px-1 rounded flex-1">
                    {gameState.history[i * 2 + 1]?.san || ''}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          {gameState.history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <History size={48} className="mb-2" />
              <p>No moves yet</p>
            </div>
          )}
        </div>

        {/* AI Analysis View */}
        {analysis && (
          <div className="m-4 p-4 bg-[#3d3a37] rounded-lg border border-[#81b64c]/30 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-2 text-[#81b64c]">
              <Bot size={18} />
              <span className="font-bold text-sm uppercase tracking-wider">Coach Analysis</span>
            </div>
            <p className="text-sm text-gray-200 italic leading-relaxed">
              "{analysis}"
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-[#211f1c] border-t border-[#403d39] flex flex-col gap-3">
          <div className="flex gap-2">
            <button 
              onClick={undoMove}
              className="flex-1 bg-[#3d3a37] hover:bg-[#4d4a46] p-2 rounded flex items-center justify-center transition-colors text-gray-300"
              title="Undo"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              className="flex-1 bg-[#3d3a37] hover:bg-[#4d4a46] p-2 rounded flex items-center justify-center transition-colors text-gray-300"
              title="Redo"
            >
              <ChevronRight size={24} />
            </button>
            <button 
              onClick={getCoachAnalysis}
              disabled={isAnalyzing}
              className={`flex-[2] ${isAnalyzing ? 'bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-500'} p-2 rounded flex items-center justify-center gap-2 transition-colors font-bold`}
            >
              <Bot size={20} />
              {isAnalyzing ? 'Thinking...' : 'Analyze'}
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="bg-[#3d3a37] hover:bg-[#4d4a46] p-2 rounded transition-colors text-gray-300"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button 
              onClick={resetGame}
              className="flex-1 bg-[#3d3a37] hover:bg-[#4d4a46] p-2 rounded transition-colors text-gray-300 flex items-center justify-center gap-2 font-bold"
            >
              <RotateCcw size={18} />
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
