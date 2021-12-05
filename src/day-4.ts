import * as T from "@effect-ts/core/Effect";
import * as M from "@effect-ts/core/Effect/Managed";
import * as STR from "@effect-ts/core/String";
import * as O from "@effect-ts/core/Option";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { printResults, readFileAsStream, parseInteger, bitAt } from "./utils";

type Board = CK.Chunk<number>;
type BoardMask = number;
type Draw = number;
type Winner = Tp.Tuple<[Board, BoardMask, Draw]>;

function isEmptyLine(str: string) {
  return STR.trim(str).length === 0;
}

const forEachChunkOption = CK.forEachF(O.Applicative);

const fileStream = readFileAsStream("./inputs/day-4.txt");

const boardStream = pipe(
  fileStream,
  S.splitLines,
  S.drop(1),
  S.collect((line) =>
    isEmptyLine(line)
      ? O.none
      : O.some(CK.from(STR.split_(STR.trim(line), /\s+/)))
  ),
  S.grouped(5),
  S.map((_) => pipe(CK.flatten(_), forEachChunkOption(parseInteger))),
  S.some
);

const drawStream = pipe(
  fileStream,
  S.splitLines,
  S.take(1),
  S.chain((line) => S.fromIterable(STR.split_(STR.trim(line), ","))),
  S.map(parseInteger),
  S.some
);

function applyDrawToMask(num: Draw) {
  return <R, E>(self: S.Stream<R, E, Tp.Tuple<[Board, BoardMask]>>) =>
    S.map_(self, ({ tuple: [board, mask] }) => {
      const index = CK.indexWhere_(board, (a) => a === num);

      return Tp.tuple(
        board,
        index > -1 ? mask | (1 << (CK.size(board) - index - 1)) : mask
      );
    });
}

function isWinningBoard(mask: BoardMask): boolean {
  const winningCombinations = [
    // Rows
    0b11111_00000_00000_00000_00000, //
    0b00000_11111_00000_00000_00000, //
    0b00000_00000_11111_00000_00000, //
    0b00000_00000_00000_11111_00000, //
    0b00000_00000_00000_00000_11111, //
    // Columns
    0b10000_10000_10000_10000_10000, //
    0b01000_01000_01000_01000_01000, //
    0b00100_00100_00100_00100_00100, //
    0b00010_00010_00010_00010_00010, //
    0b00001_00001_00001_00001_00001, //
  ];

  return O.isSome(
    AR.findFirst_(
      winningCombinations,
      (combination) => (combination & mask) === combination
    )
  );
}

function drawNumbers(numbers: CK.Chunk<number>) {
  const go = <R, E>(
    numbers: CK.Chunk<number>,
    boards: S.Stream<R, E, Tp.Tuple<[Board, BoardMask]>>
  ): S.Stream<R, E, Tp.Tuple<[Board, BoardMask, Draw]>> =>
    O.fold_(
      CK.head(numbers),
      () => S.empty,
      (currentNumber) =>
        S.unwrapManaged(
          M.gen(function* (_) {
            const {
              tuple: [winning, others],
            } = yield* _(
              pipe(
                boards,
                applyDrawToMask(currentNumber),
                S.partition((tuple) => isWinningBoard(Tp.get_(tuple, 1)), 1000)
              )
            );

            return pipe(
              winning,
              S.map((tuple) => Tp.append_(tuple, currentNumber)),
              S.concat(
                go(
                  O.getOrElse_(CK.tail(numbers), () => CK.empty<number>()),
                  others
                )
              )
            );
          })
        )
    );

  return <R, E>(boards: S.Stream<R, E, Board>) =>
    go(
      numbers,
      S.map_(boards, (board) => Tp.tuple(board, 0))
    );
}

function calculateWinnerScore(winner: Winner) {
  const {
    tuple: [board, mask, num],
  } = winner;

  const boardScore = CK.reduce_(
    CK.zipWithIndex(board),
    0,
    (acc, { tuple: [score, index] }) =>
      !!bitAt(CK.size(board) - index - 1, mask) ? acc : acc + score
  );

  return boardScore * num;
}

const part1 = T.gen(function* (_) {
  const numbers = yield* _(pipe(drawStream, S.runCollect));

  return yield* _(
    pipe(
      boardStream,
      drawNumbers(numbers),
      S.runHead,
      T.some,
      T.map(calculateWinnerScore)
    )
  );
});

const part2 = T.gen(function* (_) {
  const numbers = yield* _(pipe(drawStream, S.runCollect));

  return yield* _(
    pipe(
      boardStream,
      drawNumbers(numbers),
      S.runLast,
      T.some,
      T.map(calculateWinnerScore)
    )
  );
});

printResults(4, part1, part2).catch(console.error);
