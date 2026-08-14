MAMI, NUDÍM SA! — RESET 1

Toto je zámerne zjednodušený nový základ aplikácie.

JADRO PRODUKTU
1. rodič nastaví iba vek 2–8 rokov,
2. vyberie jednu zo 4 situácií,
3. Nudi ponúkne jednu konkrétnu hru,
4. „Spustiť hru“ vedie rodiča po jednom kroku,
5. „Inú hru“ používa balíček bez okamžitého opakovania.

OBSAH
35 ručne kurátorovaných hier = presne 5 pre každý vek.
Počet je zámerne nízky. Najprv musí byť bezchybný core flow a kvalita hier; až potom má zmysel rozširovať databázu.

ČO JE ZÁMERNE PREČ
- profily detí,
- achievementy,
- história,
- pokročilé filtre,
- zásoby domácnosti,
- spodná navigácia,
- komplikované dashboardy.

GITHUB
Nahraj všetky súbory z ZIP-u PRIAMO do rootu repozitára. index.html musí byť priamo v root.

DÔLEŽITÉ PRI PRECHODE ZO STAREJ VERZIE
RESET 1 zámerne neregistruje nový service worker, aby ti iPhone pri testovaní neukazoval starý JavaScript.
Appka sa pri spustení pokúsi odregistrovať staré service workery a vymazať staré Nudi/MNS cache.

Ak sa ti aj tak zobrazuje stará verzia, po nahratí súborov otvor jednorazovo:
https://TVOJ-GITHUB-PAGES-LINK/fresh-start.html
Táto stránka vyčistí starý service worker/cache a presmeruje ťa do RESET 1.

VERZIA: RESET 1
