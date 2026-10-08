# Prompts

This project was built with **Claude Code**, Anthropic's coding agent. These are the prompts I gave it, word for word. Some are in Turkish, my native language.

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

With the next prompt I attached a screenshot of a history-panel design as inspiration.

> yes i want all of them please desgin the history part realy good

This added the history panel, an installment plan (later named Pay in 4), copy result and an OpenAPI spec.

> how to run ne code

> split in 4 ne yyapıyor sence anlamadım

> e pslit in 4 diyince zaten bölü 4 değil mi

## 4. Correctness and finishing

> is it enough or should we add some details to impress them

> we can add precedence what do you think or is it unnceseaary

> split in 4 daki mantıktan emin misin yani kesin split in 4 mu ve vadesi bu mu ve zamanlamalar doğru mu ve faizsiz mi

The agent checked how Pay in 4 works in published reviews (25% today, then every 2 weeks over 6 weeks, interest-free). The feature was renamed **Pay in 4** and labeled as an estimate.

> olur tamam. bir de her dosyayı buna uyarla testleri vs teslime hazır hale getir. readme yi kısalt sadece gerkeli açıklamaları ve çalıştırma kısmını yaz. güzel bir formatta. tüm gereksiz dosyaları sil.

This added operator precedence (`2 + 3 × 4 = 14`), updated the tests, shortened the README and removed unneeded files.

> nasıl repo göndercem

Along with the next prompt I pasted the assignment brief again.

> check everything

The agent checked every requirement against the published repository. It cloned the repo fresh, ran the README commands, and tested with the minimum Go and Node versions. The one gap it found was a detailed coverage report.

> e kapsam raporu da hazırla tatım güzel yeterli bir biçimde

This added [COVERAGE.md](COVERAGE.md), with per-file numbers and the reason for every uncovered line.

## How I checked the work

Every change was verified with the test suites, linters and static analysis, and by driving the real app in a browser against the running backend. That covered light and dark themes, phone sizes, keyboard input and error states. The Docker image was rebuilt and tested after each round.
