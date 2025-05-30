import React from 'react';
import './MoveHistory.css';

interface Move {
  piece: string;
  from: string;
  to: string;
  capture?: boolean;
  check?: boolean;
  checkmate?: boolean;
}

interface MoveHistoryProps {
  moves: Move[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const formatMove = (move: Move): string => {
    let notation = move.piece;
    if (move.capture) notation += 'x';
    notation += move.to;
    if (move.checkmate) notation += '#';
    else if (move.check) notation += '+';
    return notation;
  };

  return (
    <>
      <h3 className="history-title">Move History</h3>
      <div className="moves-container">
        {moves.length === 0 ? (
          <div className="no-moves">No moves yet</div>
        ) : (
          <div className="moves-list">
            {moves.map((move, index) => (
              <div key={index} className="move-entry">
                <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                <span className={`move-text ${index % 2 === 0 ? 'white' : 'black'}`}>
                  {formatMove(move)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MoveHistory; 