# Glossário Keepmile (R55) - 11 idiomas

Fonte: `public/reino/js/textos.js`, `shared/reino/config.js`, `shared/reino/conquistas.js`. `(?)` = sem segurança, sem revisão nativa. Formas de tela em MAIÚSCULAS.
Colunas: `en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite`

## 1. Regras gerais

**Tratamento (informal, sem pronome formal):** pt-BR você · es tú (neutro latino, sem vos/vosotros) · fr tu · de du · it tu · ru ты · tr sen · id kamu · vi bạn · fil ikaw/mo (sem "po") · th sem pronome (omitir o sujeito; se preciso "คุณ" (?)).

**Tom:** leve, curto, bem-humorado; sem gíria regional. Sem promessa de lucro, investimento ou prêmio: o beta só dá títulos e enfeites (medalha). GOLD é só a moeda do jogo; nunca falar de dinheiro real.

**Caixa alta:** tr usa İ/I corretos (KİLİT); vi mantém todos os acentos; th não tem maiúsculas.

**Pontuação:** es abre com ¿ e ¡ · fr espaço (inseparável) antes de `! ? : ;`, aspas « » · de/it/tr/id/vi/fil sem espaço antes de sinais · ru aspas «» · th sem ponto final · manter separadores do original (` - `, ` > `, `/`) e "...".

**Números:** algarismos arábicos em todos (inclusive th). Porcentagem: `25%` em pt, es, it, ru, id, vi, fil, th; `25 %` (espaço inseparável) em fr e de; tr `%25` (?). Multiplicador `x3`.

**Nomes próprios: FICAM EM INGLÊS, sem traduzir nem declinar:**
1. Jogo: Keepmile.
2. Cartas (30): Pikeman, Doorman, Sir Dent, Hedge Archer, Granny Bolt, Falconer, Frypan Cook, Soup Carrier, Pie Thrower, Fuse Runner, Clockwork Geese, Sparkwright, Smithy, Bunkhouse, Stone Wall, Watchtower, Fletcher's Hut, Cookhouse, Market Stall, Feast Hall, Tinker's Shed, Fuse Depot, Boom Barrel, Tar Puddle, Angry Bees, Rally Horn, Second Helping, Bramble Snare, Seconds!, Grand Finale.
3. Invasores: Scoffer, Stilt Runner, Spud Slinger, Potlid Brute, Bloater, Mole Digger, Drum Bully, Quack.
4. Chefes: Gutbucket the Wide, Tick & Tock, Madame Moleworth, King Gobble the Uninvited (o código usa a 1ª palavra ou o trecho antes de " the ": só funciona com o nome em inglês).
5. Famílias: Pikewall, Thornbow, Potluck, Fizzwick.
6. Relíquias: Lucky Horseshoe, Last Candle, Spare Crown, Gate Bell, Long Fuse, Tax Ledger, Twin Banner, Blueprints.
7. Espólio: Purse.
8. Conquistas (30 títulos, de "Not on My Road" a "Head Librarian"): título em inglês; só a linha de condição se traduz.
9. Ligas: Gate Sweeper, Road Warden, Keep Captain, Lord Steward, Crown Guardian, Legend of the Mile.

Traduz-se tudo o mais: raridades, tipos, modos, menus, erros, descrições (`texto`) de cartas/relíquias/chefes (com os nomes dentro em inglês). Nome inglês em frase traduzida: não flexionar; em ru usar o nome em latim sem declinar; em tr usar apóstrofo para sufixo (Gutbucket'ı).

**Limites:** legenda de atributo até 6 · botão até 10 · título até 18 · demais = inglês + 40%. Estourou: usar a forma curta da tabela; nunca reticências nem fonte menor. Ru, th e vi pedem fonte com cobertura no canvas.

## 2. Termos fixos

### 2.1 Partida

| en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ROUND | RODADA | RONDA | MANCHE | RUNDE | TURNO (?) | РАУНД | TUR | RONDE | VÒNG | RAUND (?) | รอบ | 8 |
| FIGHT | LUTAR | LUCHAR | COMBAT | KAMPF | LOTTA | В БОЙ | DÖVÜŞ | LAWAN | CHIẾN | LABAN | สู้ | 10 |
| VICTORY | VITÓRIA | VICTORIA | VICTOIRE | SIEG | VITTORIA | ПОБЕДА | ZAFER | MENANG | THẮNG | PANALO | ชนะ | 10 |
| DEFEAT | DERROTA | DERROTA | DÉFAITE | NIEDERLAGE | SCONFITTA | ПОРАЖЕНИЕ | YENİLGİ | KALAH | THUA | TALO | แพ้ | 10 |
| BOSS | CHEFE | JEFE | BOSS | BOSS | BOSS | БОСС | PATRON (?) | BOS | BOSS (?) | BOSS | บอส | 6 |
| NIGHTFALL | ANOITECER | ANOCHECER | NUIT | NACHT | NOTTE | НОЧЬ | GECE | MALAM | ĐÊM | GABI | กลางคืน | 12 |
| LAST ONE STANDING | ÚLTIMO DE PÉ | ÚLTIMO EN PIE | DERNIER DEBOUT | LETZTER MANN | L'ULTIMO RESISTE | ПОСЛЕДНИЙ | SON AYAKTA | TERAKHIR | CUỐI CÙNG | HULI SA TAYO (?) | คนสุดท้าย | 25 |
| ALL DAMAGE xN | DANO TOTAL xN | TODO EL DAÑO xN | DÉGÂTS xN | ALLER SCHADEN xN | TUTTI I DANNI xN | ВЕСЬ УРОН xN | TÜM HASAR xN | SEMUA DAMAGE xN (?) | MỌI SÁT THƯƠNG xN | LAHAT NG DMG xN (?) | ดาเมจทั้งหมด xN | 28 |
| LEVEL | NÍVEL | NIVEL | NIVEAU | STUFE | LIVELLO | УРОВЕНЬ | SEVİYE | LEVEL | CẤP | LEVEL | เลเวล | 8 |
| MAX LEVEL! | NÍVEL MÁX! | ¡NIVEL MÁX! | NIVEAU MAX ! | MAX. STUFE! | LIV. MAX! | МАКС. УРОВЕНЬ! | MAKS SEVİYE! | LEVEL MAKS! | CẤP TỐI ĐA! | MAX LEVEL! | เลเวลสูงสุด! | 14 |
| LEVEL UP! | SOBE DE NÍVEL! | ¡SUBE DE NIVEL! | NIVEAU SUP. ! | STUFE HOCH! | LIVELLO SU! | УРОВЕНЬ ВЫШЕ! | SEVİYE ATLA! | NAIK LEVEL! | LÊN CẤP! | LEVEL UP! | เลเวลอัป! | 14 |
| WIN: | GANHE: | GANA: | GAGNE : | GEWINNE: | VINCI: | ПОЛУЧИ: | KAZAN: | DAPATKAN: | NHẬN: | MANALO: (?) | รับ: | 12 |
| RUN OVER | FIM DA PARTIDA | FIN DE LA PARTIDA | PARTIE FINIE | LAUF VORBEI | PARTITA FINITA | ЗАБЕГ ОКОНЧЕН | OYUN BİTTİ | SELESAI | KẾT THÚC | TAPOS NA | จบเกม | 18 |
| RUN (a game) | PARTIDA | PARTIDA | PARTIE | LAUF | PARTITA | ЗАБЕГ | OYUN | GAME | VÁN | LARO | เกม | 8 |
| NEW RUN | NOVA PARTIDA | NUEVA PARTIDA | NOUVELLE PARTIE | NEUER LAUF | NUOVA PARTITA | НОВЫЙ ЗАБЕГ | YENİ OYUN | GAME BARU | VÁN MỚI | BAGONG LARO | เกมใหม่ | 18 |
| PLAY AGAIN | JOGAR DE NOVO | OTRA VEZ | REJOUER | NOCHMAL | RIGIOCA | ЕЩЁ РАЗ | TEKRAR OYNA | MAIN LAGI | CHƠI LẠI | ULIT LARO | เล่นอีก | 10 |
| REMATCH | REVANCHE | REVANCHA | REVANCHE | REVANCHE | RIVINCITA | РЕВАНШ | RÖVANŞ | BALAS | GỠ LẠI | ULIT-LABAN (?) | แก้มือ | 10 |
| SAME HORDE AGAIN | A MESMA HORDA DE NOVO | LA MISMA HORDA OTRA VEZ | MÊME HORDE | GLEICHE HORDE | STESSA ORDA | ТА ЖЕ ОРДА | AYNI SÜRÜ | HORDE SAMA | CÙNG ĐÁM | PAREHONG HORDE | ฝูงเดิม | 24 |
| SWAP | TROCAR | CAMBIAR | ÉCHANGER | TAUSCH | SCAMBIA | ОБМЕН | TAKAS | TUKAR | ĐỔI CHỖ | PALITAN | สลับ | 10 |
| SWAP TWO PLOTS (FREE) | TROQUE 2 TERRENOS (GRÁTIS) | CAMBIA 2 PARCELAS (GRATIS) | ÉCHANGE 2 PARCELLES (GRATUIT) | TAUSCHE 2 FELDER (GRATIS) | SCAMBIA 2 LOTTI (GRATIS) | ОБМЕНЯЙ 2 УЧАСТКА (БЕСПЛАТНО) | 2 ARSAYI TAKAS ET (BEDAVA) | TUKAR 2 PETAK (GRATIS) | ĐỔI 2 Ô ĐẤT (MIỄN PHÍ) | PALITAN ANG 2 LOTE (LIBRE) | สลับ 2 แปลง (ฟรี) | 30 |
| SWAPPED | TROCADO | CAMBIADO | ÉCHANGÉ | GETAUSCHT | SCAMBIATO | ОБМЕНЕНО | TAKAS EDİLDİ | DITUKAR | ĐÃ ĐỔI | NAPALITAN | สลับแล้ว | 14 |
| KEEP AS IS | ver seção 4 | | | | | | | | | | | 14 |
| REROLL | SORTEAR | BARAJAR | RELANCER | MISCHEN | RIMESCOLA | ЗАНОВО | YENİLE | ACAK ULANG | ĐỔI BÀI | MULING PILI (?) | สุ่มใหม่ | 10 |
| REPAIR | CONSERTAR | REPARAR | RÉPARER | REPARIER | RIPARA | ЧИНИТЬ | ONAR | PERBAIKI | SỬA | AYUSIN | ซ่อม | 10 |
| NEXT HAND | PRÓXIMA MÃO | SIGUIENTE MANO | MAIN SUIVANTE | NÄCHSTE HAND | PROSSIMA MANO | СЛЕД. РУКА | SONRAKİ EL | TANGAN BERIKUT | LƯỢT SAU | SUSUNOD NA KAMAY | มือถัดไป | 14 |
| HOLD / HELD | ver seção 4 | | | | | | | | | | | 8 |

### 2.2 Recursos e mapa

| en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GOLD | OURO | ORO | OR | GOLD | ORO | ЗОЛОТО | ALTIN | EMAS | VÀNG | GINTO | ทอง | 6 |
| HEART (life) | CORAÇÃO | CORAZÓN | CŒUR | HERZ | CUORE | СЕРДЦЕ | KALP | HATI | TIM | PUSO | หัวใจ | 8 |
| HEARTS (plural) | CORAÇÕES | CORAZONES | CŒURS | HERZEN | CUORI | СЕРДЦА | KALP | HATI | TIM | PUSO | หัวใจ | 10 |
| PLOT | TERRENO | PARCELA | PARCELLE | FELD | LOTTO | УЧАСТОК | ARSA | PETAK | Ô ĐẤT | LOTE | แปลง | 8 |
| PICK A PLOT | ESCOLHA UM TERRENO | ELIGE UNA PARCELA | CHOISIS UNE PARCELLE | WÄHLE EIN FELD | SCEGLI UN LOTTO | ВЫБЕРИ УЧАСТОК | ARSA SEÇ | PILIH PETAK | CHỌN Ô ĐẤT | PUMILI NG LOTE | เลือกแปลง | 24 |
| CASTLE | CASTELO | CASTILLO | CHÂTEAU | BURG | CASTELLO | ЗАМОК | KALE | KASTIL | LÂU ĐÀI | KASTILYO | ปราสาท | 10 |
| GATE | PORTÃO | PUERTA | PORTE | TOR | PORTA | ВОРОТА | KAPI | GERBANG | CỔNG | TARANGKAHAN (?) | ประตู | 10 |
| KINGDOM | REINO | REINO | ROYAUME | REICH | REGNO | КОРОЛЕВСТВО | KRALLIK | KERAJAAN | VƯƠNG QUỐC | KAHARIAN | อาณาจักร | 12 |
| KEEP (fortress, in text) | FORTE | FUERTE | FORT | FESTUNG | FORTE | КРЕПОСТЬ | KALE (?) | BENTENG | PHÁO ĐÀI (?) | KUTA (?) | ป้อมปราการ (?) | 12 |
| ROAD | ESTRADA | CAMINO | ROUTE | STRASSE | STRADA | ДОРОГА | YOL | JALAN | ĐƯỜNG | DAAN | ถนน | 8 |
| SOLDIER | SOLDADO | SOLDADO | SOLDAT | SOLDAT | SOLDATO | СОЛДАТ | ASKER | PRAJURIT | LÍNH | SUNDALO | ทหาร | 10 |
| INVADER | INVASOR | INVASOR | ENVAHISSEUR | EINDRINGLING | INVASORE | ЗАХВАТЧИК | İSTİLACI | PENYERBU | KẺ XÂM LĂNG | MANLULUSOB (?) | ผู้บุก | 12 |
| HORDE | HORDA | HORDA | HORDE | HORDE | ORDA | ОРДА | SÜRÜ | HORDE | ĐÁM | HORDE | ฝูง | 8 |

### 2.3 Cartas, mão, relíquias

| en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CARD | CARTA | CARTA | CARTE | KARTE | CARTA | КАРТА | KART | KARTU | THẺ | KARTA | การ์ด | 8 |
| NEW CARD | NOVA CARTA | CARTA NUEVA | NOUVELLE CARTE | NEUE KARTE | NUOVA CARTA | НОВАЯ КАРТА | YENİ KART | KARTU BARU | THẺ MỚI | BAGONG KARTA | การ์ดใหม่ | 14 |
| HAND | MÃO | MANO | MAIN | HAND | MANO | РУКА | EL | TANGAN | TAY BÀI | KAMAY | ไพ่ในมือ (?) | 8 |
| ODDS | CHANCES | PROBABILIDADES | CHANCES | CHANCEN | PROBABILITÀ | ШАНСЫ | ŞANS | PELUANG | TỈ LỆ | TSANSA | โอกาส | 14 |
| ODDS THIS HAND | CHANCES DESTA MÃO | PROBABILIDADES DE LA MANO | CHANCES DE LA MAIN | CHANCEN DER HAND | PROBABILITÀ DELLA MANO | ШАНСЫ РУКИ | BU ELİN ŞANSI | PELUANG TANGAN INI | TỈ LỆ LƯỢT NÀY | TSANSA SA KAMAY | โอกาสมือนี้ | 24 |
| TAP A CARD | TOQUE EM UMA CARTA | TOCA UNA CARTA | TOUCHE UNE CARTE | TIPPE EINE KARTE | TOCCA UNA CARTA | КОСНИСЬ КАРТЫ | BİR KARTA DOKUN | SENTUH KARTU | CHẠM VÀO THẺ | PINDUTIN ANG KARTA | แตะการ์ด | 22 |
| TROOP | TROPA | TROPA | TROUPE | TRUPPE | TRUPPA | ВОЙСКО | BİRLİK | PASUKAN | QUÂN | TROPA | กองทัพ (?) | 10 |
| BUILDING | CONSTRUÇÃO | CONSTRUCCIÓN | BÂTIMENT | GEBÄUDE | EDIFICIO | ПОСТРОЙКА | BİNA | BANGUNAN | CÔNG TRÌNH | GUSALI | อาคาร | 12 |
| MAGIC / SPELL | MAGIA | MAGIA | MAGIE | MAGIE | MAGIA | МАГИЯ | BÜYÜ | SIHIR | PHÉP | MAHIKA | เวทมนตร์ | 8 |
| COMMON | COMUM | COMÚN | COMMUNE | GEWÖHNLICH | COMUNE | ОБЫЧНАЯ | YAYGIN | UMUM | THƯỜNG | KARANIWAN | ธรรมดา | 10 |
| UNCOMMON | INCOMUM | POCO COMÚN | PEU COMMUNE | UNGEWÖHNL. | NON COMUNE | НЕОБЫЧНАЯ | NADİR | LANGKA | KHÁ HIẾM (?) | BIHIRA | ไม่ธรรมดา (?) | 11 |
| RARE | RARA | RARA | RARE | SELTEN | RARA | РЕДКАЯ | ENDER | SANGAT LANGKA | HIẾM | PAMBIHIRA | หายาก | 10 |
| EPIC | ÉPICA | ÉPICA | ÉPIQUE | EPISCH | EPICA | ЭПИЧЕСКАЯ | DESTANSI | EPIK | SỬ THI | EPIKO | เอพิค | 10 |
| LEGENDARY | LENDÁRIA | LEGENDARIA | LÉGENDAIRE | LEGENDÄR | LEGGENDARIA | ЛЕГЕНДАРНАЯ | EFSANEVİ | LEGENDARIS | HUYỀN THOẠI | LEGENDARYO | ตำนาน | 12 |
| RELIC | RELÍQUIA | RELIQUIA | RELIQUE | RELIKT | RELIQUIA | РЕЛИКВИЯ | KALINTI | RELIK | CỔ VẬT (?) | RELIKYA | ของวิเศษ (?) | 10 |
| LOOT (reward) | ESPÓLIO | BOTÍN | BUTIN | BEUTE | BOTTINO | ТРОФЕЙ | GANİMET | JARAHAN | CHIẾN LỢI PHẨM | NAKUHA (?) | ของรางวัล | 10 |
| PICK 1 REWARD | ESCOLHA 1 ESPÓLIO | ELIGE 1 BOTÍN | CHOISIS 1 BUTIN | WÄHLE 1 BEUTE | SCEGLI 1 BOTTINO | ВЫБЕРИ 1 ТРОФЕЙ | 1 GANİMET SEÇ | PILIH 1 JARAHAN | CHỌN 1 PHẦN | PUMILI NG 1 (?) | เลือกของรางวัล 1 ชิ้น | 20 |
| PURSE | BOLSA | BOLSA | BOURSE | BEUTEL | BORSA | КОШЕЛЁК | KESE | KANTONG | TÚI TIỀN | PURSE | ถุงเงิน | 8 |
| PROMOTION | PROMOÇÃO | ASCENSO | PROMOTION | BEFÖRDERUNG | PROMOZIONE | ПОВЫШЕНИЕ | TERFİ | PROMOSI | THĂNG CẤP | PROMOSYON | เลื่อนขั้น | 12 |
| FAMILY | FAMÍLIA | FAMILIA | FAMILLE | FAMILIE | FAMIGLIA | СЕМЬЯ | AİLE | KELUARGA | HỌ | PAMILYA | ตระกูล | 10 |
| BONUS | BÔNUS | BONO | BONUS | BONUS | BONUS | БОНУС | BONUS | BONUS | THƯỞNG | BONUS | โบนัส | 8 |
| MVP | MVP | MVP | MVP | MVP | MVP | MVP | MVP | MVP | MVP | MVP | MVP | 6 |

### 2.4 Legendas curtas de atributo (limite 6)

O config tem 18 chaves em `LEGENDAS` e 14 textos distintos (DMG em 3 chaves, HEALTH e SPEED em 2).

| en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DMG | DANO | DAÑO | DGT | SCHAD | DANNO | УРОН | HASAR | DMG (?) | ST (?) | DMG (?) | ดาเมจ | 6 |
| SOLDIERS | TROPAS | SOLD. | TROUPE | TRUPP | TRUPPE | БОЙЦЫ | ASKER | PRAJ. | LÍNH | SUND. (?) | ทหาร | 6 |
| HIT TAKEN | DEFESA | DEFENS. (?) | ARMURE | SCHUTZ | DIFESA | БРОНЯ | KORUMA | KURANG (?) | GIẢM ST (?) | BAWAS (?) | ลดดาเมจ (?) | 6 |
| SPEED | VELOC. | VELOC. | VIT. | TEMPO | VELOC. | СКОР. | HIZ | KECEP. | TỐC ĐỘ | BILIS | เร็ว | 6 |
| HP/SEC | VIDA/S | VIDA/S | PV/S | LP/S | PV/S | ХП/С | CAN/S | HP/D | HP/G | HP/S | HP/วิ | 6 |
| GOLD | OURO | ORO | OR | GOLD | ORO | ЗОЛОТО | ALTIN | EMAS | VÀNG | GINTO | ทอง | 6 |
| HEALTH | VIDA | VIDA | VIE | LEBEN | VITA | ЖИЗНЬ | CAN | NYAWA | MÁU | BUHAY | เลือด | 6 |
| REPEAT | REPETE | REPITE | BIS | NOCHMAL | BIS | ПОВТОР | TEKRAR | ULANG | LẶP | ULIT | ซ้ำ | 6 |
| BURST | EXPLODE | ESTALLA | BOUM | BUMM | BOOM | ВЗРЫВ | PATLA | LEDAK | NỔ | SABOG | ระเบิด | 6 |
| SLOW | LENTO | LENTO | LENT | BREMSE | LENTO | ЗАМЕДЛ. | YAVAŞ | LAMBAT | CHẬM | BAGAL | ช้า | 6 |
| DMG/SEC | DANO/S | DAÑO/S | DGT/S | SCH/S | DAN/S | УРОН/С | HSR/S | DMG/D | ST/G | DMG/S | ดาเมจ/วิ | 6 |
| HEAL | CURA | CURA | SOIN | HEILEN | CURA | ЛЕЧИТ | İYİLEŞ | PULIH | HỒI | GAMOT | รักษา | 6 |
| STUCK | PRESO | ATRAPA | PIÉGÉ | FEST | BLOCCO | ЛОВУШКА (?) | TUZAK | JEBAK (?) | KẸT | NAKAPIT | ติดกับ | 6 |
| REVIVE | REVIVE | REVIVE | REVIVE | WIEDER (?) | RIALZA | ВОСКР. | DİRİL | HIDUP | SỐNG (?) | BUHAY | ฟื้น | 6 |

Obs.: "HIT TAKEN" significa "dano recebido reduzido"; o número em % fica ao lado, a palavra só nomeia. Ru "ЛОВУШКА" tem 7: se não couber, usar "ПЛЕН" (?).

### 2.5 Menus, modos, placar

| en | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th | limite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WIN (verb) | VENÇA | GANA | GAGNE | GEWINNE | VINCI | ПОБЕДИ | KAZAN | MENANGKAN | THẮNG | PANALUHIN (?) | ชนะ | 10 |
| SCORE | PONTOS | PUNTOS | SCORE | PUNKTE | PUNTI | ОЧКИ | SKOR | SKOR | ĐIỂM | ISKOR | คะแนน | 10 |
| BEST SCORE | MELHOR PONTUAÇÃO | MEJOR PUNTAJE | MEILLEUR SCORE | BESTWERT | RECORD | ЛУЧШИЙ СЧЁТ | EN İYİ SKOR | SKOR TERBAIK | ĐIỂM CAO NHẤT | PINAKAMATAAS | คะแนนสูงสุด | 20 |
| NEW RECORD! | NOVO RECORDE! | ¡NUEVO RÉCORD! | NOUVEAU RECORD ! | NEUER REKORD! | NUOVO RECORD! | НОВЫЙ РЕКОРД! | YENİ REKOR! | REKOR BARU! | KỶ LỤC MỚI! | BAGONG REKORD! | สถิติใหม่! | 16 |
| RANKING | RANKING | CLASIFICACIÓN | CLASSEMENT | RANGLISTE | CLASSIFICA | РЕЙТИНГ | SIRALAMA | PERINGKAT | XẾP HẠNG | RANGGO | อันดับ | 14 |
| RANK n | POSIÇÃO n | PUESTO n | RANG n | PLATZ n | POSTO n | МЕСТО n | SIRA n | PERINGKAT n | HẠNG n | RANGGO n | อันดับ n | 14 |
| BOARD | PLACAR | TABLA | TABLEAU | BESTENLISTE | TABELLONE | ТАБЛО | TABLO | PAPAN | BẢNG | LISTAHAN | ตาราง | 10 |
| RANKED | RANQUEADA | CLASIFICADA | CLASSÉE | GEWERTET (?) | CLASSIFICATA | РЕЙТИНГОВАЯ | DERECELİ | RANKED (?) | XẾP HẠNG | RANKED | จัดอันดับ | 12 |
| SEASON | TEMPORADA | TEMPORADA | SAISON | SAISON | STAGIONE | СЕЗОН | SEZON | MUSIM | MÙA | SEASON (?) | ซีซัน | 10 |
| LEAGUE | LIGA | LIGA | LIGUE | LIGA | LEGA | ЛИГА | LİG | LIGA | LIGA | LIGA | ลีก | 10 |
| TITLE | TÍTULO | TÍTULO | TITRE | TITEL | TITOLO | ТИТУЛ | UNVAN | GELAR | DANH HIỆU | TITULO | ฉายา (?) | 10 |
| UNRANKED | SEM LIGA | SIN LIGA | SANS LIGUE | LIGALOS | SENZA LEGA | БЕЗ ЛИГИ | LİGSİZ | TANPA LIGA | CHƯA CÓ LIGA | WALANG LIGA | ไม่มีลีก | 14 |
| PROVISIONAL | PROVISÓRIO | PROVISIONAL | PROVISOIRE | VORLÄUFIG | PROVVISORIO | ВРЕМЕННО | GEÇİCİ | SEMENTARA | TẠM THỜI | PANSAMANTALA | ชั่วคราว | 14 |
| BETA | BETA | BETA | BÊTA | BETA | BETA | БЕТА | BETA | BETA | BETA | BETA | เบต้า | 6 |
| PROFILE | PERFIL | PERFIL | PROFIL | PROFIL | PROFILO | ПРОФИЛЬ | PROFİL | PROFIL | HỒ SƠ | PROFAYL (?) | โปรไฟล์ | 10 |
| ALBUM | ÁLBUM | ÁLBUM | ALBUM | ALBUM | ALBUM | АЛЬБОМ | ALBÜM | ALBUM | ALBUM | ALBUM | อัลบั้ม | 8 |
| ACHIEVEMENTS | CONQUISTAS | LOGROS | SUCCÈS | ERFOLGE | OBIETTIVI | ДОСТИЖЕНИЯ | BAŞARILAR | PENCAPAIAN | THÀNH TỰU | MGA NAGAWA (?) | ความสำเร็จ | 16 |
| ACHIEVEMENT | CONQUISTA | LOGRO | SUCCÈS | ERFOLG | OBIETTIVO | ДОСТИЖЕНИЕ | BAŞARI | PENCAPAIAN | THÀNH TỰU | NAGAWA (?) | ความสำเร็จ | 14 |
| MEDAL | MEDALHA | MEDALLA | MÉDAILLE | MEDAILLE | MEDAGLIA | МЕДАЛЬ | MADALYA | MEDALI | HUY CHƯƠNG | MEDALYA | เหรียญ | 10 |
| REPLAY | REPLAY | REPETICIÓN | REPLAY | REPLAY | REPLAY | ПОВТОР | TEKRAR | ULANG | XEM LẠI | REPLAY | รีเพลย์ | 8 |
| WATCH (a replay) | VER | VER | VOIR | ANSEHEN | GUARDA | СМОТРЕТЬ | İZLE | LIHAT | XEM | PANOORIN | ดู | 10 |
| TRAINING | TREINO | ENTRENAMIENTO | ENTRAÎNEMENT | TRAINING | ALLENAMENTO | ТРЕНИРОВКА | ANTRENMAN | LATIHAN | LUYỆN TẬP | SANAY | ฝึกซ้อม | 12 |
| DAILY ROAD (`modo.estrada`; menu: "Today's road") | ESTRADA DO DIA | CAMINO DEL DÍA | ROUTE DU JOUR | TAGESSTRASSE | STRADA DEL GIORNO | ДОРОГА ДНЯ | GÜNLÜK YOL | JALAN HARIAN | ĐƯỜNG HẰNG NGÀY | DAAN NG ARAW | ถนนประจำวัน | 18 |
| ENERGY | ENERGIA | ENERGÍA | ÉNERGIE | ENERGIE | ENERGIA | ЭНЕРГИЯ | ENERJİ | ENERGI | NĂNG LƯỢNG | ENERHIYA | พลังงาน | 10 |
| RANKED ENERGY | ENERGIA DE RANKING | ENERGÍA CLASIF. | ÉNERGIE CLASSÉE | RANG-ENERGIE | ENERGIA CLASSIFICA | ЭНЕРГИЯ РЕЙТИНГА | SIRALAMA ENERJİSİ | ENERGI RANKED | NĂNG LƯỢNG XH | RANKED ENERHIYA | พลังงานจัดอันดับ | 22 |
| SETTINGS | AJUSTES | AJUSTES | RÉGLAGES | OPTIONEN | IMPOSTAZIONI | НАСТРОЙКИ | AYARLAR | PENGATURAN | CÀI ĐẶT | SETTINGS (?) | ตั้งค่า | 18 |
| SOUND | SOM | SONIDO | SON | TON | SUONO | ЗВУК | SES | SUARA | ÂM THANH | TUNOG | เสียง | 10 |
| MUSIC | MÚSICA | MÚSICA | MUSIQUE | MUSIK | MUSICA | МУЗЫКА | MÜZİK | MUSIK | NHẠC | MUSIKA | เพลง | 10 |
| EFFECTS | EFEITOS | EFECTOS | EFFETS | EFFEKTE | EFFETTI | ЭФФЕКТЫ | EFEKTLER | EFEK | HIỆU ỨNG | EPEKTO | เอฟเฟกต์ | 10 |
| REDUCED MOTION | MENOS ANIMAÇÃO | MENOS ANIMACIÓN | MOINS D'ANIMATION | WENIGER ANIMATION | MENO ANIMAZIONI | МЕНЬШЕ АНИМАЦИИ | AZ ANİMASYON | ANIMASI KURANG (?) | GIẢM CHUYỂN ĐỘNG | KAUNTING GALAW (?) | ลดการเคลื่อนไหว | 20 |
| LANGUAGE | IDIOMA | IDIOMA | LANGUE | SPRACHE | LINGUA | ЯЗЫК | DİL | BAHASA | NGÔN NGỮ | WIKA | ภาษา | 10 |
| BACK | VOLTAR | VOLVER | RETOUR | ZURÜCK | INDIETRO | НАЗАД | GERİ | KEMBALI | QUAY LẠI | BALIK | กลับ | 10 |
| PLAY | JOGAR | JUGAR | JOUER | SPIELEN | GIOCA | ИГРАТЬ | OYNA | MAIN | CHƠI | LARO | เล่น | 10 |
| CONTINUE / RESUME | CONTINUAR | CONTINUAR | CONTINUER | WEITER | CONTINUA | ДАЛЕЕ | DEVAM | LANJUT | TIẾP | TULOY | ต่อ | 10 |
| SHARE | COMPARTILHAR | COMPARTIR | PARTAGER | TEILEN | CONDIVIDI | ПОДЕЛИТЬСЯ | PAYLAŞ | BAGIKAN | CHIA SẺ | IBAHAGI | แชร์ | 10 |
| NAME | NOME | NOMBRE | NOM | NAME | NOME | ИМЯ | AD | NAMA | TÊN | PANGALAN | ชื่อ | 8 |
| SAVE | SALVAR | GUARDAR | ENREGISTRER | SPEICHERN | SALVA | СОХРАНИТЬ | KAYDET | SIMPAN | LƯU | I-SAVE | บันทึก | 10 |
| CLOSE | FECHAR | CERRAR | FERMER | SCHLIESSEN | CHIUDI | ЗАКРЫТЬ | KAPAT | TUTUP | ĐÓNG | ISARA | ปิด | 10 |
| ON / OFF | LIGADO / DESLIGADO | ACTIVADO / DESACTIVADO | ACTIVÉ / DÉSACTIVÉ | AN / AUS | ON / OFF | ВКЛ / ВЫКЛ | AÇIK / KAPALI | NYALA / MATI | BẬT / TẮT | ON / OFF | เปิด / ปิด | 10 |
| YES / NO | SIM / NÃO | SÍ / NO | OUI / NON | JA / NEIN | SÌ / NO | ДА / НЕТ | EVET / HAYIR | YA / TIDAK | CÓ / KHÔNG | OO / HINDI | ใช่ / ไม่ | 10 |
| LOCKED | BLOQUEADA | BLOQUEADA | VERROUILLÉE | GESPERRT | BLOCCATA | ЗАКРЫТА | KİLİTLİ | TERKUNCI | KHÓA | NAKAKULONG (?) | ล็อก | 10 |
| TRY AGAIN | TENTAR DE NOVO | REINTENTAR | RÉESSAYER | ERNEUT | RIPROVA | ПОВТОРИТЬ | TEKRAR DENE | COBA LAGI | THỬ LẠI | SUBUKAN ULIT | ลองอีกครั้ง | 14 |
| SKIP | PULAR | SALTAR | PASSER | ÜBERSPR. | SALTA | ПРОПУСК | GEÇ | LEWATI | BỎ QUA | LAKTAWAN | ข้าม | 10 |

## 3. Plural por idioma

Hoje o código usa só `n === 1` (textos.js:12, 26, 33, 34, 57, 59 etc.). Cada idioma precisa de função própria. Vale para ROUND(S), RUN(S), POINT(S), HEART(S), PLOT(S), INVADER(S).

| Idioma | Formas | Regra |
|---|---|---|
| en | 2 | 1 = singular; resto plural (0 incluso) |
| pt-BR | 2 | 0 e 1 singular em muitos usos ("0 rodada" é aceito; usar plural no 0 para manter igual ao en); 2+ plural |
| es | 2 | 1 singular; resto plural (0 plural) |
| fr | 2 | 0 e 1 singular ("0 manche", "1 manche"); 2+ plural |
| de | 2 | 1 singular; resto plural (0 plural) |
| it | 2 | 1 singular; resto plural (0 plural) |
| ru | 3 | termina em 1 (exceto 11) = forma 1; termina em 2-4 (exceto 12-14) = forma 2; demais (0, 5-20, 11-14...) = forma 3. Ex.: 1 раунд, 2 раунда, 5 раундов |
| tr | 1 | depois de número o substantivo fica no singular ("5 TUR"); sem plural |
| id | 1 | sem plural ("5 RONDE"); reduplicação só sem número |
| vi | 1 | sem plural ("5 VÒNG") |
| fil | 1 (+ "mga") | "mga" antes do substantivo só quando não há número ("mga raund"); com número fica singular ("5 RAUND"); 1 = "1 RAUND" |
| th | 1 | sem plural ("5 รอบ"); classificador quando preciso (หัวใจ 1 ดวง) |

Obs.: o ru pede 3 chaves de texto por termo contado (1 / 2-4 / 5+). Os outros 11 não têm 3ª forma.

## 4. Cuidado: o que não se traduz ao pé da letra

| Termo (en) | Problema | pt-BR | es | fr | de | it | ru | tr | id | vi | fil | th |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HOLD TO ROUND n | "hold" = resistir, segurar a linha | RESISTA ATÉ A RODADA n | AGUANTA HASTA LA RONDA n | TIENS JUSQU'À LA MANCHE n | HALTE BIS RUNDE n | RESISTI FINO AL TURNO n | ДЕРЖИСЬ ДО РАУНДА n | n. TURA KADAR DAYAN | BERTAHAN SAMPAI RONDE n | BẢO VỆ ĐẾN VÒNG n | PANATILIHIN HANGGANG RAUND n (?) | ยืนหยัดถึงรอบ n |
| HELD | idem (resultado) | RESISTIU | AGUANTÓ | TENU | GEHALTEN | REGGE | УСТОЯЛ | DAYANDI | BERTAHAN | CỰ ĐƯỢC (?) | NAKATAGAL (?) | ยืนหยัดได้ |
| THE KINGDOM HELD | idem | O REINO RESISTIU | EL REINO AGUANTÓ | LE ROYAUME A TENU | DAS REICH HIELT | IL REGNO HA RESISTITO | КОРОЛЕВСТВО УСТОЯЛО | KRALLIK DAYANDI | KERAJAAN BERTAHAN | VƯƠNG QUỐC CỰ ĐƯỢC (?) | NANATILI ANG KAHARIAN (?) | อาณาจักรยืนหยัดได้ |
| ROUND n HELD! | festa | RODADA n RESISTIDA! | ¡RONDA n AGUANTADA! | MANCHE n TENUE ! | RUNDE n GEHALTEN! | TURNO n TENUTO! | РАУНД n ПРОЙДЕН! | TUR n DAYANILDI! | RONDE n BERTAHAN! | VÒNG n CỰ ĐƯỢC! (?) | RAUND n NAKAYANAN! (?) | รอบ n ผ่านแล้ว! |
| KEEP GOING FOR SCORE | continuar por pontos | CONTINUE POR PONTOS | SIGUE POR PUNTOS | CONTINUE POUR LE SCORE | MACH WEITER FÜR PUNKTE | CONTINUA PER I PUNTI | ИГРАЙ РАДИ ОЧКОВ | SKOR İÇİN DEVAM | LANJUT UNTUK SKOR | CHƠI TIẾP LẤY ĐIỂM | SIGE PARA SA ISKOR | เล่นต่อเพื่อคะแนน |
| KEEP AS IS (botão da revanche, ≤14) | "não troque nada"; nada a ver com o "keep" fortaleza | DEIXAR ASSIM | DEJAR ASÍ | GARDER TEL QUEL | SO LASSEN | LASCIA COSÌ | ОСТАВИТЬ | BÖYLE KALSIN | BIARKAN | GIỮ NGUYÊN | IWAN NA | คงไว้ |
| Keep my run (botão) | "keep" = continuar a partida atual | CONTINUAR A MINHA | SEGUIR CON MI PARTIDA | GARDER MA PARTIE | MEINE BEHALTEN | ПРОДОЛЖИТЬ МОЮ | BENİMKİ KALSIN | LANJUTKAN GAMEKU | GIỮ VÁN CỦA TÔI | TULOY ANG AKIN | ใช้เกมเดิม |
| Encore! (condição: vencer a rodada 17 ou depois) | título fica "Encore!"; traduzir só a condição | VENÇA A RODADA 17 OU UMA POSTERIOR | GANA LA RONDA 17 O UNA POSTERIOR | GAGNE LA MANCHE 17 OU UNE SUIVANTE | GEWINNE RUNDE 17 ODER SPÄTER | VINCI IL TURNO 17 O UNO DOPO | ПОБЕДИ В РАУНДЕ 17 ИЛИ ПОЗЖЕ | 17. TURU VEYA SONRASINI KAZAN | MENANGKAN RONDE 17 ATAU LEBIH | THẮNG VÒNG 17 TRỞ LÊN | MANALO SA RAUND 17 O MAS HULI | ชนะรอบ 17 ขึ้นไป |
| BEAT MY n ROUNDS | "bater" = superar | SUPERE MINHAS n RODADAS | SUPERA MIS n RONDAS | BATS MES n MANCHES | SCHLAGE MEINE n RUNDEN | BATTI I MIEI n TURNI | ПОБЕЙ МОИ n РАУНДОВ | n TURUMU GEÇ | KALAHKAN n RONDE-KU | VƯỢT n VÒNG CỦA TÔI (?) | TALUNIN ANG AKING n RAUND (?) | ชนะ n รอบของฉัน (?) |
| ROUGH ROAD. GO AGAIN! | tom leve | ESTRADA DURA. DE NOVO! | ¡CAMINO DURO. OTRA VEZ! | ROUTE DURE. ON REMET ÇA ! | HARTE STRASSE. NOCHMAL! | STRADA DURA. RIPROVA! | ТЯЖЁЛАЯ ДОРОГА. ЕЩЁ РАЗ! | ZOR YOL. TEKRAR! | JALAN BERAT. COBA LAGI! | ĐƯỜNG GẬP GHỀNH. THỬ LẠI! | MAHIRAP ANG DAAN. ULIT! | ทางยาก ลองใหม่! |
| LUCKY PURSE | "lucky" = chance de relíquia | BOLSA DA SORTE | BOLSA DE LA SUERTE | BOURSE CHANCEUSE | GLÜCKSBEUTEL | BORSA FORTUNATA | СЧАСТЛИВЫЙ КОШЕЛЁК | ŞANSLI KESE | KANTONG BERUNTUNG | TÚI MAY MẮN | SWERTENG PURSE | ถุงโชคดี |
| GOLD ONLY. NO RELIC THIS TIME. | | SÓ OURO. SEM RELÍQUIA DESTA VEZ. | SOLO ORO. SIN RELIQUIA. | SEULEMENT DE L'OR. PAS DE RELIQUE. | NUR GOLD. KEIN RELIKT. | SOLO ORO. NIENTE RELIQUIA. | ТОЛЬКО ЗОЛОТО. БЕЗ РЕЛИКВИИ. | SADECE ALTIN. KALINTI YOK. | HANYA EMAS. TANPA RELIK. | CHỈ CÓ VÀNG. KHÔNG CỔ VẬT. | GINTO LANG. WALANG RELIKYA. | ทองอย่างเดียว ไม่มีของวิเศษ |
| SPARE GOLD? | "spare" = sobrando, não "poupar" | SOBROU OURO? | ¿SOBRA ORO? | DE L'OR EN TROP ? | ÜBRIGES GOLD? | AVANZA ORO? | ЛИШНЕЕ ЗОЛОТО? | FAZLA ALTIN? | DƯ VÀNG? | MAY LABIS NA GINTO? | MAY LABIS NA GINTO? | ทองเหลือไหม |
| REPAIR A HEART | pagar para recuperar 1 coração | CONSERTE UM CORAÇÃO | REPARA UN CORAZÓN | RÉPARE UN CŒUR | REPARIERE EIN HERZ | RIPARA UN CUORE | ПОЧИНИ СЕРДЦЕ | BİR KALBİ ONAR | PERBAIKI SATU HATI | SỬA 1 TIM | AYUSIN ANG PUSO | ซ่อมหัวใจ 1 ดวง |
| REROLL | trocar a mão por outra, não "jogar dados" | SORTEAR | BARAJAR | RELANCER | MISCHEN | RIMESCOLA | ЗАНОВО | YENİLE | ACAK ULANG | ĐỔI BÀI | MULING PILI (?) | สุ่มใหม่ |
| PINS / FRAME ("PINS: LEVEL n OF max - FRAME: raridade") | "pinos" = marcadores de nível; "frame" = moldura da raridade | PINOS / MOLDURA | CLAVIJAS / MARCO | PIONS / CADRE | STIFTE / RAHMEN | TACCHE / CORNICE | ШТИФТЫ / РАМКА | ÇİVİ / ÇERÇEVE | PIN / BINGKAI | CHỐT / KHUNG | PIN / FRAME (?) | พิน / กรอบ (?) |
| NIGHTFALL (aos 20 s, dano x3) | evento de batalha, "cai a noite" | ANOITECER | ANOCHECER | NUIT | NACHT | NOTTE | НОЧЬ | GECE | MALAM | ĐÊM | GABI | กลางคืน |

Regra fixa: SWAP, REROLL, REPLAY, PLAY AGAIN e TRY AGAIN usam palavras diferentes em cada idioma (evita botão duplicado).

## 5. Honestidade: pontos de menor segurança

- vi: raridades (Uncommon "KHÁ HIẾM"), Relic "CỔ VẬT", Plot "Ô ĐẤT", "held" = "CỰ ĐƯỢC".
- th: Relic, Troop, Hand, Title, frases com numeral; quebra de linha no canvas precisa de regra própria (th não usa espaço entre palavras).
- fil: vários termos mantidos em inglês (RAUND, SEASON, SETTINGS) por serem comuns em jogo, sem confirmação; "mga" nas frases com número.
- tr: PATRON vs BOSS, `%25`, sufixos com nomes em inglês.
- id: "DMG", "ANIMASI KURANG" (alternativa: "GERAKAN BERKURANG").
- de: RANKED ("GEWERTET"), legendas SLOW e REVIVE.
- ru: plural de 3 formas em toda frase com número.
- Todas as abreviações de legenda (2.4) foram feitas sem teste no canvas.
- `tally400` = 300 no config: sabido e proposital (o id ficou, o degrau mudou); a tela mostra 300.
