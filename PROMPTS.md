# Prompts

The brief allowed any AI tooling, so I built this project with **Claude Code**, Anthropic's coding agent. It wrote most of the code, tests and docs. My part was direction, product decisions and review.

## Key decisions

- **Operator precedence.** The agent advised skipping it as too risky late in the project. I decided `2 + 3 × 4` had to be 14 and asked for it.
- **Pay in 4.** I questioned whether "Split in 4" was just dividing by 4, and whether its name, schedule and interest-free claim matched how Pay in 4 really works. That confirmed the 2-week schedule and led to the rename to Pay in 4 and the "estimate only" label. I also had the README explain why it's there: it ties the calculator to Sezzle's core product.
- **Percent.** I suspected the % key was wrong, had it checked, and asked whether it should mean percent or modulo.
- **Design.** I gave the agent two visual references: a lavender calculator and a history panel.
- **Review.** Before submitting I had every requirement rechecked on a clean copy of the project. That caught missing JSON errors, an outdated Go version in the Docker image and a wrong error code.

## Prompts, summarized

Paraphrased in English. The exact wording, including the prompts I wrote in Turkish, is in the prompt log at the end.

| # | What I asked | Result |
| --- | --- | --- |
| 1 | Implement the assignment brief. My requirements: a clear structure, no unnecessary files, and a lavender calculator design I chose as the visual reference | First version: the React + Go app, with tests, Dockerfile, CI and README |
| 2 | Check whether the % key is correct, and whether % means percent or modulo | % works like a phone calculator: `50 + 10 % =` gives 55 |
| 3 | Suggest creative extras, then build all of them, with a well-designed history panel | History panel, Split in 4, copy result, OpenAPI spec |
| 4 | Explain Split in 4: isn't it just dividing by 4? | An explanation |
| 5 | Add operator precedence | `2 + 3 × 4 = 14` and `2 ^ 3 ^ 2 = 512` |
| 6 | Verify the Split in 4 logic: the name, the schedule, and whether it is interest-free | Renamed Pay in 4, payments every 2 weeks, labeled as an estimate |
| 7 | Prepare for submission: update every file, shorten the README, delete unneeded files | Shorter README; Makefile and unused code removed |
| 8 | Check everything against the brief, then add a coverage report | [COVERAGE.md](COVERAGE.md) |
| 9 | Recheck everything against the brief and fix what the check finds | JSON 404 and 405 errors for the API |
| 10 | Explain why Pay in 4 is there, and fill the gaps in the tests | The "Why Pay in 4?" note; a test for graceful shutdown on SIGTERM |
| 11 | Review the project as a Sezzle engineer would, then fix everything | Go 1.27 Docker image with no known vulnerabilities, `0 ^ −1` as division by zero, CI updates |

Along the way I also asked questions, such as how to run the app and what each report is for.

## How I checked the work

Every change was verified with the test suites, linters and static analysis, and by driving the real app in a browser against the running backend. That covered light and dark themes, phone sizes, keyboard input and error states. The Docker image was rebuilt and tested after each round, and its binary was scanned with `govulncheck`.

<details>
<summary><b>Prompt log, word for word</b></summary>

These are the prompts that shaped the project. I've left out questions that didn't change it (such as how to run the app or what a report is for), a change I undid (removing this file and the screenshot), and requests about the layout of this file. Some prompts are in Turkish, my native language; each of those is followed by an English translation in italics.

### 1. Building the project

Along with this prompt I pasted the full assignment brief and attached a screenshot of a soft, lavender calculator design as visual inspiration.

> please do this and this is really important for me i want to do a really good thing . i also want to attach some calculator ideas not for the content just for a design option for you as frontend. do every detail. please write the code clearly do not have unnecessary files. please have clear structure.

### 2. Fixing the percent key

> is % correctly. check it then fix it

> is int that modulo?

`%` always divided by 100, so `50 + 10 % =` gave 50.1 instead of 55. It now behaves like a phone calculator. Percent (not modulo) is what the brief asks for.

### 3. Extra features

> what can we add as a creative and additional idea what do you think

In its answer, the agent advised skipping operator precedence as a risky change this late in the project.

With the next prompt I attached a screenshot of a history-panel design as inspiration.

> yes i want all of them please desgin the history part realy good

This added the history panel, an installment plan (later named Pay in 4), copy result and an OpenAPI spec.

> e pslit in 4 diyince zaten bölü 4 değil mi\
> *(Well, if it's called Split in 4, isn't it just dividing by 4?)*

### 4. Correctness and finishing

> we can add precedence what do you think or is it unnceseaary

> split in 4 daki mantıktan emin misin yani kesin split in 4 mu ve vadesi bu mu ve zamanlamalar doğru mu ve faizsiz mi\
> *(Are you sure about the logic in Split in 4? Is it really a split in 4, is that the term, are the timings right, and is it interest-free?)*

The agent checked how Pay in 4 works in published reviews (25% today, then every 2 weeks over 6 weeks, interest-free). The feature was renamed **Pay in 4** and labeled as an estimate.

> olur tamam. bir de her dosyayı buna uyarla testleri vs teslime hazır hale getir. readme yi kısalt sadece gerkeli açıklamaları ve çalıştırma kısmını yaz. güzel bir formatta. tüm gereksiz dosyaları sil.\
> *(Sure, okay. Also update every file to match, and get the tests and everything ready for submission. Shorten the README: only the necessary explanations and how to run it, in a nice format. Delete all unnecessary files.)*

This added operator precedence (`2 + 3 × 4 = 14`), updated the tests, shortened the README and removed unneeded files.

Along with the next prompt I pasted the assignment brief again.

> check everything

The agent checked every requirement on a clean copy of the project, ran the README commands, and tested with the minimum Go and Node versions. The one gap it found was a detailed coverage report.

> e kapsam raporu da hazırla tatım güzel yeterli bir biçimde\
> *(Then prepare the coverage report too, in a nice and thorough enough format.)*

This added [COVERAGE.md](COVERAGE.md), with per-file numbers and the reason for every uncovered line.

### 5. Final review

Along with the next prompt I pasted the assignment brief again.

> can you please chech everything is everything satisfied the requirements

On a clean copy of the project, the agent ran both test suites and the Docker image, and called every API example and edge case. All requirements were met. It found one small gap: in the Docker setup, a wrong-method request such as `GET /api/v1/add` got a plain-text 404 from the frontend's file server instead of a JSON error.

> can you fix all of them

Every request under `/api/` now gets a JSON error: 405 `METHOD_NOT_ALLOWED` for a wrong method and 404 `NOT_FOUND` for an unknown path. This is tested with and without the frontend served.

> pay in 4 un sezzzle içn yaptığımıızn detayı var mı sebebi hani bri yere yazdık mı\
> *(Do we explain anywhere that we built Pay in 4 for Sezzle, and why? Did we write it down somewhere?)*

> evet ekleyelim\
> *(Yes, let's add it.)*

This added the "Why Pay in 4?" note to the README.

After the agent advised against writing the reports by hand, I replied:

> okey yok peki tesler olması gerektiği gibi mi\
> *(Okay, no then. So are the tests as they should be?)*

> eksikleri tamamla evet\
> *(Yes, fill in what's missing.)*

This added a test that runs the real `main()` and stops it with SIGTERM, as `docker stop` does. `cmd/server` coverage went from 63% to 84%.

### 6. Delivery review

Along with the next prompt I pasted the assignment brief again.

> is it ready for delivery. check everythign, every detail. please evaluate like an engineer in sezzle. evaluate it according to their principles and work ethic. you can also search from reddit like the accepted projects. please be sure taht everything is checked.

The agent reran every check on a clean copy of the project, sent 37 requests to the API in the Docker container, drove the app in a real browser at phone sizes from 320 to 390 px, and compared the project with two other public submissions for this assignment. It found three problems:

- This file had been deleted, but the brief asks for the prompts.
- The Docker image was built with Go 1.24, which no longer receives security fixes. `govulncheck` found 29 known standard library vulnerabilities in the binary.
- `0 ^ −1` was reported as an overflow ("result is too large") instead of a division by zero.

> okey please fix everything

This brought back this file with English translations, moved the Docker build to Go 1.27 (no known vulnerabilities), made `0 ^ −1` a division by zero, corrected the backend test count, and added a short trade-offs section to the README. The agent also moved the CI workflow to the Node 24 versions of its actions.

</details>
