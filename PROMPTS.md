# Prompts

This project was built with **Claude Code**, Anthropic's coding agent. Below are the prompts I gave it, word for word.

## 1. Starting the project

> HELLO I WANT TO A PROJECT:

## 2. The assignment

Along with this prompt I pasted the full assignment brief (objective, requirements, constraints and deliverables) and attached a screenshot of a soft, lavender calculator design as visual inspiration.

> please do this and this is really important for me i want to do a really good thing . i also want to attach some calculator ideas not for the content just for a design option for you as frontend. do every detail. please write the code clearly do not have unnecessary files. please have clear structure.

## 3. Running it and finding the coverage report

> how to run it

> Unit tests and coverage report where?

## 4. Checking the percent key

> is % correctly. check it then fix it

> is int that modulo?

The agent found that `%` always divided by 100, so `50 + 10 % =` gave 50.1 instead of 55. It explained the difference between percent and modulo, and recommended keeping percent, since the brief asks for "Percentage".

## 5. Extra features

> what can we add as a creative and additional idea what do you think

The agent suggested Split in 4 (an installment plan, relevant to a buy-now-pay-later company), a calculation history, copy-to-clipboard and an OpenAPI spec. I replied, attaching a screenshot of a history-panel design as inspiration:

> yes i want all of them please desgin the history part realy good

## How the work went

1. **Architecture.** A Go service on the standard library only, with domain logic kept separate from HTTP, and a React frontend with a pure reducer, hooks for side effects and presentational components.
2. **Tests first.** Each layer was built with its tests. Pure functions got table-driven unit tests, and the UI got integration tests against a fake backend.
3. **Real-browser checks.** The app was checked against the running backend in light and dark themes, at phone sizes, and with keyboard input and error states.
4. **Fixes the checks caught:**
   - Rounding the display to 12 significant digits hid precision in large integers, so it was raised to 15.
   - The percent key ignored context.
   - The YAML spec had a comma that split a description in two.
   - On a 320×640 phone the card was taller than the screen, so the Split in 4 sheet opened partly off-screen. A compact layout for short screens fixed it.
5. **Packaging.** The agent built and ran the Docker image and wrote the README.
