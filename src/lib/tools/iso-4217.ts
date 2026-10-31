import type { Locale } from '../../i18n/locales';

export interface Currency {
  code: string;
  numeric: string;
  minor: number | null;
  name: { en: string; es: string };
  countries: string[];
}

type Row = [string, string, number | null, string, string, string];

const ROWS: Row[] = [
  ['AED', '784', 2, 'UAE Dirham', 'Dírham de los Emiratos Árabes', 'AE'],
  ['AFN', '971', 2, 'Afghani', 'Afgani', 'AF'],
  ['ALL', '008', 2, 'Lek', 'Lek', 'AL'],
  ['AMD', '051', 2, 'Armenian Dram', 'Dram armenio', 'AM'],
  ['AOA', '973', 2, 'Kwanza', 'Kuanza', 'AO'],
  ['ARS', '032', 2, 'Argentine Peso', 'Peso argentino', 'AR'],
  ['AUD', '036', 2, 'Australian Dollar', 'Dólar australiano', 'AU CC CX HM KI NF NR TV'],
  ['AWG', '533', 2, 'Aruban Florin', 'Florín arubeño', 'AW'],
  ['AZN', '944', 2, 'Azerbaijan Manat', 'Manat azerí', 'AZ'],
  ['BAM', '977', 2, 'Convertible Mark', 'Marco convertible', 'BA'],
  ['BBD', '052', 2, 'Barbados Dollar', 'Dólar de Barbados', 'BB'],
  ['BDT', '050', 2, 'Taka', 'Taka', 'BD'],
  ['BHD', '048', 3, 'Bahraini Dinar', 'Dinar bareiní', 'BH'],
  ['BIF', '108', 0, 'Burundi Franc', 'Franco de Burundi', 'BI'],
  ['BMD', '060', 2, 'Bermudian Dollar', 'Dólar de Bermudas', 'BM'],
  ['BND', '096', 2, 'Brunei Dollar', 'Dólar de Brunéi', 'BN'],
  ['BOB', '068', 2, 'Boliviano', 'Boliviano', 'BO'],
  ['BOV', '984', 2, 'Mvdol', 'Mvdol', 'BO'],
  ['BRL', '986', 2, 'Brazilian Real', 'Real brasileño', 'BR'],
  ['BSD', '044', 2, 'Bahamian Dollar', 'Dólar bahameño', 'BS'],
  ['BTN', '064', 2, 'Ngultrum', 'Ngultrum', 'BT'],
  ['BWP', '072', 2, 'Pula', 'Pula', 'BW'],
  ['BYN', '933', 2, 'Belarusian Ruble', 'Rublo bielorruso', 'BY'],
  ['BZD', '084', 2, 'Belize Dollar', 'Dólar de Belice', 'BZ'],
  ['CAD', '124', 2, 'Canadian Dollar', 'Dólar canadiense', 'CA'],
  ['CDF', '976', 2, 'Congolese Franc', 'Franco congoleño', 'CD'],
  ['CHE', '947', 2, 'WIR Euro', 'Euro WIR', 'CH'],
  ['CHF', '756', 2, 'Swiss Franc', 'Franco suizo', 'CH LI'],
  ['CHW', '948', 2, 'WIR Franc', 'Franco WIR', 'CH'],
  ['CLF', '990', 4, 'Unidad de Fomento', 'Unidad de Fomento', 'CL'],
  ['CLP', '152', 0, 'Chilean Peso', 'Peso chileno', 'CL'],
  ['CNY', '156', 2, 'Yuan Renminbi', 'Yuan renminbi', 'CN'],
  ['COP', '170', 2, 'Colombian Peso', 'Peso colombiano', 'CO'],
  ['COU', '970', 2, 'Unidad de Valor Real', 'Unidad de Valor Real', 'CO'],
  ['CRC', '188', 2, 'Costa Rican Colon', 'Colón costarricense', 'CR'],
  ['CUP', '192', 2, 'Cuban Peso', 'Peso cubano', 'CU'],
  ['CVE', '132', 2, 'Cabo Verde Escudo', 'Escudo caboverdiano', 'CV'],
  ['CZK', '203', 2, 'Czech Koruna', 'Corona checa', 'CZ'],
  ['DJF', '262', 0, 'Djibouti Franc', 'Franco yibutiano', 'DJ'],
  ['DKK', '208', 2, 'Danish Krone', 'Corona danesa', 'DK FO GL'],
  ['DOP', '214', 2, 'Dominican Peso', 'Peso dominicano', 'DO'],
  ['DZD', '012', 2, 'Algerian Dinar', 'Dinar argelino', 'DZ'],
  ['EGP', '818', 2, 'Egyptian Pound', 'Libra egipcia', 'EG'],
  ['ERN', '232', 2, 'Nakfa', 'Nakfa', 'ER'],
  ['ETB', '230', 2, 'Ethiopian Birr', 'Birr etíope', 'ET'],
  [
    'EUR',
    '978',
    2,
    'Euro',
    'Euro',
    'AD AT AX BE BG BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM TF VA YT',
  ],
  ['FJD', '242', 2, 'Fiji Dollar', 'Dólar fiyiano', 'FJ'],
  ['FKP', '238', 2, 'Falkland Islands Pound', 'Libra malvinense', 'FK'],
  ['GBP', '826', 2, 'Pound Sterling', 'Libra esterlina', 'GB GG IM JE'],
  ['GEL', '981', 2, 'Lari', 'Lari', 'GE'],
  ['GHS', '936', 2, 'Ghana Cedi', 'Cedi ghanés', 'GH'],
  ['GIP', '292', 2, 'Gibraltar Pound', 'Libra gibraltareña', 'GI'],
  ['GMD', '270', 2, 'Dalasi', 'Dalasi', 'GM'],
  ['GNF', '324', 0, 'Guinean Franc', 'Franco guineano', 'GN'],
  ['GTQ', '320', 2, 'Quetzal', 'Quetzal', 'GT'],
  ['GYD', '328', 2, 'Guyana Dollar', 'Dólar guyanés', 'GY'],
  ['HKD', '344', 2, 'Hong Kong Dollar', 'Dólar de Hong Kong', 'HK'],
  ['HNL', '340', 2, 'Lempira', 'Lempira', 'HN'],
  ['HTG', '332', 2, 'Gourde', 'Gourde', 'HT'],
  ['HUF', '348', 2, 'Forint', 'Forinto', 'HU'],
  ['IDR', '360', 2, 'Rupiah', 'Rupia indonesia', 'ID'],
  ['ILS', '376', 2, 'New Israeli Sheqel', 'Nuevo séquel israelí', 'IL'],
  ['INR', '356', 2, 'Indian Rupee', 'Rupia india', 'BT IN'],
  ['IQD', '368', 3, 'Iraqi Dinar', 'Dinar iraquí', 'IQ'],
  ['IRR', '364', 2, 'Iranian Rial', 'Rial iraní', 'IR'],
  ['ISK', '352', 0, 'Iceland Krona', 'Corona islandesa', 'IS'],
  ['JMD', '388', 2, 'Jamaican Dollar', 'Dólar jamaiquino', 'JM'],
  ['JOD', '400', 3, 'Jordanian Dinar', 'Dinar jordano', 'JO'],
  ['JPY', '392', 0, 'Yen', 'Yen', 'JP'],
  ['KES', '404', 2, 'Kenyan Shilling', 'Chelín keniano', 'KE'],
  ['KGS', '417', 2, 'Som', 'Som', 'KG'],
  ['KHR', '116', 2, 'Riel', 'Riel', 'KH'],
  ['KMF', '174', 0, 'Comorian Franc', 'Franco comorense', 'KM'],
  ['KPW', '408', 2, 'North Korean Won', 'Won norcoreano', 'KP'],
  ['KRW', '410', 0, 'Won', 'Won surcoreano', 'KR'],
  ['KWD', '414', 3, 'Kuwaiti Dinar', 'Dinar kuwaití', 'KW'],
  ['KYD', '136', 2, 'Cayman Islands Dollar', 'Dólar de las Islas Caimán', 'KY'],
  ['KZT', '398', 2, 'Tenge', 'Tenge', 'KZ'],
  ['LAK', '418', 2, 'Lao Kip', 'Kip', 'LA'],
  ['LBP', '422', 2, 'Lebanese Pound', 'Libra libanesa', 'LB'],
  ['LKR', '144', 2, 'Sri Lanka Rupee', 'Rupia de Sri Lanka', 'LK'],
  ['LRD', '430', 2, 'Liberian Dollar', 'Dólar liberiano', 'LR'],
  ['LSL', '426', 2, 'Loti', 'Loti', 'LS'],
  ['LYD', '434', 3, 'Libyan Dinar', 'Dinar libio', 'LY'],
  ['MAD', '504', 2, 'Moroccan Dirham', 'Dírham marroquí', 'EH MA'],
  ['MDL', '498', 2, 'Moldovan Leu', 'Leu moldavo', 'MD'],
  ['MGA', '969', 2, 'Malagasy Ariary', 'Ariary malgache', 'MG'],
  ['MKD', '807', 2, 'Denar', 'Denar', 'MK'],
  ['MMK', '104', 2, 'Kyat', 'Kyat', 'MM'],
  ['MNT', '496', 2, 'Tugrik', 'Tugrik', 'MN'],
  ['MOP', '446', 2, 'Pataca', 'Pataca', 'MO'],
  ['MRU', '929', 2, 'Ouguiya', 'Uguiya', 'MR'],
  ['MUR', '480', 2, 'Mauritius Rupee', 'Rupia de Mauricio', 'MU'],
  ['MVR', '462', 2, 'Rufiyaa', 'Rufiya', 'MV'],
  ['MWK', '454', 2, 'Malawi Kwacha', 'Kwacha malauí', 'MW'],
  ['MXN', '484', 2, 'Mexican Peso', 'Peso mexicano', 'MX'],
  ['MXV', '979', 2, 'Mexican Unidad de Inversion (UDI)', 'Unidad de Inversión (UDI)', 'MX'],
  ['MYR', '458', 2, 'Malaysian Ringgit', 'Ringgit malayo', 'MY'],
  ['MZN', '943', 2, 'Mozambique Metical', 'Metical mozambiqueño', 'MZ'],
  ['NAD', '516', 2, 'Namibia Dollar', 'Dólar namibio', 'NA'],
  ['NGN', '566', 2, 'Naira', 'Naira', 'NG'],
  ['NIO', '558', 2, 'Cordoba Oro', 'Córdoba oro', 'NI'],
  ['NOK', '578', 2, 'Norwegian Krone', 'Corona noruega', 'BV NO SJ'],
  ['NPR', '524', 2, 'Nepalese Rupee', 'Rupia nepalí', 'NP'],
  ['NZD', '554', 2, 'New Zealand Dollar', 'Dólar neozelandés', 'CK NU NZ PN TK'],
  ['OMR', '512', 3, 'Rial Omani', 'Rial omaní', 'OM'],
  ['PAB', '590', 2, 'Balboa', 'Balboa', 'PA'],
  ['PEN', '604', 2, 'Sol', 'Sol', 'PE'],
  ['PGK', '598', 2, 'Kina', 'Kina', 'PG'],
  ['PHP', '608', 2, 'Philippine Peso', 'Peso filipino', 'PH'],
  ['PKR', '586', 2, 'Pakistan Rupee', 'Rupia pakistaní', 'PK'],
  ['PLN', '985', 2, 'Zloty', 'Esloti', 'PL'],
  ['PYG', '600', 0, 'Guarani', 'Guaraní', 'PY'],
  ['QAR', '634', 2, 'Qatari Rial', 'Rial catarí', 'QA'],
  ['RON', '946', 2, 'Romanian Leu', 'Leu rumano', 'RO'],
  ['RSD', '941', 2, 'Serbian Dinar', 'Dinar serbio', 'RS'],
  ['RUB', '643', 2, 'Russian Ruble', 'Rublo ruso', 'RU'],
  ['RWF', '646', 0, 'Rwanda Franc', 'Franco ruandés', 'RW'],
  ['SAR', '682', 2, 'Saudi Riyal', 'Riyal saudí', 'SA'],
  ['SBD', '090', 2, 'Solomon Islands Dollar', 'Dólar de las Islas Salomón', 'SB'],
  ['SCR', '690', 2, 'Seychelles Rupee', 'Rupia de Seychelles', 'SC'],
  ['SDG', '938', 2, 'Sudanese Pound', 'Libra sudanesa', 'SD'],
  ['SEK', '752', 2, 'Swedish Krona', 'Corona sueca', 'SE'],
  ['SGD', '702', 2, 'Singapore Dollar', 'Dólar de Singapur', 'SG'],
  ['SHP', '654', 2, 'Saint Helena Pound', 'Libra de Santa Elena', 'SH'],
  ['SLE', '925', 2, 'Leone', 'Leona', 'SL'],
  ['SOS', '706', 2, 'Somali Shilling', 'Chelín somalí', 'SO'],
  ['SRD', '968', 2, 'Surinam Dollar', 'Dólar surinamés', 'SR'],
  ['SSP', '728', 2, 'South Sudanese Pound', 'Libra sursudanesa', 'SS'],
  ['STN', '930', 2, 'Dobra', 'Dobra', 'ST'],
  ['SVC', '222', 2, 'El Salvador Colon', 'Colón salvadoreño', 'SV'],
  ['SYP', '760', 2, 'Syrian Pound', 'Libra siria', 'SY'],
  ['SZL', '748', 2, 'Lilangeni', 'Lilangeni', 'SZ'],
  ['THB', '764', 2, 'Baht', 'Baht', 'TH'],
  ['TJS', '972', 2, 'Somoni', 'Somoni', 'TJ'],
  ['TMT', '934', 2, 'Turkmenistan New Manat', 'Nuevo manat turcomano', 'TM'],
  ['TND', '788', 3, 'Tunisian Dinar', 'Dinar tunecino', 'TN'],
  ['TOP', '776', 2, 'Pa’anga', 'Paanga', 'TO'],
  ['TRY', '949', 2, 'Turkish Lira', 'Lira turca', 'TR'],
  ['TTD', '780', 2, 'Trinidad and Tobago Dollar', 'Dólar de Trinidad y Tobago', 'TT'],
  ['TWD', '901', 2, 'New Taiwan Dollar', 'Nuevo dólar taiwanés', 'TW'],
  ['TZS', '834', 2, 'Tanzanian Shilling', 'Chelín tanzano', 'TZ'],
  ['UAH', '980', 2, 'Hryvnia', 'Grivna', 'UA'],
  ['UGX', '800', 0, 'Uganda Shilling', 'Chelín ugandés', 'UG'],
  [
    'USD',
    '840',
    2,
    'US Dollar',
    'Dólar estadounidense',
    'AS BQ EC FM GU IO MH MP PA PR PW TC TL UM US VG VI',
  ],
  ['USN', '997', 2, 'US Dollar (Next day)', 'Dólar estadounidense (día siguiente)', 'US'],
  ['UYI', '940', 0, 'Uruguay Peso en Unidades Indexadas', 'Peso uruguayo en UI', 'UY'],
  ['UYU', '858', 2, 'Peso Uruguayo', 'Peso uruguayo', 'UY'],
  ['UYW', '927', 4, 'Unidad Previsional', 'Unidad Previsional', 'UY'],
  ['UZS', '860', 2, 'Uzbekistan Sum', 'Som uzbeko', 'UZ'],
  ['VED', '926', 2, 'Bolívar Soberano (digital)', 'Bolívar soberano (digital)', 'VE'],
  ['VES', '928', 2, 'Bolívar Soberano', 'Bolívar soberano', 'VE'],
  ['VND', '704', 0, 'Dong', 'Dong', 'VN'],
  ['VUV', '548', 0, 'Vatu', 'Vatu', 'VU'],
  ['WST', '882', 2, 'Tala', 'Tala', 'WS'],
  ['XAF', '950', 0, 'CFA Franc BEAC', 'Franco CFA BEAC', 'CF CG CM GA GQ TD'],
  ['XAG', '961', null, 'Silver', 'Plata', ''],
  ['XAU', '959', null, 'Gold', 'Oro', ''],
  ['XBA', '955', null, 'EURCO bond unit', 'Unidad de bonos EURCO', ''],
  ['XBB', '956', null, 'E.M.U.-6 bond unit', 'Unidad de bonos UEM-6', ''],
  ['XBC', '957', null, 'E.U.A.-9 bond unit', 'Unidad de cuenta UE-9', ''],
  ['XBD', '958', null, 'E.U.A.-17 bond unit', 'Unidad de cuenta UE-17', ''],
  [
    'XCD',
    '951',
    2,
    'East Caribbean Dollar',
    'Dólar del Caribe Oriental',
    'AG AI DM GD KN LC MS VC',
  ],
  ['XCG', '532', 2, 'Caribbean Guilder', 'Florín caribeño', 'CW SX'],
  ['XDR', '960', null, 'SDR (Special Drawing Right)', 'DEG (Derecho Especial de Giro)', ''],
  ['XOF', '952', 0, 'CFA Franc BCEAO', 'Franco CFA BCEAO', 'BF BJ CI GW ML NE SN TG'],
  ['XPD', '964', null, 'Palladium', 'Paladio', ''],
  ['XPF', '953', 0, 'CFP Franc', 'Franco CFP', 'NC PF WF'],
  ['XPT', '962', null, 'Platinum', 'Platino', ''],
  ['XSU', '994', null, 'Sucre', 'Sucre', ''],
  ['XTS', '963', null, 'Testing code', 'Código de prueba', ''],
  ['XUA', '965', null, 'ADB Unit of Account', 'Unidad de cuenta del BAD', ''],
  ['XXX', '999', null, 'No currency', 'Sin moneda', ''],
  ['YER', '886', 2, 'Yemeni Rial', 'Rial yemení', 'YE'],
  ['ZAR', '710', 2, 'Rand', 'Rand', 'LS NA ZA'],
  ['ZMW', '967', 2, 'Zambian Kwacha', 'Kwacha zambiano', 'ZM'],
  ['ZWG', '924', 2, 'Zimbabwe Gold', 'Oro de Zimbabue', 'ZW'],
];

export const currencies: readonly Currency[] = ROWS.map(([code, numeric, minor, en, es, list]) => ({
  code,
  numeric,
  minor,
  name: { en, es },
  countries: list === '' ? [] : list.split(' '),
}));

const byCode = new Map(currencies.map((currency) => [currency.code, currency]));

export const minorCurrencies: readonly Currency[] = currencies.filter(
  (currency) => currency.minor !== null,
);

export function findCurrency(code: string): Currency | undefined {
  return byCode.get(code.trim().toUpperCase());
}

export function currencyOptions(
  locale: Locale,
  list: readonly Currency[] = minorCurrencies,
): { value: string; label: string }[] {
  return list.map(({ code, name }) => ({ value: code, label: `${code} · ${name[locale]}` }));
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export type CountryName = (code: string) => string;

export function searchCurrencies(
  query: string,
  countryName: CountryName = (code) => code,
): Currency[] {
  const needle = fold(query.trim());
  if (needle === '') return [...currencies];
  const scored = currencies.flatMap((currency) => {
    const code = currency.code.toLowerCase();
    if (code === needle || currency.numeric === needle) return [{ currency, rank: 0 }];
    if (currency.countries.some((country) => country.toLowerCase() === needle)) {
      return [{ currency, rank: 1 }];
    }
    const haystack = fold(
      [
        currency.code,
        currency.name.en,
        currency.name.es,
        ...currency.countries.map(countryName),
      ].join(' '),
    );
    return haystack.includes(needle) ? [{ currency, rank: 2 }] : [];
  });
  return scored.sort((a, b) => a.rank - b.rank).map(({ currency }) => currency);
}
