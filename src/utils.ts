import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { createReadStream } from "fs";
import { pipe } from "@effect-ts/core";

export function readFileAsStream(path: string) {
  return S.async<unknown, Error, string>((emit) => {
    const readStream = createReadStream(path, "utf-8");

    readStream.on("readable", () => {
      let chunk;
      while ((chunk = readStream.read()) !== null) {
        emit.chunk(CK.single(chunk));
      }
    });

    readStream.on("error", (error) => {
      emit.fail(error);
    });

    readStream.on("end", () => {
      emit.end();
    });
  });
}

export function parseInteger(str: string) {
  return O.fromPredicate_(Number(str), (result) => !Number.isNaN(result));
}

export function bitArrayToNumber(arr: AR.Array<number>) {
  return AR.reduceWithIndex_(
    arr,
    0,
    (index, acc, bit) => acc | (bit << (arr.length - index - 1))
  );
}

export function stringToBitArray(str: string) {
  return AR.map_(AR.from(str), (bit) => (bit === "0" ? 0 : 1));
}

export function bitAt(offset: number, n: number) {
  return (n >>> offset) & 1;
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

export function printLine(...args: any[]) {
  return T.succeedWith(() => {
    console.log(...args);
  });
}

export function printResults<
  Effects extends readonly T.Effect<any, any, any>[]
>(day: number, ...parts: Effects) {
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

export function range(a: number, b: number) {
  if (a < b) {
    return CK.map_(CK.range(0, b - a), (x) => a + x);
  }

  return CK.map_(CK.range(0, a - b), (x) => a - x);
}
