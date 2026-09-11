export type MathChallenge = {
  prompt: string;
  answer: number;
};

const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

export const makeMathChallenge = (): MathChallenge => {
  const kind = randomInt(0, 2);
  if (kind === 0) {
    const left = randomInt(10, 99);
    const right = randomInt(10, 99);
    return { prompt: `${left} + ${right}`, answer: left + right };
  }
  if (kind === 1) {
    const left = randomInt(10, 99);
    const right = randomInt(10, left);
    return { prompt: `${left} − ${right}`, answer: left - right };
  }
  const left = randomInt(1, 9);
  const right = randomInt(1, 9);
  return { prompt: `${left} × ${right}`, answer: left * right };
};
