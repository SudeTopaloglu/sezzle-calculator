# Prompts

This project was built with **Claude Code**, Anthropic's coding agent. These are the prompts I gave it, word for word. Some are in Turkish, my native language; each of those is followed by an English translation in italics.

## 1. Building the project

> HELLO I WANT TO A PROJECT:

With the next prompt I pasted the full assignment brief and attached a screenshot of a soft, lavender calculator design as visual inspiration.

> please do this and this is really important for me i want to do a really good thing . i also want to attach some calculator ideas not for the content just for a design option for you as frontend. do every detail. please write the code clearly do not have unnecessary files. please have clear structure.

> how to run it

> Unit tests and coverage report where?

## 2. Fixing the percent key

> is % correctly. check it then fix it

> is int that modulo?

`%` always divided by 100, so `50 + 10 % =` gave 50.1 instead of 55. It now behaves like a phone calculator. Percent (not modulo) is what the brief asks for.

## 3. Extra features

> what can we add as a creative and additional idea what do you think

In a second session I pasted the agent's suggestions and asked:

> ne diyor\
> *(What is it saying?)*

With the next prompt I attached a screenshot of a history-panel design as inspiration.

> yes i want all of them please desgin the history part realy good

This added the history panel, an installment plan (later named Pay in 4), copy result and an OpenAPI spec.

> how to run ne code

> split in 4 ne yyapıyor sence anlamadım\
> *(What do you think Split in 4 does? I didn't get it.)*

> e pslit in 4 diyince zaten bölü 4 değil mi\
> *(Well, if it's called Split in 4, isn't it just dividing by 4?)*

## 4. Correctness and finishing

> is it enough or should we add some details to impress them

> we can add precedence what do you think or is it unnceseaary

> split in 4 daki mantıktan emin misin yani kesin split in 4 mu ve vadesi bu mu ve zamanlamalar doğru mu ve faizsiz mi\
> *(Are you sure about the logic in Split in 4? Is it really a split in 4, is that the term, are the timings right, and is it interest-free?)*

The agent checked how Pay in 4 works in published reviews (25% today, then every 2 weeks over 6 weeks, interest-free). The feature was renamed **Pay in 4** and labeled as an estimate.

> olur tamam. bir de her dosyayı buna uyarla testleri vs teslime hazır hale getir. readme yi kısalt sadece gerkeli açıklamaları ve çalıştırma kısmını yaz. güzel bir formatta. tüm gereksiz dosyaları sil.\
> *(Sure, okay. Also update every file to match, and get the tests and everything ready for submission. Shorten the README: only the necessary explanations and how to run it, in a nice format. Delete all unnecessary files.)*

This added operator precedence (`2 + 3 × 4 = 14`), updated the tests, shortened the README and removed unneeded files.

> nasıl repo göndercem\
> *(How do I submit the repo?)*

Along with the next prompt I pasted the assignment brief again.

> check everything

The agent checked every requirement against the published repository. It cloned the repo fresh, ran the README commands, and tested with the minimum Go and Node versions. The one gap it found was a detailed coverage report.

> e kapsam raporu da hazırla tatım güzel yeterli bir biçimde\
> *(Then prepare the coverage report too, in a nice and thorough enough format.)*

This added [COVERAGE.md](COVERAGE.md), with per-file numbers and the reason for every uncovered line.

## 5. Final review

Along with the next prompt I pasted the assignment brief again.

> can you please chech everything is everything satisfied the requirements

The agent cloned the published repository, ran both test suites and the Docker image, and called every API example and edge case. All requirements were met. It found one small gap: in the Docker setup, a wrong-method request such as `GET /api/v1/add` got a plain-text 404 from the frontend's file server instead of a JSON error.

> can you fix all of them

Every request under `/api/` now gets a JSON error: 405 `METHOD_NOT_ALLOWED` for a wrong method and 404 `NOT_FOUND` for an unknown path. This is tested with and without the frontend served.

> i want to deleete it actually also screenshot png is also unncessary

> please redo de screenshot.png

This removed this file and the screenshot. The screenshot came back right away; this file came back after the delivery review below pointed out that the brief asks for the prompts.

In a second session I asked what the two reports were for. I stopped that session before it changed anything.

> prompts.md ne işe yarıyor\
> *(What is PROMPTS.md for?)*

> coverage.md en işe yarıyor\
> *(What is COVERAGE.md for?)*

> yap tamam\
> *(OK, do it.)*

Back in the first session:

> covergae.md ne ile alakalı\
> *(What is COVERAGE.md about?)*

> pay in 4 un sezzzle içn yaptığımıızn detayı var mı sebebi hani bri yere yazdık mı\
> *(Do we explain anywhere that we built Pay in 4 for Sezzle, and why? Did we write it down somewhere?)*

> evet ekleyelim\
> *(Yes, let's add it.)*

This added the "Why Pay in 4?" note to the README.

> peki şu an sence her şey iyi bir formatta mı adamlar beğenip onaylar mı\
> *(So do you think everything is in good shape now? Will they like it and approve it?)*

> readme formatı renkli mi olsa biraz bana has olsun hani bu raporlar coverage da readme de acaba kendim mi yapsam yoksa gerek yok mu\
> *(Should the README be more colorful, a bit more my own? And these reports, COVERAGE and the README: should I write them myself, or is there no need?)*

The agent advised against writing the reports by hand: the numbers come straight from the test tools, and copying them by hand only adds mistakes.

> okey yok peki tesler olması gerektiği gibi mi\
> *(Okay, no then. So are the tests as they should be?)*

> eksikleri tamamla evet\
> *(Yes, fill in what's missing.)*

This added a test that runs the real `main()` and stops it with SIGTERM, as `docker stop` does. `cmd/server` coverage went from 63% to 84%.

## 6. Delivery review

Along with the next prompt I pasted the assignment brief again.

> is it ready for delivery. check everythign, every detail. please evaluate like an engineer in sezzle. evaluate it according to their principles and work ethic. you can also search from reddit like the accepted projects. please be sure taht everything is checked.

The agent reran every check on a fresh clone, sent 37 requests to the API in the Docker container, drove the app in a real browser at phone sizes from 320 to 390 px, and compared the project with two other public submissions for this assignment. It found three problems:

- This file had been deleted, but the brief asks for the prompts.
- The Docker image was built with Go 1.24, which no longer receives security fixes. `govulncheck` found 29 known standard library vulnerabilities in the binary.
- `0 ^ −1` was reported as an overflow ("result is too large") instead of a division by zero.

> okey please fix everything

This restored this file with English translations, moved the Docker build to Go 1.27 (no known vulnerabilities), made `0 ^ −1` a division by zero, corrected the backend test count, and added a short trade-offs section to the README.

## How I checked the work

Every change was verified with the test suites, linters and static analysis, and by driving the real app in a browser against the running backend. That covered light and dark themes, phone sizes, keyboard input and error states. The Docker image was rebuilt and tested after each round, and its binary was scanned with `govulncheck`.
