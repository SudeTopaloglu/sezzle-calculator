# Prompts

The brief allowed any AI tooling, so I built this project with **Claude Code**, Anthropic's coding agent, as a pair programmer. The agent wrote most of the code, tests and docs. I owned the direction: I added my own requirements to the brief, chose the design references, made the product calls, challenged the agent's output, and decided when the work was ready to ship.

## How I worked

1. **Spec first.** I gave the agent the full brief plus my own constraints: a clear structure, no unnecessary files, and a visual reference I chose.
2. **Iterate.** After the first version: check, then refine.
3. **Verify, don't trust.** When a result looked off, such as the % key or the installment logic, I had it checked against real behavior instead of accepting it.
4. **Review before shipping.** Before submitting, I had every requirement rechecked three times on a clean copy of the project, the way a reviewer would see it.

## Key decisions

- **Pay in 4.** From the extras the agent proposed, I kept the installment plan and pushed it to match the real product. I challenged the first version ("isn't this just dividing by 4?") and had its name, 2-week schedule and interest-free claim checked against how Pay in 4 actually works. That led to the rename to Pay in 4 and the "estimate only" label. I also made sure the README explains why it's there: it ties the calculator to Sezzle's core product.
- **Operator precedence.** The agent advised skipping it as too risky this late in the project. I brought it back up, and we agreed it was about correctness, not an extra feature: `2 + 3 × 4` has to be 14.
- **Percent.** I suspected the % key was wrong and had it checked. I also raised the percent-vs-modulo question; the answer is percent, as on phone calculators and as the brief asks.
- **Design.** I gave the agent two visual references: a lavender calculator and a history panel.
- **Review.** The final reviews caught missing JSON errors, an outdated Go version in the Docker image and a wrong error code, and all were fixed before submission.

## Prompts, summarized

Paraphrased in English. Each prompt, edited for clarity, is in the prompt log at the end.

| # | What I asked | Result |
| --- | --- | --- |
| 1 | Implement the brief, with a clear structure, no unnecessary files, and a lavender calculator design I chose as the visual reference | First version: the React + Go app, with tests, Dockerfile, CI and README |
| 2 | Check whether the % key is correct, and whether % means percent or modulo | % works like a phone calculator: `50 + 10 % =` gives 55 |
| 3 | Propose creative extras; I approved them and asked for a carefully designed history panel | History panel, installment plan, copy result, OpenAPI spec |
| 4 | Challenge the installment plan: isn't it just dividing by 4? | An explanation of the logic |
| 5 | Revisit operator precedence after the agent advised skipping it | `2 + 3 × 4 = 14` and `2 ^ 3 ^ 2 = 512` |
| 6 | Verify the plan against how Pay in 4 really works: name, schedule, interest | Renamed Pay in 4, payments every 2 weeks, labeled as an estimate |
| 7 | Prepare for submission: update every file, shorten the README, delete unneeded files | Shorter README; Makefile and unused code removed |
| 8 | Check everything against the brief, then add a coverage report | [COVERAGE.md](COVERAGE.md) |
| 9 | Recheck everything against the brief and fix what the check finds | JSON 404 and 405 errors for the API |
| 10 | Document why Pay in 4 is there, and fill the gaps in the tests | The "Why Pay in 4?" note; a test for graceful shutdown on SIGTERM |
| 11 | Review the project as a Sezzle engineer would, then fix everything | Go 1.27 Docker image with no known vulnerabilities, `0 ^ −1` as division by zero, CI updates |

Along the way I also asked questions, such as how to run the app and what each report is for.

## How I checked the work

Every change was verified with the test suites, linters and static analysis, and by driving the real app in a browser against the running backend. That covered light and dark themes, phone sizes, keyboard input and error states. The Docker image was rebuilt and tested after each round, and its binary was scanned with `govulncheck`.

<details>
<summary><b>Prompt log</b></summary>

The prompts that shaped the project, in order. They are edited for clarity and translated into English where I wrote them in Turkish; the meaning is unchanged. I've left out questions that didn't change the project, such as how to run the app, and a change I later undid.

### 1. Building the project

> *(With the assignment brief and a design reference attached)* Please implement this. It's important to me, so get every detail right. The calculator designs I'm attaching are a visual reference for the frontend, for the look only, not the content. Write clean code with a clear structure and no unnecessary files.

### 2. Percent key

> Is % working correctly? Check it, then fix it.

> Isn't that modulo?

### 3. Extra features

> What could we add as a creative extra? What do you think?

In its answer, the agent advised skipping operator precedence as a risky change this late in the project.

> *(With a history-panel design reference attached)* Yes, build all of them, and design the history panel really well.

> If it's called Split in 4, isn't it just dividing by 4?

### 4. Correctness and finishing

> We could add operator precedence. What do you think, or is it unnecessary?

> Are you sure about the Split in 4 logic? Is that the right name, are the term and the payment timing right, and is it interest-free?

> OK, go ahead. Then update every file to match, and get the tests and everything ready for submission. Shorten the README to the essential explanations and how to run it, in a clean format. Delete all unnecessary files.

> *(With the brief)* Check everything.

> Prepare a coverage report too, in a clean and thorough format.

### 5. Final review

> *(With the brief)* Please check everything: does the project satisfy every requirement?

> Fix all of them.

> Do we explain anywhere that Pay in 4 was built for Sezzle, and why?

> Yes, let's add it.

> *(After the agent advised against writing the reports by hand)* OK. Are the tests as they should be?

> Yes, fill in the gaps.

### 6. Delivery review

> *(With the brief)* Is it ready for delivery? Check every detail, and evaluate it the way a Sezzle engineer would, by their principles and work ethic. You can also look at accepted projects, for example on Reddit. Make sure everything is checked.

> Fix everything.

</details>
