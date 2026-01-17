# Příloha – struktura souborů a složek
**Název práce:** Rozšíření pro testovací rámec ExTester do editoru Visual Studio Code  
**Autor:** Filip Pospíšil

Tato diplomová práce se zaměřuje na využití generativní umělé inteligence pro automatizaci testování uživatelského rozhraní rozšíření v editoru Visual Studio Code. Cílem práce bylo navrhnout a implementovat prototyp nástroje ve formě Visual Studio Code rozšíření, který kombinuje existující testovací rámec ExTester s generativními jazykovými modely a dokáže automaticky generovat testy uživatelského rozhraní pro dané rozšíření. Navržené řešení zahrnuje uživatelské rozhraní v postranním panelu Visual Studio Code, načtení manifestu testovaného rozšíření pro získání kontextu a integraci cloudové AI služby pro generování testovacích scénářů a zdrojového kódu testů. Framework ExTester poté slouží ke spuštění vygenerovaných testů a analýze jejich výsledků. Nástroj rovněž dokáže automaticky navrhnout opravy při selhání testů. Vyvinutý plugin rozšiřuje možnosti frameworku ExTester a naznačuje směr budoucího vývoje nástrojů pro testování softwaru.

Příloha slouží jako přehled toho, jak jsou zdrojové soubory a experimentální výsledky organizovány do složek, které jsou dále zmiňovány v textu práce.

## Přehled hlavních složek

- `code/` – zdrojový kód implementace nástroje **ExTester Test Generator** (VS Code extension). Jde o hlavní výsledek praktické části práce: zásuvný modul, který umí z manifestu rozšíření navrhnout sadu UI testů, vygenerovat je jako TypeScript testy pro framework ExTester, spustit je a pokoušet se opravovat nalezené chyby (kompilační i běhové). Složka obsahuje projekt, build skripty, konfiguraci a podrobnější dokumentaci v `code/README.md`.
- `vsix/` – hotová distribuovaná verze zásuvného modulu ve formátu `.vsix`. Soubor `extester-test-generator-0.1.0.vsix` odpovídá verzi popisované v textu práce a lze jej přímo nainstalovat do Visual Studio Code (příkaz „Install from VSIX…“) pro ruční vyzkoušení pluginu bez nutnosti kompilace zdrojových kódů.
- `results/` – výstupy experimentální části práce. Obsahuje jednotlivé kroky workflow, které je v textu práce rozebráno: od původně vygenerovaných testů přes automatické opravy až po ruční úpravy provedené programátorem. Na tyto složky se odkazuje v kapitole s vyhodnocením výsledků.

## Struktura složky `results`

Každá podsložka v `results` obsahuje stejnou strukturu adresářů (`settings/`, `activation/`, `menus/`, `dialogs/`, `commands/`, `views/`). Tyto adresáře odpovídají logickým oblastem manifestu testovaného rozšíření. V každé podsložce jsou uloženy UI testy pro danou oblast v konkrétním stavu experimentu:

- `0-all-generated-test-cases/` – všechny testovací scénáře, které plugin automaticky vygeneroval na základě manifestu rozšíření. Jde o „hrubý výstup“ generativního modelu bez následných oprav.
- `1-selected-generated-tests/` – šest vybraných testů, které jsou dále detailněji rozebrány v textu diplomové práce. Tato složka slouží jako zmenšený, ale reprezentativní vzorek pro ruční hodnocení.
- `2-fix-compilation-issues/` – verze testů po automatických pokusech o opravu kompilačních chyb.
- `3-fix-runtime-issues/` – verze testů po automatických pokusech o opravu běhových chyb zjištěných při spuštění testů.
- `4-manual-issues-fix/` – finální ručně upravená verze testů po zásahu vývojáře. Tato složka reprezentuje stav, který je v práci interpretován jako „maximální dosažitelná kvalita“ v rámci experimentu – po kombinaci automatických oprav a cílené manuální editace testovacích scénářů.
