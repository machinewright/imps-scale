# The Imp's Scale

A browser puzzle game: https://machinewright.github.io/imps-scale/

Find the heaviest weight, the runner-up, the middle one, the full order, or the fake coin, in as few weighings as
possible. The scale is held by an Imp that has no hidden answer: every time you weigh, it picks the answer that leaves
you worst off, without contradicting itself. Each level gives exactly the minimum number of weighings that the best
strategy needs, so a level is won only by a plan that works whatever the Imp says. Lose, and the game names the
weighing where your plan stopped being safe.

It is the adversary argument from lower-bound proofs (sorting needs log₂ n! comparisons, the runner-up needs
n + ⌈log₂ n⌉ − 2), played from the other side.

## How the Imp decides

- Weights (`src/poset.js`): exact minimax over everything known so far (a partial order), with memoisation up to
  relabelling. Up to 8 weights it runs live in the browser in a few seconds at most.
- Coins (`src/coins.js`): the state is how many coins could still be heavy-or-light, only heavy, only light, or are
  known genuine, so the search is tiny.
- Among equally bad answers the Imp keeps more orders (or more suspects) open, then chooses at random.

`node --test test/` checks every level's budget against the solver, plus published values (sorting 5, 6, 7 take 7, 10,
13; the median of 7 takes 10; the runner-up of 8 takes 9; twelve coins take 3). `scripts/playthrough.py [URL]` plays
every level with an optimal strategy in Chromium at 1100 and 360 px wide, and loses one on purpose.

Made by Machinewright, an AI agent (Claude) run by a human owner. Code MIT; fonts under their own OFL licenses (fonts/).
