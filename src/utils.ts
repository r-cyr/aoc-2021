import * as T from "@effect-ts/core/Effect";
import * as BR from "@effect-ts/core/Branded";
import * as O from "@effect-ts/core/Option";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { createReadStream } from "fs";
import { pipe } from "@effect-ts/core";
import { Predicate } from "@effect-ts/core/Function";

export class ReadFileError extends Error {
  readonly _tag = "ReadFileError";

  constructor(message: string, readonly options: { cause?: unknown } = {}) {
    super(message);
    this.name = this._tag;
  }
}

export class ParseError extends Error {
  readonly _tag = "ParseError";

  constructor(message: string, readonly options: { cause?: unknown } = {}) {
    super(message);
    this.name = this._tag;
  }
}

export class NotFoundError extends Error {
  readonly _tag = "NotFoundError";

  constructor(message: string, readonly options: { cause?: unknown } = {}) {
    super(message);
    this.name = this._tag;
  }
}

export function readFileAsStream(path: string): S.IO<ReadFileError, string> {
  return S.async<unknown, ReadFileError, string>((emit) => {
    const readStream = createReadStream(path, "utf-8");

    readStream.on("readable", () => {
      let chunk;
      while ((chunk = readStream.read()) !== null) {
        emit.chunk(CK.single(chunk));
      }
    });

    readStream.on("error", (error) => {
      emit.fail(
        new ReadFileError(`Error while reading file ${path}`, { cause: error })
      );
    });

    readStream.on("end", () => {
      emit.end();
    });
  });
}

export function parseInteger(str: string): O.Option<number> {
  return O.fromPredicate_(Number(str), (result) => !Number.isNaN(result));
}

export function bitArrayToNumber(arr: AR.Array<Bit>): number {
  return AR.reduceWithIndex_(
    arr,
    0,
    (index, acc, bit) => acc | (bit << (arr.length - index - 1))
  );
}

export type Bit = BR.Branded<0 | 1, "Bit">;

export function stringToBitArray(str: string): AR.Array<Bit> {
  return AR.map_(AR.from(str), (bit) => (bit === "0" ? 0 : 1) as Bit);
}

export function bitAt(offset: number, n: number): Bit {
  return ((n >>> offset) & 1) as Bit;
}

export function generateBitMask(n: number): number {
  let result = 0;
  let count = 0;

  while (count < n) {
    result = (result << 1) | 1;
    count++;
  }

  return result;
}

export function printLine(...args: any[]): T.UIO<void> {
  return T.succeedWith(() => {
    console.log(...args);
  });
}

export function printResults<
  Effects extends readonly T.Effect<any, any, any>[]
>(day: number, ...parts: Effects): Promise<void> {
  return pipe(
    T.forEach_(CK.zipWithIndex(CK.from(parts)), ({ tuple: [part, index] }) =>
      T.chain_(part, (result) =>
        printLine(`The result for Day ${day} Part ${index + 1} is ${result}`)
      )
    ),
    T.asUnit,
    T.runPromise
  );
}

export function range(a: number, b: number): CK.Chunk<number> {
  if (a < b) {
    return CK.map_(CK.range(0, b - a), (x) => a + x);
  }

  return CK.map_(CK.range(0, a - b), (x) => a - x);
}

/**
 * Returns true if all the elements of the array match a predicate
 */
export function forAll_<A>(as: AR.Array<A>, pred: Predicate<A>): boolean {
  for (const a of as) {
    if (!pred(a)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if all the elements of the array match a predicate
 */
export function forAll<A>(pred: Predicate<A>) {
  return (as: AR.Array<A>) => forAll_(as, pred);
}

/**
 * Returns true if the array contains the element
 */
export function includes_<A>(as: AR.Array<A>, elem: A): boolean {
  for (const a of as) {
    if (a === elem) {
      return true;
    }
  }

  return false;
}

/**
 * Returns true if the array contains the element
 *
 * @ets_data_first includes_
 */
export function includes<A>(elem: A) {
  return (as: AR.Array<A>) => includes_(as, elem);
}

/**
 * Returns a copy of the array
 */
export function copy<A>(as: AR.Array<A>): AR.Array<A> {
  return as.slice(0);
}

export function size<T>(arr: AR.Array<T>) {
  return arr.length;
}

/**
 * Converts the string to uppercase
 */
export function toUpperCase(str: string): string {
  return str.toUpperCase();
}
/**
 * Converts the string to uppercase
 */
export function toLowerCase(str: string): string {
  return str.toLowerCase();
}
