# Prompts

This project was built with **Claude Code**, Anthropic's coding agent. Below are the prompts I gave it, word for word.

## Prompt 1

> HELLO I WANT TO A PROJECT:

## Prompt 2

Along with this prompt I pasted the full assignment brief (objective, requirements, constraints and deliverables) and attached a screenshot of a soft, lavender calculator design as visual inspiration.

> please do this and this is really important for me i want to do a really good thing . i also want to attach some calculator ideas not for the content just for a design option for you as frontend. do every detail. please write the code clearly do not have unnecessary files. please have clear structure.

## How the work went

From that prompt, the agent:

1. Designed the architecture: a Go service on the standard library only, with domain logic kept separate from HTTP, and a React frontend with a pure reducer, hooks for side effects and presentational components.
2. Wrote the backend and its table-driven tests first, then the frontend and its unit and integration tests.
3. Checked the result in a real browser against the running backend: light and dark themes, phone widths, keyboard input and error states.
4. Fixed problems the tests and checks caught. For example, rounding the display to 12 significant digits hid precision in large integers, so it was raised to 15. The server entry point was also refactored so startup and shutdown could be tested.
5. Built and ran the Docker image, and wrote the README.
