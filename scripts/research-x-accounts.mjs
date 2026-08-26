import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RESEARCH_DATE = "2026-08-26";
const WINDOW_DAYS = 90;
const OFFLINE = process.argv.includes("--offline");
const LIVE_X = process.argv.includes("--live-x");
const X_RESEARCH_ACCESS_REVIEWED = process.argv.includes(
  "--confirm-x-research-access-reviewed",
);
const SKIP_X = OFFLINE || !LIVE_X;

if (LIVE_X && !X_RESEARCH_ACCESS_REVIEWED) {
  throw new Error(
    "Live X research is disabled unless the current access method and terms have been reviewed. Pass --confirm-x-research-access-reviewed only after that review.",
  );
}
const OUTPUT_DIRECTORY = path.resolve("docs/research");
const CACHE_PATH = path.join(OUTPUT_DIRECTORY, "x-account-metadata-cache.json");
const X_ACCESS_METHOD =
  "public X profile syndication metadata; no authentication";
const POLICY_STATUS =
  "internal_research_only; runtime_disabled; terms_review_required";
const VALIDATED_ID_OVERRIDES = new Map([["brentfordfc", "103036163"]]);

const official = [
  [
    "PremierLeague",
    "Premier League",
    "league_official",
    "Premier League",
    "https://www.premierleague.com/",
    true,
  ],
  [
    "OfficialFPL",
    "Fantasy Premier League",
    "fpl_official",
    "FPL game",
    "https://fantasy.premierleague.com/",
    true,
  ],
  [
    "PLComms",
    "Premier League Communications",
    "league_official",
    "Premier League communications",
    "https://www.premierleague.com/about",
    true,
  ],
  [
    "Arsenal",
    "Arsenal",
    "club_official",
    "Arsenal",
    "https://www.arsenal.com/",
    true,
  ],
  [
    "AVFCOfficial",
    "Aston Villa",
    "club_official",
    "Aston Villa",
    "https://www.avfc.co.uk/",
    true,
  ],
  [
    "afcbournemouth",
    "AFC Bournemouth",
    "club_official",
    "Bournemouth",
    "https://www.afcb.co.uk/",
    true,
  ],
  [
    "BrentfordFC",
    "Brentford FC",
    "club_official",
    "Brentford",
    "https://www.brentfordfc.com/",
    true,
  ],
  [
    "OfficialBHAFC",
    "Brighton & Hove Albion",
    "club_official",
    "Brighton",
    "https://www.brightonandhovealbion.com/",
    true,
  ],
  [
    "ChelseaFC",
    "Chelsea FC",
    "club_official",
    "Chelsea",
    "https://www.chelseafc.com/",
    true,
  ],
  [
    "Coventry_City",
    "Coventry City",
    "club_official",
    "Coventry City",
    "https://www.ccfc.co.uk/",
    true,
  ],
  [
    "CPFC",
    "Crystal Palace F.C.",
    "club_official",
    "Crystal Palace",
    "https://www.cpfc.co.uk/",
    true,
  ],
  [
    "Everton",
    "Everton",
    "club_official",
    "Everton",
    "https://www.evertonfc.com/",
    true,
  ],
  [
    "FulhamFC",
    "Fulham Football Club",
    "club_official",
    "Fulham",
    "https://www.fulhamfc.com/",
    true,
  ],
  [
    "HullCity",
    "Hull City",
    "club_official",
    "Hull City",
    "https://www.wearehullcity.co.uk/",
    true,
  ],
  [
    "IpswichTown",
    "Ipswich Town",
    "club_official",
    "Ipswich Town",
    "https://www.itfc.co.uk/",
    true,
  ],
  [
    "LUFC",
    "Leeds United",
    "club_official",
    "Leeds United",
    "https://www.leedsunited.com/",
    true,
  ],
  [
    "LFC",
    "Liverpool FC",
    "club_official",
    "Liverpool",
    "https://www.liverpoolfc.com/",
    true,
  ],
  [
    "ManCity",
    "Manchester City",
    "club_official",
    "Manchester City",
    "https://www.mancity.com/",
    true,
  ],
  [
    "ManUtd",
    "Manchester United",
    "club_official",
    "Manchester United",
    "https://www.manutd.com/",
    true,
  ],
  [
    "NUFC",
    "Newcastle United",
    "club_official",
    "Newcastle United",
    "https://www.newcastleunited.com/",
    true,
  ],
  [
    "NFFC",
    "Nottingham Forest",
    "club_official",
    "Nottingham Forest",
    "https://www.nottinghamforest.co.uk/",
    true,
  ],
  [
    "SunderlandAFC",
    "Sunderland AFC",
    "club_official",
    "Sunderland",
    "https://www.safc.com/",
    true,
  ],
  [
    "SpursOfficial",
    "Tottenham Hotspur",
    "club_official",
    "Tottenham Hotspur",
    "https://www.tottenhamhotspur.com/",
    true,
  ],
  [
    "FA_PGMOL",
    "PGMOL",
    "competition_official",
    "officials and suspensions",
    "https://www.premierleague.com/referees",
    false,
  ],
  [
    "EmiratesFACup",
    "Emirates FA Cup",
    "competition_official",
    "FA Cup",
    "https://www.thefa.com/competitions/thefacup",
    false,
  ],
  [
    "Carabao_Cup",
    "Carabao Cup",
    "competition_official",
    "EFL Cup",
    "https://www.efl.com/competitions/carabao-cup",
    false,
  ],
  [
    "England",
    "England",
    "national_team_official",
    "England",
    "https://www.englandfootball.com/",
    false,
  ],
  [
    "SkySportsPL",
    "Sky Sports Premier League",
    "publisher",
    "Premier League",
    "https://www.skysports.com/premier-league",
    false,
  ],
  [
    "BBCSport",
    "BBC Sport",
    "publisher",
    "football",
    "https://www.bbc.com/sport/football",
    false,
  ],
  [
    "BBCMOTD",
    "Match of the Day",
    "publisher",
    "Premier League",
    "https://www.bbc.com/sport/football",
    false,
  ],
  [
    "TheAthleticFC",
    "The Athletic | Football",
    "publisher",
    "football",
    "https://www.nytimes.com/athletic/football/",
    false,
  ],
  [
    "guardian_sport",
    "Guardian sport",
    "publisher",
    "football",
    "https://www.theguardian.com/football",
    false,
  ],
  [
    "TeleFootball",
    "Telegraph Football",
    "publisher",
    "football",
    "https://www.telegraph.co.uk/football/",
    false,
  ],
  [
    "OptaJoe",
    "OptaJoe",
    "data_publisher",
    "Premier League data",
    "https://www.statsperform.com/opta/",
    false,
  ],
  [
    "Squawka",
    "Squawka",
    "data_publisher",
    "football data",
    "https://www.squawka.com/",
    false,
  ],
];

const reporters = [
  [
    "David_Ornstein",
    "David Ornstein",
    "national football",
    "https://muckrack.com/david-ornstein",
    true,
  ],
  [
    "FabrizioRomano",
    "Fabrizio Romano",
    "transfers",
    "https://www.fabrizioromano.com/",
    false,
  ],
  [
    "sistoney67",
    "Simon Stone",
    "Manchester clubs and national football",
    "https://www.bbc.com/sport/football",
    false,
  ],
  [
    "lauriewhitwell",
    "Laurie Whitwell",
    "Manchester United",
    "https://www.nytimes.com/athletic/author/laurie-whitwell/",
    false,
  ],
  [
    "JamesPearceLFC",
    "James Pearce",
    "Liverpool",
    "https://www.nytimes.com/athletic/author/james-pearce/",
    false,
  ],
  [
    "_pauljoyce",
    "Paul Joyce",
    "Liverpool and Everton",
    "https://www.thetimes.com/profile/paul-joyce",
    false,
  ],
  [
    "davidlynchlfc",
    "David Lynch",
    "Liverpool",
    "https://davidlynchlfc.co.uk/",
    false,
  ],
  [
    "SamLee",
    "Sam Lee",
    "Manchester City",
    "https://www.nytimes.com/athletic/author/sam-lee/",
    false,
  ],
  [
    "Jack_Gaughan",
    "Jack Gaughan",
    "Manchester City",
    "https://www.dailymail.co.uk/profile-468/jack-gaughan.html",
    false,
  ],
  [
    "liam_twomey",
    "Liam Twomey",
    "Chelsea",
    "https://muckrack.com/liam-twomey",
    true,
  ],
  [
    "SJohnsonSport",
    "Simon Johnson",
    "Chelsea",
    "https://www.nytimes.com/athletic/author/simon-johnson/",
    false,
  ],
  [
    "charles_watts",
    "Charles Watts",
    "Arsenal",
    "https://www.charleswatts.football/",
    false,
  ],
  [
    "jamesbenge",
    "James Benge",
    "Arsenal and national football",
    "https://www.cbssports.com/writers/james-benge/",
    false,
  ],
  [
    "J_Tanswell",
    "Jacob Tanswell",
    "Aston Villa",
    "https://muckrack.com/jacob-tanswell",
    true,
  ],
  [
    "JPercyTelegraph",
    "John Percy",
    "Midlands clubs",
    "https://www.telegraph.co.uk/authors/j/jo-jz/john-percy/",
    false,
  ],
  [
    "TomBarclay_",
    "Tom Barclay",
    "London clubs",
    "https://www.thesun.co.uk/author/tom-barclay/",
    false,
  ],
  [
    "RobDorsettSky",
    "Rob Dorsett",
    "Midlands clubs",
    "https://www.skysports.com/football",
    false,
  ],
  [
    "mcgrathmike",
    "Mike McGrath",
    "transfers and national football",
    "https://www.telegraph.co.uk/authors/m/ma-me/mike-mcgrath/",
    false,
  ],
  [
    "NizaarKinsella",
    "Nizaar Kinsella",
    "Chelsea and London clubs",
    "https://www.bbc.com/sport/football",
    false,
  ],
  [
    "AlasdairGold",
    "Alasdair Gold",
    "Tottenham Hotspur",
    "https://www.football.london/authors/alasdair-gold/",
    false,
  ],
  [
    "GeorgeCaulkin",
    "George Caulkin",
    "Newcastle United",
    "https://www.nytimes.com/athletic/author/george-caulkin/",
    false,
  ],
  [
    "ChrisDHWaugh",
    "Chris Waugh",
    "Newcastle United",
    "https://www.nytimes.com/athletic/author/chris-waugh/",
    false,
  ],
  [
    "AndyNaylorBHAFC",
    "Andy Naylor",
    "Brighton",
    "https://muckrack.com/andy-naylor",
    true,
  ],
  [
    "PhilHay_",
    "Phil Hay",
    "Leeds United",
    "https://www.nytimes.com/athletic/author/phil-hay/",
    false,
  ],
  [
    "AdamLeventhal",
    "Adam Leventhal",
    "Watford and football",
    "https://www.nytimes.com/athletic/author/adam-leventhal/",
    false,
  ],
  [
    "peterrutzler",
    "Peter Rutzler",
    "London and national football",
    "https://muckrack.com/peter-rutzler",
    false,
  ],
  [
    "jackellyffc",
    "Jack Kelly",
    "Fulham",
    "https://www.fulhamsupporterstrust.com/news/2026/08/fulham-fan-media-a-directory/",
    true,
  ],
  [
    "SteveMadeley78",
    "Steve Madeley",
    "Midlands clubs",
    "https://www.nytimes.com/athletic/author/steve-madeley/",
    false,
  ],
  [
    "greggevans40",
    "Gregg Evans",
    "Aston Villa and Liverpool",
    "https://www.nytimes.com/athletic/author/gregg-evans/",
    false,
  ],
  [
    "TimSpiers",
    "Tim Spiers",
    "national football",
    "https://www.nytimes.com/athletic/author/tim-spiers/",
    false,
  ],
  [
    "markmcadamtv",
    "Mark McAdam",
    "Bournemouth and south coast",
    "https://www.skysports.com/football",
    false,
  ],
  [
    "MattWoosie",
    "Matt Woosnam",
    "Crystal Palace",
    "https://muckrack.com/matt-woosnam",
    true,
  ],
  [
    "Paddy_Boyland",
    "Patrick Boyland",
    "Everton",
    "https://muckrack.com/patrick-boyland-1",
    true,
  ],
  [
    "jaydmharris",
    "Jay Harris",
    "Tottenham Hotspur",
    "https://www.nytimes.com/athletic/author/jay-harris/",
    false,
  ],
  [
    "nottmtails",
    "Paul Taylor",
    "Nottingham Forest",
    "https://www.nytimes.com/athletic/author/paul-taylor/",
    false,
  ],
  [
    "AndyTurnerccfc",
    "Andy Turner",
    "Coventry City",
    "https://muckrack.com/andy-turner",
    true,
  ],
  [
    "bazdjcooper",
    "Barry Cooper",
    "Hull City",
    "https://muckrack.com/baz-cooper",
    true,
  ],
  [
    "Stuart_Watson",
    "Stuart Watson",
    "Ipswich Town",
    "https://muckrack.com/stuartwatson",
    true,
  ],
  [
    "Phil__Smith",
    "Phil Smith",
    "Sunderland",
    "https://muckrack.com/phil-smith",
    true,
  ],
  [
    "TomCrockerEcho",
    "Tom Crocker",
    "Bournemouth",
    "https://cherriesontop.counterpress.media/about",
    true,
  ],
  [
    "SamiMokbel81_DM",
    "Sami Mokbel",
    "national football",
    "https://www.dailymail.co.uk/profile-240/sami-mokbel.html",
    false,
  ],
];

const specialists = [
  [
    "BenDinnery",
    "Ben Dinnery",
    "availability and injuries",
    "https://www.premierinjuries.com/expert/ben-dinnery",
    true,
  ],
  [
    "PremierInjuries",
    "Premier Injuries",
    "availability and injuries",
    "https://www.premierinjuries.com/",
    true,
  ],
  [
    "physioroom",
    "PhysioRoom",
    "availability and injuries",
    "https://www.physioroom.com/",
    true,
  ],
  [
    "Teamnewsandtix",
    "Team News and Ticks",
    "team news and lineups",
    "https://x.com/Teamnewsandtix",
    true,
  ],
  [
    "fplstatus",
    "FPL Status",
    "availability and price status",
    "https://www.fplstatus.com/",
    true,
  ],
  [
    "fplstatistics",
    "FPL Statistics",
    "price changes",
    "https://www.fplstatistics.com/",
    false,
  ],
  [
    "FPLPriceChanges",
    "FPL Price Changes",
    "price changes",
    "https://x.com/FPLPriceChanges",
    false,
  ],
  [
    "FFScoutLuke",
    "FFScout Luke",
    "team news and press conferences",
    "https://www.fantasyfootballscout.co.uk/",
    false,
  ],
  [
    "Jumpthewave",
    "Jump The Wave",
    "predicted lineups",
    "https://x.com/Jumpthewave",
    false,
  ],
  [
    "FPL_Rockstar",
    "FPL Rockstar",
    "early lineups",
    "https://x.com/FPL_Rockstar",
    false,
  ],
  [
    "OddsOnFPL",
    "OddsOn FPL",
    "odds and projected availability",
    "https://x.com/OddsOnFPL",
    false,
  ],
  [
    "unitfootball",
    "Unit Football",
    "lineup and football data",
    "https://x.com/unitfootball",
    false,
  ],
  [
    "FPLAlerts",
    "FPL Alerts",
    "lineups and price changes",
    "https://x.com/FPLAlerts",
    false,
  ],
];

const creators = [
  [
    "FFScout",
    "Fantasy Football Scout",
    "FPL analysis and team news",
    "https://www.fantasyfootballscout.co.uk/",
    true,
    true,
  ],
  [
    "FantasyFootyFix",
    "Fantasy Football Fix",
    "FPL models and analysis",
    "https://www.fantasyfootballfix.com/",
    false,
    false,
  ],
  [
    "FFH_HQ",
    "Fantasy Football Hub",
    "FPL models and analysis",
    "https://www.fantasyfootballhub.co.uk/",
    false,
    false,
  ],
  [
    "LiveFPLnet",
    "LiveFPL",
    "live rank and FPL data",
    "https://www.livefpl.net/",
    true,
    true,
  ],
  [
    "fplreview",
    "FPL Review",
    "FPL projections",
    "https://fplreview.com/",
    true,
    true,
  ],
  [
    "TheFPLWire",
    "The FPL Wire",
    "FPL analysis podcast",
    "https://www.youtube.com/@TheFPLWire",
    true,
    true,
  ],
  [
    "FPLGeneral",
    "FPL General",
    "FPL analysis",
    "https://linktr.ee/fplgeneral",
    true,
    false,
  ],
  [
    "lateriser12",
    "Lateriser",
    "FPL analysis",
    "https://www.fantasyfootballscout.co.uk/author/lateriser12/",
    true,
    false,
  ],
  [
    "Pras_fpl",
    "Pras",
    "FPL analysis",
    "https://www.fantasyfootballscout.co.uk/author/pras/",
    true,
    false,
  ],
  [
    "zophar666",
    "Zophar",
    "FPL analysis",
    "https://www.fantasyfootballscout.co.uk/author/zophar/",
    false,
    false,
  ],
  [
    "BigManBakar",
    "BigManBakar",
    "FPL analysis",
    "https://www.fantasyfootballhub.co.uk/fantasy-premier-league-team-reveals",
    false,
    false,
  ],
  [
    "LetsTalk_FPL",
    "Let's Talk FPL",
    "FPL analysis",
    "https://www.youtube.com/@LetsTalkFPL",
    false,
    false,
  ],
  [
    "FPL__Raptor",
    "FPL Raptor",
    "FPL analysis and psychology",
    "https://www.fplraptor.com/",
    true,
    true,
  ],
  [
    "FPL_Harry",
    "FPL Harry",
    "FPL analysis",
    "https://www.youtube.com/@FPLHarry",
    true,
    false,
  ],
  [
    "FPLFocal",
    "FPL Focal",
    "FPL analysis and news",
    "https://www.youtube.com/@FPLFocal",
    true,
    false,
  ],
  [
    "FPLMate",
    "FPL Mate",
    "FPL analysis",
    "https://www.youtube.com/@FPLMate",
    false,
    false,
  ],
  [
    "PlanetFPLPod",
    "Planet FPL",
    "FPL and club analysis podcast",
    "https://www.planetfpl.com/",
    false,
    false,
  ],
  [
    "fplblackbox_az",
    "FPL BlackBox",
    "FPL analysis podcast",
    "https://www.youtube.com/@FPLBlackBox",
    false,
    false,
  ],
  [
    "hailcheaters",
    "Always Cheating",
    "FPL analysis podcast",
    "https://www.alwayscheating.com/",
    false,
    false,
  ],
  [
    "59thMinutePod",
    "The 59th Minute",
    "FPL analysis podcast",
    "https://x.com/59thMinutePod",
    false,
    false,
  ],
  [
    "WGTA_FPL",
    "Who Got The Assist?",
    "FPL analysis podcast",
    "https://whogottheassist.com/",
    false,
    false,
  ],
  [
    "FMLFPL",
    "FML FPL",
    "FPL analysis podcast",
    "https://www.fmlfpl.com/",
    false,
    false,
  ],
  [
    "FPLFamily",
    "FPL Family",
    "FPL analysis",
    "https://www.youtube.com/@FPLFamily",
    false,
    false,
  ],
  [
    "FPLFran",
    "FPL Fran",
    "FPL analysis",
    "https://x.com/FPLFran",
    false,
    false,
  ],
  [
    "FPLGunz",
    "FPL Gunz",
    "FPL analysis",
    "https://x.com/FPLGunz",
    false,
    false,
  ],
  [
    "FPL_Heisenberg",
    "FPL Heisenberg",
    "FPL analysis",
    "https://x.com/FPL_Heisenberg",
    false,
    false,
  ],
  [
    "FPL_Salah",
    "FPL Salah",
    "FPL analysis",
    "https://x.com/FPL_Salah",
    false,
    false,
  ],
  [
    "FPLJUiCE",
    "FPL JUiCE",
    "FPL analysis",
    "https://www.youtube.com/@FPLJUiCE",
    false,
    false,
  ],
  [
    "_FPLtips",
    "FPLtips",
    "FPL analysis",
    "https://www.youtube.com/@FPLtips",
    false,
    false,
  ],
  [
    "FPLTeam_",
    "FPL Team",
    "FPL analysis",
    "https://x.com/FPLTeam_",
    false,
    false,
  ],
  [
    "FPLBanger",
    "FPL Banger",
    "FPL analysis",
    "https://x.com/FPLBanger",
    false,
    false,
  ],
  [
    "FPLDylan7",
    "FPL Dylan",
    "FPL analysis",
    "https://x.com/FPLDylan7",
    false,
    false,
  ],
];

const accounts = [
  ...official.map(
    ([handle, displayName, category, coverage, evidenceUrl, shortlist]) => ({
      handle,
      displayName,
      category,
      coverage,
      evidenceUrl,
      shortlist,
      pilot: ["PremierLeague", "OfficialFPL", "PLComms"].includes(handle),
    }),
  ),
  ...reporters.map(
    ([handle, displayName, coverage, evidenceUrl, shortlist]) => ({
      handle,
      displayName,
      category: "reporter",
      coverage,
      evidenceUrl,
      shortlist,
      pilot: handle === "David_Ornstein",
    }),
  ),
  ...specialists.map(
    ([handle, displayName, coverage, evidenceUrl, shortlist]) => ({
      handle,
      displayName,
      category: "availability_specialist",
      coverage,
      evidenceUrl,
      shortlist,
      pilot: handle === "BenDinnery",
    }),
  ),
  ...creators.map(
    ([handle, displayName, coverage, evidenceUrl, shortlist, pilot]) => ({
      handle,
      displayName,
      category: "fpl_creator",
      coverage,
      evidenceUrl,
      shortlist,
      pilot,
    }),
  ),
];

if (accounts.length < 100) {
  throw new Error(`Candidate universe too small: ${accounts.length}`);
}

const relevancePatterns = {
  availability:
    /\b(injur(?:y|ed|ies)|fitness|fit again|illness|doubt(?:ful)?|ruled out|unavailable|suspend(?:ed|sion)|return(?:ed|ing)?|training|trained|press conference|team news)\b/i,
  lineup:
    /\b(line-?up|starting (?:xi|eleven)|starts|benched?|rested|rotation|squad|team sheet)\b/i,
  transfer: /\b(transfer|sign(?:ed|ing|s)?|loan|deal|medical|contract|bid)\b/i,
  fpl: /\b(fpl|fantasy premier league|price (?:rise|fall|change)|ownership|captain(?:cy)?|wildcard|free hit|bench boost|triple captain|expected points|xg|xa|xgi)\b/i,
  suspension: /\b(red card|yellow card|ban(?:ned)?|suspension|suspended)\b/i,
};

const correctionPattern =
  /\b(correction|corrected|clarif(?:y|ication)|update:|previously|apolog(?:y|ise|ize)|retract)\b/i;

function decodeJsonString(value) {
  try {
    return JSON.parse(value);
  } catch {
    return "";
  }
}

function snowflakeDate(id) {
  try {
    const milliseconds = (BigInt(id) >> 22n) + 1288834974657n;
    const date = new Date(Number(milliseconds));
    return Number.isNaN(date.valueOf()) ? null : date;
  } catch {
    return null;
  }
}

function extractUserId(html, handle) {
  const normalized = html.replaceAll('\\"', '"');
  const candidates = [
    ...normalized.matchAll(
      /"id_str"\s*:\s*"(\d+)"(?:(?!"id_str").){0,1800}?"screen_name"\s*:\s*"([^"]+)"/gis,
    ),
  ];
  const match = candidates.find(
    (candidate) => candidate[2].toLowerCase() === handle.toLowerCase(),
  );
  return match?.[1] ?? "";
}

function extractObservations(html, handle) {
  const normalized = html.replaceAll('\\"', '"');
  const observations = [];
  const seen = new Set();
  const matches = normalized.matchAll(/"full_text"\s*:\s*("(?:\\.|[^"\\])*")/g);

  for (const match of matches) {
    const context = normalized.slice(
      Math.max(0, match.index - 7000),
      match.index,
    );
    const ids = [...context.matchAll(/"id_str"\s*:\s*"(\d{15,22})"/g)];
    const id = ids.at(-1)?.[1];
    if (!id || seen.has(id)) continue;

    const timestamp = snowflakeDate(id);
    if (!timestamp || timestamp > new Date(`${RESEARCH_DATE}T23:59:59Z`))
      continue;
    const ageDays =
      (new Date(`${RESEARCH_DATE}T23:59:59Z`) - timestamp) / 86_400_000;
    if (ageDays > WINDOW_DAYS) continue;

    const text = decodeJsonString(match[1]);
    if (!text) continue;
    const signalTypes = Object.entries(relevancePatterns)
      .filter(([, pattern]) => pattern.test(text))
      .map(([signalType]) => signalType);

    seen.add(id);
    observations.push({
      id,
      timestamp,
      url: `https://x.com/${handle}/status/${id}`,
      isRelevant: signalTypes.length > 0,
      signalTypes,
      isRepost: /^RT\s+@/i.test(text),
      hasSourceLink: /https?:\/\/t\.co\//i.test(text),
      hasCorrectionLanguage: correctionPattern.test(text),
    });
  }

  return observations
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 25);
}

async function inspectAccount(account) {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account.handle}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "FPL-Intelligence-Research/1.0 (+internal metadata study)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return {
        ...account,
        userId: "",
        accessStatus: `http_${response.status}`,
        observations: [],
      };
    }
    const html = await response.text();
    const result = {
      ...account,
      userId: extractUserId(html, account.handle),
      accessStatus: "observed",
      observations: extractObservations(html, account.handle),
    };
    return result;
  } catch (error) {
    return {
      ...account,
      userId: "",
      accessStatus: `error_${error instanceof Error ? error.name : "unknown"}`,
      observations: [],
    };
  }
}

async function lookupWikidataUserIds() {
  const values = accounts
    .map((account) => `"${account.handle.replaceAll('"', '\\"')}"`)
    .join(" ");
  const query = `SELECT ?handle ?xUserId WHERE {
    VALUES ?handle { ${values} }
    ?item p:P2002 ?statement.
    ?statement ps:P2002 ?handle;
      pq:P6552 ?xUserId.
  }`;
  const endpoint = new URL("https://query.wikidata.org/sparql");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("format", "json");

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent":
          "FPL-Intelligence-Research/1.0 (internal source identity study)",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return new Map();
    const result = await response.json();
    return new Map(
      result.results.bindings.map((binding) => [
        binding.handle.value.toLowerCase(),
        binding.xUserId.value,
      ]),
    );
  } catch {
    return new Map();
  }
}

async function readMetadataCache() {
  try {
    const cache = JSON.parse(await readFile(CACHE_PATH, "utf8"));
    return new Map(
      cache.accounts.map((account) => [
        account.handle.toLowerCase(),
        {
          ...account,
          observations: account.observations.map((observation) => ({
            ...observation,
            timestamp: new Date(observation.timestamp),
          })),
        },
      ]),
    );
  } catch {
    return new Map();
  }
}

function score(account) {
  const observations = account.observations;
  const relevant = observations.filter((item) => item.isRelevant);
  const officialAccount = account.category.includes("official");
  const relevanceBase =
    account.category === "availability_specialist"
      ? 20
      : account.category === "fpl_creator"
        ? 18
        : account.category === "reporter"
          ? 17
          : officialAccount
            ? 18
            : 14;
  const relevance =
    observations.length === 0
      ? 0
      : Math.min(
          20,
          Math.round(
            relevanceBase *
              (0.65 + 0.35 * (relevant.length / observations.length)),
          ),
        );
  const historicalVerifiability = officialAccount ? 20 : 0;
  const timeliness =
    observations.length >= 20
      ? 10
      : observations.length >= 10
        ? 7
        : observations.length > 0
          ? 4
          : 0;
  const directness = officialAccount
    ? 15
    : account.category === "reporter"
      ? 10
      : account.category === "availability_specialist"
        ? 7
        : account.category === "fpl_creator"
          ? 5
          : 6;
  const uniqueness = officialAccount
    ? 8
    : account.category === "reporter"
      ? 8
      : account.category === "availability_specialist"
        ? 7
        : account.category === "fpl_creator"
          ? 6
          : 4;
  const consistency =
    observations.length >= 20
      ? 8
      : observations.length >= 10
        ? 6
        : observations.length > 0
          ? 3
          : 0;
  const correctionTransparency = observations.some(
    (item) => item.hasCorrectionLanguage,
  )
    ? 3
    : 0;
  const signalToNoise =
    observations.length === 0
      ? 0
      : Math.min(5, Math.round(5 * (relevant.length / observations.length)));
  const total =
    relevance +
    historicalVerifiability +
    timeliness +
    directness +
    uniqueness +
    consistency +
    correctionTransparency +
    signalToNoise;
  return {
    relevance,
    historicalVerifiability,
    timeliness,
    directness,
    uniqueness,
    consistency,
    correctionTransparency,
    signalToNoise,
    total,
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows, columns) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

function rowFor(account) {
  const sample = account.observations;
  const relevant = sample.filter((item) => item.isRelevant);
  const signalTypes = [
    ...new Set(relevant.flatMap((item) => item.signalTypes)),
  ].sort();
  const scores = score(account);
  const latest = sample[0]?.timestamp.toISOString().slice(0, 10) ?? "";
  const earliest = sample.at(-1)?.timestamp.toISOString().slice(0, 10) ?? "";
  const evidenceSufficiency = account.category.includes("official")
    ? sample.length >= 20
      ? "sufficient_for_official-source-role; not a reuse-rights finding"
      : "limited_public_sample"
    : "insufficient_evidence: no five-claim independent accuracy review";
  const limitations = [
    sample.length < 20
      ? `only ${sample.length} public items observed; fewer than 20 relevant items available in the endpoint sample`
      : "endpoint sample capped at 25 items",
    "no deletion history",
    "no relative publication-latency benchmark",
    account.category.includes("official")
      ? "official status does not grant reuse rights"
      : "historical accuracy component held at zero pending claim verification",
  ].join("; ");
  const primaryAssessment = account.category.includes("official")
    ? "primary official account"
    : account.category === "reporter"
      ? "potential original reporter; attribution chain requires item-level review"
      : account.category === "availability_specialist"
        ? "specialist synthesis; likely correlated with press conferences and club sources"
        : "analysis/creator; not a primary factual source";

  return {
    research_date: RESEARCH_DATE,
    x_user_id: account.userId,
    handle: account.handle,
    display_name: account.displayName,
    account_url: `https://x.com/${account.handle}`,
    identity_affiliation_evidence_url: account.evidenceUrl,
    source_category: account.category,
    club_context_coverage: account.coverage,
    observed_signal_types: signalTypes.join("|"),
    sample_window_start: earliest,
    sample_window_end: latest,
    sample_items_inspected: sample.length,
    relevant_items: relevant.length,
    original_items: sample.filter((item) => !item.isRepost).length,
    repost_items: sample.filter((item) => item.isRepost).length,
    source_link_items: sample.filter((item) => item.hasSourceLink).length,
    correction_language_items: sample.filter(
      (item) => item.hasCorrectionLanguage,
    ).length,
    sample_post_urls: relevant
      .slice(0, 20)
      .map((item) => item.url)
      .join("|"),
    verified_claims: account.category.includes("official")
      ? "not_applicable_official_source"
      : 0,
    evidence_sufficiency: evidenceSufficiency,
    identity_status: account.userId
      ? `resolved_from_${account.identitySource}`
      : "needs_identity_review",
    activity_status:
      latest &&
      new Date(`${latest}T00:00:00Z`) >= new Date("2026-07-12T00:00:00Z")
        ? "active_in_observed_sample"
        : sample.length
          ? "no_recent_item_in_45_days"
          : "unresolved",
    primary_vs_aggregator: primaryAssessment,
    relevance_score_20: scores.relevance,
    historical_verifiability_score_20: scores.historicalVerifiability,
    timeliness_score_15: scores.timeliness,
    directness_score_15: scores.directness,
    uniqueness_score_10: scores.uniqueness,
    consistency_score_10: scores.consistency,
    correction_transparency_score_5: scores.correctionTransparency,
    signal_to_noise_score_5: scores.signalToNoise,
    conservative_total_score_100: scores.total,
    research_access_method:
      sample.length > 0
        ? `${account.identitySource}; ${X_ACCESS_METHOD}`
        : `${account.identitySource}; affiliation public-web research; X sample ${account.accessStatus}`,
    access_result: account.accessStatus,
    policy_status: POLICY_STATUS,
    research_eligibility: account.userId
      ? "eligible_for_research"
      : "needs_identity_review",
    shortlist: account.shortlist ? "yes" : "no",
    pilot_recommendation: account.pilot ? "candidate_for_FPL-80_review" : "no",
    runtime_review_status: "not_reviewed; disabled",
    rationale: account.shortlist
      ? `Selected for coverage-constrained shortlist: ${account.coverage}`
      : `Candidate retained for comparison: ${account.coverage}`,
    limitations,
    re_review_trigger:
      "handle/affiliation change; inactivity; terms/access change; pilot scope change; material correction or reliability evidence",
  };
}

const columns = [
  "research_date",
  "x_user_id",
  "handle",
  "display_name",
  "account_url",
  "identity_affiliation_evidence_url",
  "source_category",
  "club_context_coverage",
  "observed_signal_types",
  "sample_window_start",
  "sample_window_end",
  "sample_items_inspected",
  "relevant_items",
  "original_items",
  "repost_items",
  "source_link_items",
  "correction_language_items",
  "sample_post_urls",
  "verified_claims",
  "evidence_sufficiency",
  "identity_status",
  "activity_status",
  "primary_vs_aggregator",
  "relevance_score_20",
  "historical_verifiability_score_20",
  "timeliness_score_15",
  "directness_score_15",
  "uniqueness_score_10",
  "consistency_score_10",
  "correction_transparency_score_5",
  "signal_to_noise_score_5",
  "conservative_total_score_100",
  "research_access_method",
  "access_result",
  "policy_status",
  "research_eligibility",
  "shortlist",
  "pilot_recommendation",
  "runtime_review_status",
  "rationale",
  "limitations",
  "re_review_trigger",
];

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
const metadataCache = await readMetadataCache();
const wikidataIds = OFFLINE ? new Map() : await lookupWikidataUserIds();
const results = [];
let xRateLimited = SKIP_X;
for (const [index, account] of accounts.entries()) {
  const cached = metadataCache.get(account.handle.toLowerCase());
  const wikidataId = wikidataIds.get(account.handle.toLowerCase()) ?? "";
  const validatedOverrideId =
    VALIDATED_ID_OVERRIDES.get(account.handle.toLowerCase()) ?? "";
  const cachedComplete =
    cached?.accessStatus === "observed" && cached.observations.length > 0;
  const observed = cachedComplete
    ? { ...account, ...cached }
    : xRateLimited
      ? {
          ...account,
          userId: "",
          accessStatus: SKIP_X
            ? "not_attempted_skip_x"
            : "not_attempted_after_rate_limit",
          observations: [],
        }
      : await inspectAccount(account);
  if (observed.accessStatus === "http_429") xRateLimited = true;
  results.push({
    ...observed,
    userId:
      observed.userId || cached?.userId || wikidataId || validatedOverrideId,
    identitySource: observed.userId
      ? "public_x_profile_metadata"
      : cached?.userId
        ? cached.identitySource
        : wikidataId
          ? "wikidata_P2002_with_P6552_qualifier"
          : validatedOverrideId
            ? "public_x_profile_metadata_recorded_2026-08-26"
            : "unresolved",
    observations:
      observed.observations.length > 0
        ? observed.observations
        : (cached?.observations ?? []),
  });
  if (!SKIP_X && index < accounts.length - 1)
    await new Promise((resolve) => setTimeout(resolve, 2_000));
}

const rows = results.map(rowFor);
const shortlistRows = rows.filter((row) => row.shortlist === "yes");
const pilotRows = rows.filter((row) => row.pilot_recommendation !== "no");

if (shortlistRows.length !== 50)
  throw new Error(
    `Expected 50 shortlisted accounts, received ${shortlistRows.length}`,
  );
if (pilotRows.length > 10)
  throw new Error(
    `Pilot recommendation exceeds 10 accounts: ${pilotRows.length}`,
  );

await writeFile(
  CACHE_PATH,
  `${JSON.stringify(
    {
      researchDate: RESEARCH_DATE,
      dataPolicy: "content-free metadata only; no raw post bodies",
      collectionRuns: [
        {
          date: RESEARCH_DATE,
          accessMethod: X_ACCESS_METHOD,
          result: "http_429",
          action: "stopped_without_retry_or_fallback",
          retainedRawContent: false,
        },
      ],
      accounts: results.map((account) => ({
        handle: account.handle,
        userId: account.userId,
        identitySource: account.identitySource,
        accessStatus: account.accessStatus,
        observations: account.observations.map((observation) => ({
          ...observation,
          timestamp: observation.timestamp.toISOString(),
        })),
      })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await writeFile(
  path.join(OUTPUT_DIRECTORY, "x-account-candidates.csv"),
  csv(rows, columns),
  "utf8",
);
await writeFile(
  path.join(OUTPUT_DIRECTORY, "x-account-shortlist.csv"),
  csv(shortlistRows, columns),
  "utf8",
);

const unresolved = rows
  .filter((row) => !row.x_user_id)
  .map((row) => row.handle);
const shortlistUnresolved = shortlistRows
  .filter((row) => !row.x_user_id)
  .map((row) => row.handle);
process.stdout.write(
  JSON.stringify(
    {
      candidates: rows.length,
      identityResolved: rows.length - unresolved.length,
      shortlist: shortlistRows.length,
      shortlistIdentityResolved:
        shortlistRows.length - shortlistUnresolved.length,
      pilot: pilotRows.length,
      unresolved,
      shortlistUnresolved,
    },
    null,
    2,
  ) + "\n",
);
