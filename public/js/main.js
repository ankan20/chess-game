const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;



const renderBoard = () => {
  const board = chess.board();
  
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "dark"
        );

        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSource, draggedPiece.innerText);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};



const checkGameStatus = () => {
  console.log(chess.in_checkmate());
  if (chess.in_draw()) {
    socket.emit("gameStatus", { message: "The game is a draw!" });
  } else if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    socket.emit("gameStatus", { message: `${winner} wins by checkmate!` });
  }
};



const showPromotionOptions = () => {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
            <div class="modal-content">
                <h3>Choose Promotion Piece</h3>
                <button class="promotion-option" data-piece="q">Queen</button>
                <button class="promotion-option" data-piece="r">Rook</button>
                <button class="promotion-option" data-piece="b">Bishop</button>
                <button class="promotion-option" data-piece="n">Knight</button>
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelectorAll(".promotion-option").forEach((button) => {
      button.addEventListener("click", (event) => {
        const promotionPiece = event.target.getAttribute("data-piece");
        document.body.removeChild(modal);
        resolve(promotionPiece);
      });
    });
  });
};

const showPopup = (message) => {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
        <div class="modal-content">
            <h3>${message}</h3>
            <button class="close-popup">Close</button>
        </div>
    `;
  document.body.appendChild(modal);

  modal.querySelector(".close-popup").addEventListener("click", () => {
    document.body.removeChild(modal);
  });
};

const handleMove = (source, target, draggedPiece) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "",
  };

  if (
    ((draggedPiece === "♟︎" || draggedPiece === "♙") &&
      source.row === 1 &&
      target.row === 0) ||
    (source.row === 6 && target.row === 7)
  ) {
    showPromotionOptions().then((promotionPiece) => {
      move.promotion = promotionPiece;
      socket.emit("move", move);
      checkGameStatus();
    });
  } else {
    socket.emit("move", move);
    checkGameStatus();
  }

  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const BunicodePieces = {
    p: "♟︎",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
  };
  const WunicodePieces = {
    p: "♙",
    r: "♖",
    n: "♘",
    b: "♗",
    q: "♕",
    k: "♔",
  };
  if (piece.color === "w") {
    return WunicodePieces[piece.type] || "";
  }
  if (piece.color === "b") {
    return WunicodePieces[piece.type] || "";
  }

  return BunicodePieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", () => {
  chess.load();
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
  checkGameStatus();
});

socket.on("gameStatus", (status) => {
  showPopup(status.message);
});

renderBoard();

